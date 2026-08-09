/**
 * Tells Convex which auth provider to trust for JWT verification.
 * @convex-dev/auth acts as its own OIDC issuer using CONVEX_SITE_URL.
 * This file is required — CONVEX_SITE_URL is set automatically by Convex.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
