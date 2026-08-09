import { usePostHog } from "@posthog/react";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Custom hook to automatically track page views when route changes
 */
export function usePageTracking() {
  const [location] = useLocation();
  const posthog = usePostHog();

  useEffect(() => {
    // Track page view whenever location changes
    if (posthog) {
      posthog.capture("$pageview", {
        $current_url: location,
      });
    }
  }, [location, posthog]);
}
