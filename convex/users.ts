import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => ctx.db.get(userId),
});

/** Returns the current user's profile, or null if unauthenticated. */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { ...user, id: userId };
  },
});

/** Saves / updates Shopify store credentials for the authenticated user. */
export const updateStore = mutation({
  args: {
    shopify_domain: v.string(),
    shopify_storefront_token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      shopify_domain: args.shopify_domain,
      shopify_storefront_token: args.shopify_storefront_token,
    });
  },
});

/** Clears Shopify credentials for the authenticated user. */
export const disconnectStore = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      shopify_domain: undefined,
      shopify_storefront_token: undefined,
    });
  },
});
