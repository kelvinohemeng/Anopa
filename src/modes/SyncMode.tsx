import {
  framer,
  type ManagedCollection,
  ManagedCollectionItemInput,
} from "framer-plugin";
import { useEffect, useRef, useState } from "react";
import { ShopifyProduct } from "../utils/types";
import { usePermissions } from "../components/PermissionContext";
import {
  computeSyncPlan,
  prepareProductSync,
  syncPreparedProductsCore,
  type SyncPlan,
} from "../utils/syncProducts";
import StoreDetailsForm from "../pages/StoreDetailsForm";
import {
  hasStoreCredentials,
  type StoreConfig,
  useStoreConfig,
} from "../config/storeConfig";

type SyncStage =
  | "loading" // fetching + mapping + diffing (read-only, spinner)
  | "reviewing" // plan computed, waiting on user choice
  | "syncing" // user clicked Sync; mutation in progress
  | "success" // synced, about to auto-close
  | "canceled" // user clicked Go back
  | "error";

export default function SyncMode() {
  const { config } = useStoreConfig();

  const { canSync, loading: permissionsLoading } = usePermissions();
  const [stage, setStage] = useState<SyncStage>("loading");
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const collectionRef = useRef<ManagedCollection | null>(null);
  // Guards only the initial fetch+diff effect against re-running. The Sync
  // button itself needs no separate guard: once clicked, stage leaves
  // "reviewing" and the button unmounts.
  const hasStartedRef = useRef(false);

  framer.showUI({
    width: 500,
    height: 450,
    resizable: false,
  });

  useEffect(() => {
    if (permissionsLoading) {
      setStatus("Initializing...");
      return;
    }

    if (!hasStoreCredentials(config)) {
      // Handled by rendering StoreDetailsForm below instead of attempting
      // to sync — no collection-mutating call should run without a store
      // connected.
      setStatus("Shopify setup required");
      return;
    }

    if (!canSync) {
      const msg = "You don't have permission to sync this collection.";
      setError(msg);
      setStage("error");
      framer.notify(msg, { variant: "error" });
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const loadPlan = async () => {
      setStage("loading");
      setStatus("Initializing...");

      // Precondition gate: confirm an active managed collection is actually
      // resolvable before attempting any collection-mutating calls. This can
      // fail if Framer hasn't finished establishing the collection context.
      let collection: ManagedCollection;
      try {
        collection = await framer.getActiveManagedCollection();
      } catch (err) {
        console.error("Failed to resolve the active managed collection", err);
        const msg = "Open Anopa from a CMS collection to sync products.";
        setError(msg);
        setStage("error");
        framer.notify(msg, { variant: "error" });
        return;
      }
      collectionRef.current = collection;

      try {
        setStatus("Fetching latest products from Shopify...");
        const prepared = await prepareProductSync(config, canSync);
        setStatus("Comparing with your collection...");
        const computedPlan = await computeSyncPlan(prepared, collection);
        setPlan(computedPlan);
        setStage("reviewing");
      } catch (err) {
        console.error("Failed to prepare product sync", err);
        const message =
          err instanceof Error
            ? err.message
            : "Couldn't check for updates. Please try again.";
        setError(message);
        setStage("error");
        framer.notify(message, { variant: "error" });
      }
    };

    loadPlan();
  }, [config, canSync, permissionsLoading]);

  const handleSync = async () => {
    if (!plan || !collectionRef.current) return;
    setStage("syncing");
    setStatus("Syncing products...");
    setError(null);
    try {
      const syncedCount = await syncPreparedProductsCore(
        plan.prepared,
        collectionRef.current,
        canSync,
      );

      setStage("success");
      setStatus(`✅ Synced ${syncedCount} products`);
      framer.notify(`✅ Synced ${syncedCount} products`, {
        variant: "success",
      });

      setTimeout(() => {
        framer.closePlugin("Sync complete", { variant: "success" });
      }, 1500);
    } catch (err) {
      console.error("Product sync failed", err);
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't sync products. Please try again.";
      setError(message);
      setStage("error");
      framer.notify(message, { variant: "error" });
    }
  };

  const handleGoBack = () => {
    setStage("canceled");
    framer.closePlugin("Sync canceled — no changes were made.", {
      variant: "info",
    });
  };

  // No collection operation should run without a connected store — show the
  // form to fix that directly instead of a dead-end error message.
  if (!permissionsLoading && !hasStoreCredentials(config)) {
    return (
      <div className="absolute top-0 left-0 right-0 h-full !w-full !p-4 overflow-y-auto scrollbar-hidden">
        <StoreDetailsForm embedded />
      </div>
    );
  }

  if (stage === "reviewing" && plan) {
    const { toAddIds, toUpdateIds, toRemoveIds } = plan;
    const totalChanges =
      toAddIds.length + toUpdateIds.length + toRemoveIds.length;

    return (
      <div className="absolute top-0 left-0 right-0 h-full !w-full flex flex-col p-4">
        <div className="flex-1 flex flex-col justify-center items-center gap-3 text-center overflow-y-auto scrollbar-hidden">
          <h4 className="max-w-[310px] text-[28px] font-bold">
            Review Sync Changes
          </h4>
          {totalChanges === 0 ? (
            <p className="text-[12px] framer-color-text-tertiary">
              Your collection already matches your Shopify store. Nothing to
              sync.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-[12px] framer-color-text-secondary">
              {toAddIds.length > 0 && (
                <li>
                  {toAddIds.length} new product
                  {toAddIds.length === 1 ? "" : "s"} will be added
                </li>
              )}
              {toUpdateIds.length > 0 && (
                <li>
                  {toUpdateIds.length} product
                  {toUpdateIds.length === 1 ? "" : "s"} will be updated
                </li>
              )}
              {toRemoveIds.length > 0 ? (
                <li>
                  {toRemoveIds.length} product
                  {toRemoveIds.length === 1 ? "" : "s"} will be removed because
                  they're no longer in your Shopify store
                </li>
              ) : (
                <li>No products will be removed</li>
              )}
            </ul>
          )}
        </div>

        <div className="flex !p-5 gap-2 w-full framer-color-bg">
          <button
            onClick={handleGoBack}
            className="flex-1 framer-button-secondary"
          >
            Go back
          </button>
          <button
            onClick={() => void handleSync()}
            className="flex-1 !bg-brand-primary !text-white hover:!bg-brand-primary/80"
          >
            Sync
          </button>
        </div>
      </div>
    );
  }

  if (stage === "canceled") {
    return (
      <div className="absolute top-0 left-0 right-0 h-full !w-full flex items-center justify-center p-4 text-center">
        <p className="text-[12px] framer-color-text-tertiary">
          Sync canceled — closing…
        </p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="absolute top-0 left-0 right-0 h-full !w-full flex items-center justify-center p-4 text-center">
        <div className="flex flex-col justify-center items-center gap-2">
          <h4 className="max-w-[310px] text-[32px] font-bold">
            Sync Not Completed
          </h4>
          {error && (
            <div className="p-2 bg-red-700 rounded text-white text-center text-[12px]">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // stage === "loading" | "syncing" | "success"
  return (
    <div className="absolute top-0 left-0 right-0 h-full !w-full flex items-center justify-center p-4 text-center">
      <div className="flex flex-col justify-center items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="framer-spinner" />
          <p className="text-[10px] framer-color-text-tertiary">{status}</p>
        </div>
        <h4 className="max-w-[310px] text-[32px] font-bold">
          {stage === "loading"
            ? "Checking for Updates"
            : "Your Product is Syncing"}
        </h4>
      </div>
    </div>
  );
}

// Helper functions
function formatVariantsField(product: ShopifyProduct): string {
  const productId = product.id?.split("/").pop() ?? "unknown";
  const variants = product.variants?.edges?.map((edge) => edge.node) ?? [];

  if (variants.length === 0) return "";

  // Collect all option values for formatting
  const optionsMap = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const option of variant.selectedOptions ?? []) {
      const name = option?.name ?? "";
      const value = option?.value ?? "";
      if (!optionsMap.has(name)) optionsMap.set(name, new Set());
      optionsMap.get(name)?.add(value);
    }
  }

  const optionGroups = Array.from(optionsMap.entries())
    .map(([name, values]) => `${name}: ${Array.from(values).join(", ")}`)
    .join(" • ");

  // Create variant mappings with compareAtPrice
  const mappings = variants
    .map((variant) => {
      const label = (variant.selectedOptions ?? [])
        .map((opt) => opt?.value ?? "")
        .join(" / ");
      const variantId = variant.id?.split("/").pop() ?? "unknown";
      const compareAtPrice = variant.compareAtPrice?.amount ?? "";
      return `[${label} • ${variantId}${
        compareAtPrice ? ` • ${compareAtPrice}` : ""
      }]`;
    })
    .join(" ");

  return `[${optionGroups} • ${productId}] •• ${mappings}`;
}

function getCollectionTitles(product: ShopifyProduct, limit = 10): string {
  const edges = product.collections?.edges ?? [];
  const titles = edges
    .slice(0, limit)
    .map((e) => e?.node?.title)
    .filter(Boolean);
  return titles.join(", ");
}

function getSeoTitle(product: ShopifyProduct): string {
  // Fallback: Shopify often recommends using product.title if SEO title is empty
  return product.seo?.title?.trim() || product.title || "";
}

function getSeoDescription(product: ShopifyProduct): string {
  // Fallback: prefer explicit SEO description, then product.description (plain)
  return product.seo?.description?.trim() || product.description?.trim() || "";
}

// Tested conversion helper intentionally shares the component module.
// eslint-disable-next-line react-refresh/only-export-components
export function convertConfiguredMetafieldValue(
  configuredType: string,
  rawValue: unknown,
): ManagedCollectionItemInput["fieldData"][string] | null {
  if (rawValue === null || rawValue === undefined) return null;

  switch (configuredType) {
    case "string":
    case "formattedText":
    case "color":
    case "link":
      return { type: configuredType, value: String(rawValue) };
    case "number": {
      const value =
        typeof rawValue === "number" ? rawValue : Number(String(rawValue));
      return Number.isFinite(value) ? { type: "number", value } : null;
    }
    case "boolean": {
      if (rawValue === true || rawValue === "true" || rawValue === "1") {
        return { type: "boolean", value: true };
      }
      if (rawValue === false || rawValue === "false" || rawValue === "0") {
        return { type: "boolean", value: false };
      }
      return null;
    }
    case "date": {
      const value = String(rawValue);
      return Number.isNaN(Date.parse(value)) ? null : { type: "date", value };
    }
    case "image": {
      const value = String(rawValue);
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:"
          ? { type: "image", value }
          : null;
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}

function hasMetafieldValue(value: unknown): value is { value: unknown } {
  return typeof value === "object" && value !== null && "value" in value;
}

// Shared by the sync orchestrator and its focused mapping tests.
// eslint-disable-next-line react-refresh/only-export-components
export async function mapShopifyToCollectionItems(
  products: ShopifyProduct[],
  config: StoreConfig,
  selectedFields: string[],
): Promise<ManagedCollectionItemInput[]> {
  const syncAsGallery = config.syncImageAsGallery;
  const metafields = config.metafields;

  return products.map((product) => {
    const variantString = formatVariantsField(product);
    const fieldData: ManagedCollectionItemInput["fieldData"] = {};
    const dynamicProductFields = product as unknown as Record<string, unknown>;

    // Map Metafields
    metafields.forEach((m, i) => {
      const mf = dynamicProductFields[`metafield_${i}`];
      if (hasMetafieldValue(mf)) {
        const fieldId = `${m.namespace}_${m.key}`; // Must match ID generation in ConfigurationMode
        const converted = convertConfiguredMetafieldValue(m.type, mf.value);
        if (converted) fieldData[fieldId] = converted;
        else
          console.warn(
            `Skipping unsupported or invalid metafield ${m.namespace}.${m.key} for CMS type ${m.type}`,
          );
      }
    });

    for (const fieldId of selectedFields) {
      switch (fieldId) {
        case "title":
          fieldData.title = { type: "string", value: product.title };
          break;
        case "productId":
          fieldData.productId = {
            type: "string",
            value: product.id.split("/").pop() ?? "",
          };
          break;
        case "slug":
          fieldData.slug = { type: "string", value: product.handle };
          break;
        case "description":
          fieldData.description = {
            type: "formattedText",
            value: product.description || "",
          };
          break;
        case "variants":
          fieldData.variants = {
            type: "string",
            value: variantString,
          };
          break;
        case "price":
          fieldData.price = {
            type: "number",
            value: parseFloat(product.priceRange.minVariantPrice.amount),
          };
          break;
        case "images": {
          const images: { url: string; altText: string }[] = [];

          const gallery = product.images?.edges ?? [];
          for (let i = 0; i < 8; i++) {
            const img = gallery[i]?.node.url ?? "";
            const altText = gallery[i]?.node.altText ?? product.title;
            if (img) images.push({ url: img, altText });
          }

          if (syncAsGallery) {
            // Set featured image as a separate field
            if (images[0]?.url) {
              fieldData["featured_image"] = {
                type: "image",
                value: images[0].url,
                alt: images[0].altText,
              };
            }

            // Set remaining images as gallery
            fieldData["product_gallery"] = {
              type: "array",
              value: images.map((img) => ({
                fieldData: {
                  gallery_image: {
                    type: "image",
                    value: img.url,
                    alt: img.altText,
                  },
                },
              })),
            };
          } else {
            for (let i = 0; i < 8; i++) {
              if (images[i]?.url) {
                fieldData[`image_${i + 1}`] = {
                  type: "image",
                  value: images[i].url,
                  alt: images[i].altText ?? product.title,
                };
              }
            }
          }
          break;
        }
        case "collections":
          fieldData.collections = {
            // Option A (simple): comma-separated titles
            type: "string",
            value: getCollectionTitles(product),
          };
          break;
        case "seo_title":
          fieldData["seo_title"] = {
            type: "string",
            value: getSeoTitle(product),
          };
          break;

        case "seo_description":
          fieldData["seo_description"] = {
            // Keep this plain text so you can reuse it in <meta> easily
            type: "string",
            value: getSeoDescription(product),
          };
          break;
        case "vendor":
          fieldData.vendor = {
            type: "string",
            value: product.vendor ?? "",
          };
          break;
        case "tags":
          fieldData.tags = {
            type: "string",
            value: product.tags?.join(", ") ?? "",
          };
          break;
        case "productType":
          fieldData.productType = {
            type: "string",
            value: product.productType ?? "",
          };
          break;
        default:
          console.warn("Unhandled field:", fieldId);
          break;
      }
    }

    return {
      id: product.id,
      slug: product.handle,
      fieldData,
    };
  });
}
