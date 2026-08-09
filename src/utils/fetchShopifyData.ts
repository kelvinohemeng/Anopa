import { fetchShopifyData } from "./shopifyStorefront";
import { ShopifyProduct } from "./types";

const buildGetProductsQuery = (
  metafields: { namespace: string; key: string }[] = []
) => {
  const metafieldsQuery = metafields
    .map(
      (m, i) => `metafield_${i}: metafield(namespace: "${m.namespace}", key: "${m.key}") {
        value
        type
      }`
    )
    .join("\n");

  return `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          handle
          description
          vendor
          productType
          tags
          availableForSale
          createdAt
          updatedAt

          ${metafieldsQuery}

          featuredImage {
            url
            altText
          }

          images(first: 8) {
            edges {
              node {
                url
                altText
              }
            }
          }

          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }

          options {
            id
            name
            values
          }

          seo {
            title
            description
          }

          collections(first: 10) {
            edges { node { id handle title } }
          }

          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                availableForSale

                price {
                  amount
                  currencyCode
                }

                compareAtPrice {
                  amount
                  currencyCode
                }

                image {
                  url
                  altText
                }

                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;
};

export async function getProducts({
  storeDomain,
  accessToken,
  limit = 50,
  metafields = [],
}: {
  storeDomain: string | undefined;
  accessToken: string | undefined;
  limit?: number;
  metafields?: { namespace: string; key: string }[];
}): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let hasNextPage = true;
  let after: string | null = null;
  
  // Build the query once with the provided metafields
  const query = buildGetProductsQuery(metafields);

  while (hasNextPage && allProducts.length < limit) {
    // console.log(`🔁 Fetching page — after: ${after}`);

    const data = await fetchShopifyData({
      query,
      variables: {
        first: Math.min(25, limit - allProducts.length),
        after,
      },
      storeDomain,
      accessToken,
    });

    const products = data.products;

    if (!products) {
       console.error("No products returned from Shopify");
       break;
    }

    // console.log(`📦 Received ${products.edges.length} products`);
    // console.log(`🔚 hasNextPage: ${products.pageInfo.hasNextPage}`);
    // console.log(`➡️ endCursor: ${products.pageInfo.endCursor}`);

    allProducts.push(...products.edges.map((e: any) => e.node));
    hasNextPage = products.pageInfo.hasNextPage;
    after = products.pageInfo.endCursor;
  }

  return allProducts;
}
