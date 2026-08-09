export async function fetchShopifyData({
  query,
  variables,
  storeDomain,
  accessToken,
}: {
  query: string;
  variables?: Record<string, any>;
  storeDomain: string | undefined;
  accessToken: string | undefined;
}) {
  const endpoint = `https://${storeDomain}/api/2025-04/graphql.json`;

  if (!storeDomain) throw new Error("Missing storeDomain");
  if (!accessToken) throw new Error("Missing accessToken");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken!,
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await response.text();

    // Log raw response to inspect what Shopify sent back
    // console.log("📦 Shopify raw response:", text);

    // Try parsing if not empty
    if (!text) {
      throw new Error("Empty response from Shopify.");
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("🚨 Failed to parse JSON:", err);
      throw new Error("Response was not valid JSON.");
    }

    if (json.errors) {
      console.error("❌ Shopify API errors:", json.errors);
      throw new Error(JSON.stringify(json.errors));
    }

    return json.data;
  } catch (err) {
    console.error("🔥 Shopify fetch error:", err);
    throw err;
  }
}
