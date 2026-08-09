import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ---------------------------------------------------------------------------
// One-time bridge for pre-Convex users being migrated from the old backend.
//
// `seed` populates the `pendingMigrations` table from data you pass in at
// call time — real user data (emails, Shopify credentials) must never be
// hardcoded here or committed to source control.
//
// Run once, passing your export as a JSON argument:
//   npx convex run migration:seed '{"users":[{"email":"a@b.com","shopify_domain":"...","shopify_storefront_token":"..."}]}'
//
// Keep the export file itself outside the repo (or in a gitignored path) —
// it never needs to be committed.
// ---------------------------------------------------------------------------
export const seed = internalMutation({
  args: {
    users: v.array(
      v.object({
        email: v.string(),
        shopify_domain: v.optional(v.string()),
        shopify_storefront_token: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { users }) => {
    let inserted = 0;
    let skipped = 0;

    for (const row of users) {
      const existing = await ctx.db
        .query("pendingMigrations")
        .withIndex("by_email", (q) => q.eq("email", row.email))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("pendingMigrations", {
        email: row.email,
        shopify_domain: row.shopify_domain || undefined,
        shopify_storefront_token: row.shopify_storefront_token || undefined,
        applied: false,
      });
      inserted++;
    }

    console.log(`[Migration] Seeded: ${inserted} inserted, ${skipped} already existed`);
    return { inserted, skipped };
  },
});

// ---------------------------------------------------------------------------
// Apply — called automatically after a user signs in (see AuthContext.tsx).
// No-op if there's no pending row for the signed-in user's email, so it's
// always safe to leave wired up even once every real user has migrated.
// ---------------------------------------------------------------------------
export const applyForCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    // Already has Shopify data — nothing to migrate
    if (user.shopify_domain || user.shopify_storefront_token) return null;

    const pending = await ctx.db
      .query("pendingMigrations")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .first();

    if (!pending || pending.applied) return null;

    await ctx.db.patch(userId, {
      shopify_domain: pending.shopify_domain,
      shopify_storefront_token: pending.shopify_storefront_token,
    });

    await ctx.db.patch(pending._id, { applied: true });

    console.log("[Migration] Applied migration for", user.email);
    return { applied: true };
  },
});
