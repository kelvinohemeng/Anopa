// type ShopifyProductVariant = {
//   id: string;
//   title: string;
//   sku?: string;
//   availableForSale?: boolean;
//   price: {
//     amount: string;
//     currencyCode: string;
//   };
//   selectedOptions?: {
//     name: string;
//     value: string;
//   }[];
//   image?: {
//     url: string;
//   };
// };

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  createdAt: string;
  updatedAt: string;

  featuredImage?: {
    url: string;
    altText?: string | null;
  };

  images: {
    edges: {
      node: {
        url: string;
        altText?: string | null;
      };
    }[];
  };

  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };

  options: {
    id: string;
    name: string;
    values: string[];
  }[];

  /** ✅ SEO fields */
  seo?: {
    title?: string;
    description?: string;
  };

  /** ✅ Collections (added) */
  collections?: {
    edges: {
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }[];
  };

  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        sku?: string;
        availableForSale: boolean;
        price: {
          amount: string;
          currencyCode: string;
        };
        compareAtPrice?: {
          amount: string;
          currencyCode: string;
        };
        image?: {
          url: string;
          altText?: string | null;
        };
        selectedOptions: {
          name: string;
          value: string;
        }[];
      };
    }[];
  };
};

// Add this helper function to safely access nested properties
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | undefined {
  return obj ? obj[key] : undefined;
}
