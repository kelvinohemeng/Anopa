function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const STOREFRONT_API_VERSION = "2026-07";

export function getStorefrontEndpoint(storeDomain: string): string {
  return `https://${storeDomain}/api/${STOREFRONT_API_VERSION}/graphql.json`;
}

export async function fetchShopifyData<T = unknown>({
  query,
  variables,
  storeDomain,
  accessToken,
}: {
  query: string;
  variables?: Record<string, unknown>;
  storeDomain: string | undefined;
  accessToken: string | undefined;
}): Promise<T> {
  if (!storeDomain) throw new Error("Missing storeDomain");
  if (!accessToken) throw new Error("Missing accessToken");
  const endpoint = getStorefrontEndpoint(storeDomain);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Shopify request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`,
      );
    }

    // Log raw response to inspect what Shopify sent back
    // console.log("📦 Shopify raw response:", text);

    // Try parsing if not empty
    if (!text) {
      throw new Error("Empty response from Shopify.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("🚨 Failed to parse JSON:", err);
      throw new Error("Response was not valid JSON.");
    }

    if (!isRecord(json)) {
      throw new Error("Shopify returned an invalid response.");
    }

    if (json.errors !== undefined) {
      console.error("❌ Shopify API errors:", json.errors);
      throw new Error(JSON.stringify(json.errors));
    }

    if (!("data" in json)) {
      throw new Error("Shopify response did not include data.");
    }

    return json.data as T;
  } catch (err) {
    console.error("🔥 Shopify fetch error:", err);
    throw err;
  }
}
