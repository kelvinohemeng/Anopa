import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Represents a single Shopify product variant.
 * Typically selected by a user (e.g., Size: Medium, Color: Black).
 */
export type ShopifyVariant = {
  id: string; // Shopify variant ID (e.g., gid://shopify/ProductVariant/...)
  title: string; // Variant title (e.g., "Large / Black")
  price: string; // Price as string (Shopify Storefront API returns this)
  available: boolean; // Stock availability
  image?: string; // Optional image for this variant
  sku?: string; // Optional SKU for tracking or integration
};

/**
 * A single item in the shopping cart, including product and variant info.
 */
export type CartItem = {
  productId: string;
  productTitle: string;
  variant: ShopifyVariant;
  quantity: number;
};

/**
 * Discount code data.
 * This is passed to the Shopify checkout via URL (?discount=CODE)
 */
type Discount = {
  code: string;
};

/**
 * Zustand-based cart store.
 * This is the central place for all cart actions and state.
 */
type CartStore = {
  // 🛒 State
  items: CartItem[];
  discount?: Discount;

  // ⚙️ Actions
  addToCart: (item: CartItem) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscountCode: (code: string) => void;
  removeDiscountCode: () => void;

  // 📊 Derived helpers
  totalItems: () => number;
  totalPrice: () => number;
  hasItem: (variantId: string) => boolean;
  getShopifyLineItems: () => { variantId: string; quantity: number }[];
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discount: undefined,

      /**
       * Add an item to the cart.
       * If the same variant already exists, it increments quantity.
       */
      addToCart: (item) => {
        if (item.quantity <= 0) return;

        const existing = get().items.find(
          (i) => i.variant.id === item.variant.id
        );

        if (existing) {
          set({
            items: get().items.map((i) =>
              i.variant.id === item.variant.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },

      /**
       * Remove an item completely from the cart by variant ID.
       */
      removeFromCart: (variantId) => {
        set({
          items: get().items.filter((i) => i.variant.id !== variantId),
        });
      },

      /**
       * Update the quantity of a cart item by variant ID.
       * Automatically removes item if quantity is 0 or below.
       */
      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(variantId);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.variant.id === variantId ? { ...i, quantity } : i
          ),
        });
      },

      /**
       * Clear all cart contents.
       */
      clearCart: () => set({ items: [] }),

      /**
       * Set a discount code to be used during Shopify checkout.
       */
      setDiscountCode: (code) => set({ discount: { code } }),

      /**
       * Remove the currently active discount code.
       */
      removeDiscountCode: () => set({ discount: undefined }),

      /**
       * Get the total quantity of all items in the cart.
       */
      totalItems: () => get().items.reduce((total, i) => total + i.quantity, 0),

      /**
       * Calculate the total cart value (unformatted float).
       */
      totalPrice: () =>
        get().items.reduce(
          (total, i) => total + parseFloat(i.variant.price) * i.quantity,
          0
        ),

      /**
       * Check if a specific variant is already in the cart.
       */
      hasItem: (variantId) =>
        get().items.some((i) => i.variant.id === variantId),

      /**
       * Format cart data into Shopify's expected checkout input shape.
       */
      getShopifyLineItems: () =>
        get().items.map((i) => ({
          variantId: i.variant.id,
          quantity: i.quantity,
        })),
    }),
    {
      name: "framer-shopify-cart", // localStorage key
    }
  )
);
