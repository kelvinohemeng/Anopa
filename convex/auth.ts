import { convexAuth, createAccount } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Value } from "convex/values";

/**
 * Custom Google provider using id_token verification.
 *
 * The Framer plugin can't use redirect-based OAuth (iframe restriction), so the
 * existing Cloudflare Worker handles the popup + code-exchange and returns a
 * Google id_token. This provider verifies that token server-side via Google's
 * tokeninfo endpoint and creates/links the Convex user account.
 *
 * Required Convex env var: AUTH_GOOGLE_ID (your Google OAuth client ID)
 */
const GooglePlugin = ConvexCredentials({
  id: "google-plugin",
  authorize: async (credentials, ctx) => {
    const idToken = credentials.idToken as string | undefined;
    if (!idToken) throw new Error("Missing Google id_token");

    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    if (!res.ok) throw new Error("Failed to verify Google id_token with Google");

    const payload = await res.json();

    // Verify the token was issued for our app
    if (payload.aud !== process.env.AUTH_GOOGLE_ID) {
      throw new Error("Google id_token audience mismatch");
    }
    if (!payload.sub) throw new Error("Invalid Google id_token: missing sub");

    const result = await createAccount(ctx, {
      provider: "google-plugin",
      account: { id: payload.sub },
      profile: {
        email: payload.email as Value,
        name: payload.name as Value,
        image: payload.picture as Value,
        emailVerified:
          payload.email_verified === "true" || payload.email_verified === true,
      },
      shouldLinkViaEmail: true,
    });

    if (!result.user._id) throw new Error("createAccount did not return a userId");

    return { userId: result.user._id };
  },
});

// The Convex dashboard collapses PEM newlines into spaces (or removes them).
// jose's importPKCS8 requires proper PEM format, so we rebuild it from raw base64.
const _rawKey = process.env.JWT_PRIVATE_KEY;
if (_rawKey) {
  const _pemMatch = _rawKey.match(
    /-----BEGIN PRIVATE KEY-----[\s]*([\s\S]+?)[\s]*-----END PRIVATE KEY-----/,
  );
  if (_pemMatch) {
    const _base64 = _pemMatch[1].replace(/\s/g, "");
    const _lines = _base64.match(/.{1,64}/g) ?? [];
    process.env.JWT_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\n" +
      _lines.join("\n") +
      "\n-----END PRIVATE KEY-----\n";
  }
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password, GooglePlugin],
});
