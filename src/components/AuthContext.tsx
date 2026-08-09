/* eslint react-refresh/only-export-components: off */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useConvexAuth, useQuery, useConvex, useMutation } from "convex/react";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useLocation } from "wouter";
import { framer } from "framer-plugin";
import { usePostHog } from "./PostHogProvider";

export type AppUser = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  shopify_domain?: string;
  shopify_storefront_token?: string;
  config_key?: string;
  created_at?: string;
};

// Compat shape used by MyAccount.tsx to display name/avatar without a full refactor
type UserCompat = {
  email?: string;
  user_metadata?: {
    full_name?: string;
    picture?: string;
    email?: string;
  };
};

type AuthContextType = {
  user: UserCompat | null;
  appUser: AppUser | null;
  accessToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (code: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAppUser: () => void;
  isAuthenticated: boolean;
};

const AUTH_BACKEND = "https://framer-plugin-worker.kelvinohemeng59.workers.dev";

interface AuthTokens {
  id_token: string;
  [key: string]: unknown;
}

const pollForTokens = (readKey: string): Promise<AuthTokens> =>
  new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${AUTH_BACKEND}/poll?readKey=${readKey}`, {
          method: "POST",
        });
        if (response.status === 200) {
          const tokens = await response.json();
          clearInterval(interval);
          resolve(tokens);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 2500);

    setTimeout(() => {
      clearInterval(interval);
      framer.notify("❌ Login timed out. Please try again.", { variant: "error" });
      reject(new Error("Login timed out"));
    }, 60000);
  });

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [path, navigate] = useLocation();
  const posthog = usePostHog();
  const convex = useConvex();

  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut: convexSignOut } = useAuthActions();
  const accessToken = useAuthToken();
  const applyMigration = useMutation(api.migration.applyForCurrentUser);

  // Reactive query — auto-updates whenever the user document changes
  const rawAppUser = useQuery(
    api.users.getMe,
    isAuthenticated ? {} : "skip",
  );

  const appUser: AppUser | null =
    rawAppUser
      ? {
          id: rawAppUser.id as string,
          email: rawAppUser.email ?? "",
          name: rawAppUser.name ?? undefined,
          image: rawAppUser.image ?? undefined,
          shopify_domain: rawAppUser.shopify_domain ?? undefined,
          shopify_storefront_token: rawAppUser.shopify_storefront_token ?? undefined,
          config_key: rawAppUser.config_key ?? undefined,
        }
      : null;

  // Compat object so MyAccount.tsx works without a full refactor
  const user: UserCompat | null = appUser
    ? {
        email: appUser.email,
        user_metadata: {
          full_name: appUser.name,
          picture: appUser.image,
          email: appUser.email,
        },
      }
    : null;

  const hasStoreDetails = (u: AppUser | null) =>
    Boolean(u?.shopify_domain && u?.shopify_storefront_token);

  // Redirect to /login when not authenticated and not already on an auth page
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (path !== "/login" && path !== "/signup") {
        navigate("/login");
      }
    }
  }, [isLoading, isAuthenticated, path, navigate]);

  const signUpWithEmailPassword = async (email: string, password: string) => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("flow", "signUp");
    await signIn("password", formData);

    posthog.capture("user_signed_up", { method: "email" });
    posthog.identify(email, { email });
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("flow", "signIn");
    await signIn("password", formData);

    posthog.capture("user_logged_in", { method: "email" });
    posthog.identify(email, { email });

    // Imperatively fetch the profile to decide routing
    const profile = await convex.query(api.users.getMe, {});
    const mapped: AppUser | null = profile
      ? {
          id: profile.id as string,
          email: profile.email ?? "",
          shopify_domain: profile.shopify_domain ?? undefined,
          shopify_storefront_token: profile.shopify_storefront_token ?? undefined,
          config_key: profile.config_key ?? undefined,
        }
      : null;

    navigate(hasStoreDetails(mapped) ? "/" : "/manage");
  };

  const forgotPassword = async (email: string) => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("flow", "reset");
    await signIn("password", formData);
  };

  const resetPassword = async (code: string, newPassword: string) => {
    const formData = new FormData();
    formData.append("code", code);
    formData.append("newPassword", newPassword);
    formData.append("flow", "reset-verification");
    await signIn("password", formData);
  };

  const signInWithGoogle = async () => {
    const response = await fetch(`${AUTH_BACKEND}/authorize`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to initiate login");

    const { url, readKey } = await response.json();
    window.open(url); // starts OAuth popup

    const tokens = await pollForTokens(readKey);

    // Verified server-side by the GooglePlugin ConvexCredentials provider in convex/auth.ts
    const formData = new FormData();
    formData.append("idToken", tokens.id_token);
    await signIn("google-plugin", formData);

    posthog.capture("user_logged_in", { method: "google" });

    const profile = await convex.query(api.users.getMe, {});
    const mapped: AppUser | null = profile
      ? {
          id: profile.id as string,
          email: profile.email ?? "",
          shopify_domain: profile.shopify_domain ?? undefined,
          shopify_storefront_token: profile.shopify_storefront_token ?? undefined,
          config_key: profile.config_key ?? undefined,
        }
      : null;

    if (profile?.email) {
      posthog.identify(profile.email, { email: profile.email });
    }

    navigate(hasStoreDetails(mapped) ? "/" : "/manage");
  };

  const signOut = async () => {
    if (appUser) {
      posthog.capture("user_logged_out", { user_id: appUser.id });
    }

    await convexSignOut();

    posthog.reset();
    navigate("/login");
  };

  // Apply a pending pre-Convex migration once — fires when the user is first
  // authenticated and their profile is loaded but has no Shopify data yet.
  useEffect(() => {
    if (!isAuthenticated || !appUser) return;
    if (appUser.shopify_domain || appUser.shopify_storefront_token) return;
    applyMigration({}).catch((e) =>
      console.warn("[Migration] applyForCurrentUser failed:", e),
    );
  }, [isAuthenticated, appUser?.id]);

  // With Convex reactive queries, data auto-refreshes. Expose as a no-op
  // for callers (e.g. focus-based refresh in ConfigurationMode).
  const refreshAppUser = useCallback(() => {
    // Convex subscriptions push updates automatically; no manual action needed.
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        accessToken: accessToken ?? null,
        loading: isLoading,
        signUpWithEmailPassword,
        loginWithEmailPassword,
        forgotPassword,
        resetPassword,
        signInWithGoogle,
        signOut,
        refreshAppUser,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
