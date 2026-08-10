import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "anopa.shopify.store-config";
const STORE_CONFIG_EVENT = "anopa:store-config-changed";

export const ANOPA_CONFIG_COMPONENT_KEY = "c4bbe3e3-47c8-4ae4-aa9f-81476067b70a";
export const ANOPA_CONFIG_COMPONENT_URL = "https://framer.com/m/ShopifyConfigProvider-4ovM.js";
const PRIVATE_SHOPIFY_TOKEN_PREFIXES = ["shpat_", "shpca_", "shppa_", "shpss_", "shptka_", "shpua_"];

export const STORE_CONFIG_VERSION = 1 as const;

export type StoreCustomField = {
  id: string;
  name: string;
  type: string;
  fields?: StoreCustomField[];
  userEditable?: boolean;
  allowedFileTypes?: string[];
  collectionId?: string;
  enumCases?: { name: string }[];
};

export type StoreMetafield = {
  namespace: string;
  key: string;
  type: string;
};

export type StoreConfigV1 = {
  version: typeof STORE_CONFIG_VERSION;
  domain: string;
  publicStorefrontToken: string;
  customFields: StoreCustomField[];
  metafields: StoreMetafield[];
  syncImageAsGallery: boolean;
};

export type StoreConfig = StoreConfigV1;

const emptyConfig = (): StoreConfig => ({
  version: STORE_CONFIG_VERSION,
  domain: "",
  publicStorefrontToken: "",
  customFields: [],
  metafields: [],
  syncImageAsGallery: false,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isCustomField(value: unknown, depth = 0): value is StoreCustomField {
  if (!isObject(value) || depth > 4) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.type !== "string"
  ) {
    return false;
  }
  if (
    value.fields !== undefined &&
    (!Array.isArray(value.fields) ||
      !value.fields.every((field) => isCustomField(field, depth + 1)))
  ) {
    return false;
  }
  if (
    value.allowedFileTypes !== undefined &&
    (!Array.isArray(value.allowedFileTypes) ||
      !value.allowedFileTypes.every((item) => typeof item === "string"))
  ) {
    return false;
  }
  if (
    value.enumCases !== undefined &&
    (!Array.isArray(value.enumCases) ||
      !value.enumCases.every(
        (item) => isObject(item) && typeof item.name === "string",
      ))
  ) {
    return false;
  }
  return (
    (value.userEditable === undefined ||
      typeof value.userEditable === "boolean") &&
    (value.collectionId === undefined || typeof value.collectionId === "string")
  );
}

export function isValidMetafieldNamespace(value: string): boolean {
  return value.length >= 3 && value.length <= 255 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function isValidMetafieldKey(value: string): boolean {
  return value.length >= 3 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function metafieldCmsIdentifier(metafield: Pick<StoreMetafield, "namespace" | "key">): string {
  return `${metafield.namespace}_${metafield.key}`;
}

export function areValidStoreMetafields(values: readonly StoreMetafield[]): boolean {
  const identifiers = new Set<string>();
  for (const value of values) {
    if (!isMetafield(value)) return false;
    const identifier = metafieldCmsIdentifier(value);
    if (identifiers.has(identifier)) return false;
    identifiers.add(identifier);
  }
  return true;
}

function isMetafield(value: unknown): value is StoreMetafield {
  return (
    isObject(value) &&
    typeof value.namespace === "string" &&
    isValidMetafieldNamespace(value.namespace) &&
    typeof value.key === "string" &&
    isValidMetafieldKey(value.key) &&
    typeof value.type === "string" &&
    value.type.length > 0 &&
    value.type === value.type.trim()
  );
}

export function isStoreConfig(value: unknown): value is StoreConfig {
  if (!isObject(value) || value.version !== STORE_CONFIG_VERSION) return false;
  return (
    typeof value.domain === "string" &&
    value.domain === normalizeShopifyDomain(value.domain) &&
    typeof value.publicStorefrontToken === "string" &&
    isPublicStorefrontToken(value.publicStorefrontToken) &&
    value.publicStorefrontToken === value.publicStorefrontToken.trim() &&
    Array.isArray(value.customFields) &&
    value.customFields.every((field) => isCustomField(field)) &&
    Array.isArray(value.metafields) &&
    areValidStoreMetafields(value.metafields) &&
    typeof value.syncImageAsGallery === "boolean"
  );
}

export function normalizeShopifyDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    const authority = candidate.slice(candidate.indexOf("://") + 3).split(/[/?#]/, 1)[0];
    const hostname = url.hostname.toLowerCase().replace(/\.+$/, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || /:\d+$/.test(authority) || (url.pathname !== "" && url.pathname !== "/") || url.search || url.hash || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(hostname)) return "";
    return hostname;
  } catch {
    return "";
  }
}

export function isPublicStorefrontToken(input: string): boolean {
  const token = input.trim();
  if (!token) return false;
  const lowercaseToken = token.toLowerCase();
  return !PRIVATE_SHOPIFY_TOKEN_PREFIXES.some((prefix) => lowercaseToken.startsWith(prefix));
}

export function isAnopaConfigComponent(node: { insertURL: string | null }): boolean {
  return node.insertURL === ANOPA_CONFIG_COMPONENT_URL;
}

export function readStoreConfig(): StoreConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoreConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoreConfig(config: StoreConfig): StoreConfig {
  const normalized: StoreConfig = {
    ...config,
    version: STORE_CONFIG_VERSION,
    domain: normalizeShopifyDomain(config.domain),
    publicStorefrontToken: config.publicStorefrontToken.trim(),
  };
  if (!isStoreConfig(normalized)) throw new Error("Invalid store configuration");
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(STORE_CONFIG_EVENT));
  } catch {
    throw new Error("Local store configuration could not be saved");
  }
  return normalized;
}

export function updateStoreConfig(
  update: Partial<Omit<StoreConfig, "version">>,
): StoreConfig {
  return saveStoreConfig({ ...(readStoreConfig() ?? emptyConfig()), ...update });
}

export function clearStoreConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    if (window.localStorage.getItem(STORAGE_KEY) !== null) throw new Error("Store configuration is still present");
    window.dispatchEvent(new CustomEvent(STORE_CONFIG_EVENT));
  } catch {
    throw new Error("Local store configuration could not be cleared");
  }
}

export function hasStoreCredentials(
  config: StoreConfig | null,
): config is StoreConfig {
  return Boolean(config?.domain && config.publicStorefrontToken);
}

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(() =>
    readStoreConfig(),
  );

  const refresh = useCallback(() => setConfig(readStoreConfig()), []);

  useEffect(() => {
    window.addEventListener("storage", refresh);
    window.addEventListener(STORE_CONFIG_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(STORE_CONFIG_EVENT, refresh);
    };
  }, [refresh]);

  return { config, refresh };
}
