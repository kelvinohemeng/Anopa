// src/utils/syncProducts.ts
import {
  framer,
  type ManagedCollection,
  type ManagedCollectionField,
  type ManagedCollectionFieldInput,
  type ManagedCollectionItemInput,
} from "framer-plugin";
import { getProducts } from "./fetchShopifyData";
import { mapShopifyToCollectionItems } from "../modes/SyncMode";
import {
  clearStoreConfig,
  hasStoreCredentials,
  isStoreConfig,
  readStoreConfig,
  saveStoreConfig,
  type StoreConfig,
} from "../config/storeConfig";

function containsImage(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsImage);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "image" || Object.values(record).some(containsImage);
}

function stripImages(value: unknown): unknown {
  if (Array.isArray(value)) {
    const stripped = value
      .map(stripImages)
      .filter((entry) => entry !== undefined);
    return stripped.length > 0 ? stripped : undefined;
  }

  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (record.type === "image") return undefined;
  if (record.type === "array" && containsImage(record.value)) return undefined;

  const stripped = Object.fromEntries(
    Object.entries(record)
      .map(([key, entry]) => [key, stripImages(entry)] as const)
      .filter(([, entry]) => entry !== undefined),
  );

  if (Object.keys(stripped).length === 0) return undefined;
  if (record.type === "array" && !("value" in stripped)) return undefined;
  return stripped;
}

type ManagedCollectionSyncTarget = Pick<
  ManagedCollection,
  "getItemIds" | "addItems" | "removeItems" | "setPluginData"
>;

export type PreparedProductSync = {
  config: StoreConfig;
  mapped: ManagedCollectionItemInput[];
};

type ConfigurationSyncDependencies = {
  readConfig: typeof readStoreConfig;
  persistConfig: typeof saveStoreConfig;
  clearConfig: typeof clearStoreConfig;
  readSelectedFields: () => Promise<string | null>;
  writeSelectedFields: (value: string | null) => Promise<void>;
  prepare: typeof prepareProductSync;
  sync: typeof syncPreparedProductsCore;
};

type FieldShape = {
  id: string;
  type: string;
  fields?: readonly FieldShape[];
  cases?: readonly { id: string; name: string }[];
  collectionId?: string;
  allowedFileTypes?: readonly string[];
  required?: boolean;
};

function findIncompatibleField(
  previousFields: readonly FieldShape[],
  desiredFields: readonly FieldShape[],
  parent = "",
): string | null {
  const previousById = new Map(previousFields.map((field) => [field.id, field]));

  for (const desired of desiredFields) {
    const previous = previousById.get(desired.id);
    if (!previous) continue;
    const path = parent ? `${parent}.${desired.id}` : desired.id;
    if (previous.type !== desired.type) {
      return `Field "${path}" cannot change type from "${previous.type}" to "${desired.type}" during sync.`;
    }

    if (
      (desired.type === "collectionReference" ||
        desired.type === "multiCollectionReference") &&
      previous.collectionId !== desired.collectionId
    ) {
      return `Reference field "${path}" cannot change its target collection during sync.`;
    }

    if (
      desired.type === "file" &&
      previous.allowedFileTypes?.some(
        (fileType) => !desired.allowedFileTypes?.includes(fileType),
      )
    ) {
      return `File field "${path}" cannot remove allowed file types during sync.`;
    }

    if (desired.required === true && previous.required !== true) {
      return `Field "${path}" cannot become required during sync.`;
    }

    if (previous.type === "array" && desired.type === "array") {
      const nested = findIncompatibleField(
        previous.fields ?? [],
        desired.fields ?? [],
        path,
      );
      if (nested) return nested;
    }
  }

  return null;
}

function mergeStagingField(
  previous: FieldShape,
  desired: FieldShape,
): FieldShape {
  const merged: FieldShape = { ...previous, ...desired };

  if (previous.type === "array" && desired.type === "array") {
    merged.fields = mergeStagingFieldLists(
      previous.fields ?? [],
      desired.fields ?? [],
    );
  }

  if (previous.type === "enum" && desired.type === "enum") {
    const desiredCaseIds = new Set(
      (desired.cases ?? []).map((enumCase) => enumCase.id),
    );
    merged.cases = [
      ...(previous.cases ?? []).filter(
        (enumCase) => !desiredCaseIds.has(enumCase.id),
      ),
      ...(desired.cases ?? []),
    ];
  }

  return merged;
}

function mergeStagingFieldLists(
  previousFields: readonly FieldShape[],
  desiredFields: readonly FieldShape[],
): FieldShape[] {
  const desiredById = new Map(desiredFields.map((field) => [field.id, field]));
  const merged = previousFields.map((previous) => {
    const desired = desiredById.get(previous.id);
    return desired ? mergeStagingField(previous, desired) : previous;
  });
  const previousIds = new Set(previousFields.map((field) => field.id));
  merged.push(...desiredFields.filter((field) => !previousIds.has(field.id)));
  return merged;
}

function createStagingFields(
  previousFields: readonly ManagedCollectionField[],
  desiredFields: readonly ManagedCollectionFieldInput[],
): ManagedCollectionFieldInput[] {
  return mergeStagingFieldLists(
    previousFields,
    desiredFields,
  ) as ManagedCollectionFieldInput[];
}

export function withoutImageFields(
  item: ManagedCollectionItemInput,
): ManagedCollectionItemInput {
  return {
    ...item,
    fieldData: (stripImages(item.fieldData) ?? {}) as ManagedCollectionItemInput["fieldData"],
  };
}

export async function prepareProductSync(
  config: StoreConfig | null,
  canSync: boolean,
  selectedFields?: string[],
): Promise<PreparedProductSync> {
  if (!canSync) throw new Error("Missing permissions");
  if (!hasStoreCredentials(config)) {
    throw new Error(
      "Set up your Shopify domain and public Storefront API token in Manage before syncing.",
    );
  }

  const resolvedSelectedFields =
    selectedFields ??
    JSON.parse((await framer.getPluginData("selectedFields")) ?? "[]");

  const products = await getProducts({
    storeDomain: config.domain,
    accessToken: config.publicStorefrontToken,
    metafields: config.metafields,
  });

  if (products.length === 0) throw new Error("No products found");

  const mapped = await mapShopifyToCollectionItems(
    products,
    config,
    resolvedSelectedFields,
  );
  if (mapped.length === 0) throw new Error("No products could be mapped");

  return { config, mapped };
}

export async function syncPreparedProductsCore(
  prepared: PreparedProductSync,
  collection: ManagedCollectionSyncTarget,
  canSync: boolean,
) {
  if (!canSync) throw new Error("Missing permissions");
  const { mapped } = prepared;

  // Take the cleanup snapshot only after all non-Framer work has succeeded.
  // Existing content remains untouched unless the replacement add completes.
  const existingIds: string[] = await collection.getItemIds();

  try {
    await collection.addItems(mapped);
  } catch (uploadError) {
    // Framer's uploadAssetByURL can fail in some environments (CDN access issues,
    // dev environment network restrictions). Retry without image fields so the
    // rest of the product data still gets synced.
    console.warn(
      "[Sync] addItems failed (likely image upload error). Retrying without images...",
      uploadError
    );

    // addItems is idempotent by item ID. Retry the complete mapped set so
    // pre-existing and partially updated products also receive image-free data.
    const mappedWithoutImages = mapped.map(withoutImageFields);

    if (mappedWithoutImages.length > 0) {
      await collection.addItems(mappedWithoutImages);
    }
    framer.notify(
      "⚠️ Products synced, but images couldn't be uploaded. Re-sync to retry images.",
      { variant: "warning" }
    );
  }

  const targetIds = new Set(mapped.map((item) => item.id));
  const staleIds = existingIds.filter((id) => !targetIds.has(id));
  if (staleIds.length > 0) await collection.removeItems(staleIds);

  await collection.setPluginData(
    "lastSynchronizedAt",
    new Date().toISOString()
  );
  await collection.setPluginData("totalProducts", String(mapped.length));

  return mapped.length;
}

export async function syncProductsCore(
  config: StoreConfig | null,
  collection: ManagedCollectionSyncTarget,
  canSync: boolean,
) {
  const prepared = await prepareProductSync(config, canSync);
  return syncPreparedProductsCore(prepared, collection, canSync);
}

export async function configureCollectionAndSync(
  {
    candidateConfig,
    selectedFields,
    allFields,
    collection,
    canSync,
  }: {
    candidateConfig: StoreConfig;
    selectedFields: string[];
    allFields: ManagedCollectionFieldInput[];
    collection: ManagedCollection;
    canSync: boolean;
  },
  dependencies?: Partial<ConfigurationSyncDependencies>,
) {
  const deps: ConfigurationSyncDependencies = {
    readConfig: readStoreConfig,
    persistConfig: saveStoreConfig,
    clearConfig: clearStoreConfig,
    readSelectedFields: () => framer.getPluginData("selectedFields"),
    writeSelectedFields: (value) =>
      framer.setPluginData("selectedFields", value),
    prepare: prepareProductSync,
    sync: syncPreparedProductsCore,
    ...dependencies,
  };

  if (!isStoreConfig(candidateConfig)) {
    throw new Error("Invalid store configuration");
  }

  // Complete validation, fetch, and mapping against immutable candidates first.
  const prepared = await deps.prepare(
    candidateConfig,
    canSync,
    selectedFields,
  );
  const previousFields = await collection.getFields();
  const incompatibility = findIncompatibleField(previousFields, allFields);
  if (incompatibility) throw new Error(incompatibility);

  const stagingFields = createStagingFields(previousFields, allFields);
  const previousConfig = deps.readConfig();
  const previousSelectedFields = await deps.readSelectedFields();

  try {
    // Persist only after preflight, immediately before the non-destructive stage.
    deps.persistConfig(candidateConfig);
    await deps.writeSelectedFields(JSON.stringify(selectedFields));
    await collection.setFields(stagingFields);
  } catch (error) {
    try {
      if (previousConfig) deps.persistConfig(previousConfig);
      else deps.clearConfig();
      await deps.writeSelectedFields(previousSelectedFields);
    } catch (persistenceRestoreError) {
      console.error(
        "Failed to restore configuration persistence",
        persistenceRestoreError,
      );
    }
    throw error;
  }

  // On item/metadata failure the union schema remains intact. Only a fully
  // successful sync is allowed to prune fields that are no longer desired.
  const syncedCount = await deps.sync(prepared, collection, canSync);
  await collection.setFields(allFields);
  return syncedCount;
}
