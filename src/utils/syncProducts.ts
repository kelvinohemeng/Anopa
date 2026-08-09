// src/utils/syncProducts.ts
import { framer } from "framer-plugin";
import { getProducts } from "./fetchShopifyData";
import { mapShopifyToCollectionItems } from "../modes/SyncMode";

export async function syncProductsCore(
  appUser: any,
  collection: any,
  canSync: boolean
) {
  if (!canSync) throw new Error("Missing permissions");

  // Clear existing items
  const ids = await collection.getItemIds();
  if (ids.length > 0) await collection.removeItems(ids);

  // Get metafields config
  const metafieldsRaw = await framer.getPluginData("metafields");
  const metafields = metafieldsRaw ? JSON.parse(metafieldsRaw) : [];

  // Fetch from Shopify
  const products = await getProducts({
    storeDomain: appUser?.shopify_domain?.replace(/^https?:\/\//, "") ?? "",
    accessToken: appUser?.shopify_storefront_token,
    metafields,
  });

  if (products.length === 0) throw new Error("No products found");

  const mapped = await mapShopifyToCollectionItems(products);

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

    const mappedWithoutImages = mapped.map((item: any) => ({
      ...item,
      fieldData: Object.fromEntries(
        Object.entries(item.fieldData as Record<string, any>).filter(
          ([_, v]) => !(v && typeof v === "object" && (v as any).type === "image")
        )
      ),
    }));

    await collection.addItems(mappedWithoutImages);
    framer.notify(
      "⚠️ Products synced, but images couldn't be uploaded. Re-sync to retry images.",
      { variant: "warning" }
    );
  }

  await collection.setPluginData(
    "lastSynchronizedAt",
    new Date().toISOString()
  );
  await collection.setPluginData("totalProducts", String(mapped.length));

  return mapped.length;
}
