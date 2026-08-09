import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, ReactNode } from "react";
import { framer } from "framer-plugin";

interface PostHogProviderProps {
  children: ReactNode;
  apiKey?: string;
  apiHost?: string;
}

export function PostHogProvider({
  children,
  apiKey = import.meta.env.VITE_POSTHOG_KEY,
  apiHost = import.meta.env.VITE_POSTHOG_HOST,
}: PostHogProviderProps) {
  useEffect(() => {
    // Only initialize if we have an API key and haven't initialized yet
    if (apiKey && !posthog.__loaded) {
      posthog.init(apiKey, {
        api_host: apiHost,
        autocapture: true,
        capture_pageview: true, // We handle this manually
        session_recording: {},
        loaded: (ph) => {
          // if (import.meta.env.DEV) {
          //   console.log("PostHog initialized in development mode");
          // }
          // Register framer mode as a super property
          try {
            ph.register({
              framer_mode: framer.mode,
            });
          } catch (e) {
            console.warn("Could not register framer mode:", e);
          }
        },
      });
    }
  }, [apiKey, apiHost]);

  if (!apiKey) {
    console.warn("PostHog API key not found. Analytics will not be tracked.");
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Re-export usePostHog from the official library
export { usePostHog } from "posthog-js/react";
