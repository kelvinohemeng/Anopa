import { fetchShopifyData } from "./shopifyStorefront";
import { ShopifyProduct } from "./types";
import { areValidStoreMetafields, type StoreMetafield } from "../config/storeConfig";

type ProductsConnection = {
  edges: Array<{ node: ShopifyProduct }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

type GetProductsResponse = {
  products?: ProductsConnection;
};

export const buildGetProductsQuery = (
  metafields: Pick<StoreMetafield, "namespace" | "key" | "type">[] = [],
) => {
  if (!areValidStoreMetafields(metafields)) {
    throw new Error("Invalid metafield configuration.");
  }
  const metafieldVariableDefinitions = metafields
    .map((_, i) => `, $metafieldNamespace${i}: String!, $metafieldKey${i}: String!`)
    .join("");
  const metafieldsQuery = metafields
    .map(
      (_, i) => `metafield_${i}: metafield(namespace: $metafieldNamespace${i}, key: $metafieldKey${i}) {
        value
        type
      }`
    )
    .join("\n");

  return `
  query getProducts($first: Int!, $after: String${metafieldVariableDefinitions}) {
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
  metafields?: StoreMetafield[];
}): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let hasNextPage = true;
  let after: string | null = null;
  
  // Build the query once with the provided metafields
  const query = buildGetProductsQuery(metafields);
  const metafieldVariables = Object.fromEntries(
    metafields.flatMap((metafield, index) => [
      [`metafieldNamespace${index}`, metafield.namespace],
      [`metafieldKey${index}`, metafield.key],
    ]),
  );

  while (hasNextPage && allProducts.length < limit) {
    // console.log(`🔁 Fetching page — after: ${after}`);

    const data: GetProductsResponse =
      await fetchShopifyData<GetProductsResponse>({
      query,
      variables: {
        first: Math.min(25, limit - allProducts.length),
        after,
        ...metafieldVariables,
      },
      storeDomain,
      accessToken,
      });

    const products: ProductsConnection | undefined = data.products;

    if (!products) {
       console.error("No products returned from Shopify");
       break;
    }

    // console.log(`📦 Received ${products.edges.length} products`);
    // console.log(`🔚 hasNextPage: ${products.pageInfo.hasNextPage}`);
    // console.log(`➡️ endCursor: ${products.pageInfo.endCursor}`);

    allProducts.push(...products.edges.map((edge) => edge.node));
    hasNextPage = products.pageInfo.hasNextPage;
    after = products.pageInfo.endCursor;
  }

  return allProducts;
}
