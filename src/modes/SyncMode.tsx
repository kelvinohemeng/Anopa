import { framer, ManagedCollectionItemInput } from "framer-plugin";
import { useEffect, useRef, useState } from "react";
import { ShopifyProduct } from "../utils/types";
import {
  SYNC_PERMISSIONS,
  usePermissions,
} from "../components/PermissionContext";
import { syncProductsCore } from "../utils/syncProducts";
import {
  hasStoreCredentials,
  type StoreConfig,
  useStoreConfig,
} from "../config/storeConfig";

export default function SyncMode() {
  const { config } = useStoreConfig();

  const { canSync, loading: permissionsLoading } = usePermissions();
  const [status, setStatus] = useState("Syncing products...");
  const [error, setError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false); // <- Prevents double sync

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
      setError(
        "Set up your Shopify domain and public Storefront API token in Manage before syncing.",
      );
      setStatus("Shopify setup required");
      framer.notify(
        "Shopify setup required. Open Manage to add your store details.",
        { variant: "warning" },
      );
      return;
    }

    if (!canSync) {
      setError("❌ Missing permissions");
      setStatus("❌ Cannot sync: Insufficient permissions.");
      return;
    }

    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const syncProducts = async () => {
      setStatus("Initializing...");

      try {
        const collection = await framer.getActiveManagedCollection();

        if (!canSync) {
          const msg = `Missing permissions: ${SYNC_PERMISSIONS.join(", ")}`;
          setError(msg);
          setStatus("❌ " + msg);
          framer.notify("❌ Missing permissions");
          return;
        }

        const syncedCount = await syncProductsCore(
          config,
          collection,
          canSync,
        );

        setStatus(`✅ Synced ${syncedCount} products`);
        framer.notify("✅ Products synced");

        setTimeout(() => {
          framer.closePlugin("Sync complete", { variant: "success" });
        }, 1500);
      } catch (err) {
        console.error("Product sync failed");
        setError(err instanceof Error ? err.message : String(err));
        setStatus("❌ Sync failed");
        framer.notify("❌ Sync error");
      }
    };

    syncProducts();
  }, [config, canSync, permissionsLoading]);

  return (
    <div className="absolute top-0 left-0 right-0 h-full !w-full flex items-center justify-center p-4 text-center">
      <div className="flex flex-col justify-center items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="framer-spinner" />
          <p className="text-[10px] framer-color-text-tertiary">{status}</p>
        </div>
        <h4 className="max-w-[310px] text-[32px] font-bold">
          Your Product is Syncing
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
