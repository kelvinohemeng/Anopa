import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

// Use import.meta.env for Vite — only variables prefixed with VITE_ are exposed
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || "4a19ug9y";
const dataset = import.meta.env.VITE_SANITY_DATASET || "production";

export const client = createClient({
  projectId,
  dataset,
  apiVersion: "2025-10-01", // pick a stable API version date
  useCdn: true, // use Sanity CDN for read-only queries
});

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}
