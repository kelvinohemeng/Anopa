import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

if (!convexUrl) {
  console.error("Missing VITE_CONVEX_URL — run `npx convex dev` to get your deployment URL");
}

export const convex = new ConvexReactClient(convexUrl ?? "");
