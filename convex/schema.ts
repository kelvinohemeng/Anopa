import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Extend the auth users table with app-specific fields.
  // The ...authTables spread defines users; overriding it here adds custom columns
  // while keeping the fields @convex-dev/auth manages internally.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Shopify Storefront API credentials for this user's connected store.
    shopify_domain: v.optional(v.string()),
    shopify_storefront_token: v.optional(v.string()),
    config_key: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
});
