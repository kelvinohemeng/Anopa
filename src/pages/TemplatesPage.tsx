// TemplatesPage.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BackButton } from "../components/BackButton";
import { client, urlFor } from "../SanityStuff/sanityClient";

type SanityImageValue = {
  asset: { _ref: string };
  alt?: string;
};

type SanityTemplateDoc = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  isPublished?: boolean;
  description?: string;
  previewUrl?: string;
  templateUrl?: string;
  body?: unknown;
  mainImage?: SanityImageValue;
  gallery?: Array<{ image?: SanityImageValue; caption?: string }>;
  templateCategory?: string[];
  publishedAt?: string;
};

type UITemplate = {
  key: string;
  title: string;
  body?: unknown;
  description?: string;
  previewUrl: string;
  templateUrl: string;
  image: string;
  category: string[];
  published: boolean;
  gallery?: { src: string; caption?: string }[];
};

async function loadTemplates(): Promise<SanityTemplateDoc[]> {
  const query = `*[_type == "template"]{
    _id,
    title,
    slug,
    isPublished,
    description,
    body,
    previewUrl,
    templateUrl,
    mainImage,
    "gallery": gallery[]{ "image": image, "caption": caption },
    "templateCategory": templateCategory[]->title,
    publishedAt
  }`;
  return await client.fetch(query);
}

export default function TemplatesPage() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<UITemplate[]>([]);

  // category from URL like /templates/landing
  const categoryFromPath = location.split("/")[2] || "all";

  // dev toggle: set true to bypass category filtering while testing
  const showAll = false;

  // keyboard shortcuts: cmd/ctrl+f to focus search, esc to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // fetch + map
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const docs = await loadTemplates();
        if (!mounted) return;

        if (!Array.isArray(docs)) {
          throw new Error(
            "Sanity returned non-array. Check your query or dataset."
          );
        }

        const mapped: UITemplate[] = docs.map((doc) => {
          // urls
          const previewUrl = doc.previewUrl || "";
          const templateUrl = doc.templateUrl || "";

          // image resolution
          let image = "";
          if (doc.mainImage) {
            try {
              image = urlFor(doc.mainImage).width(1200).url();
            } catch (err) {
              console.warn(
                `[TemplatesPage] Failed to build Sanity image URL for "${doc.title || doc._id}"`,
                err,
              );
              image = "/templates/placeholder.svg";
            }
          } else {
            image = "/templates/placeholder.svg";
          }

          // pick primary category title (projected from GROQ)
          const rawCategory = doc.templateCategory;
          const category = Array.isArray(rawCategory) ? rawCategory : [];

          // published gate: require templateUrl to be present to be actionable
          const hasUrl = !!templateUrl;
          const published = hasUrl
            ? typeof doc.isPublished === "boolean"
              ? doc.isPublished
              : true
            : false;

          return {
            key: doc._id,
            title: doc.title || "Untitled",
            description: doc.description,
            body: doc.body,
            previewUrl,
            templateUrl,
            image,
            category,
            published,
          };
        });

        // sort alphabetically by title (case-insensitive)
        mapped.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );

        if (mounted) setTemplates(mapped);
      } catch (err: unknown) {
        console.error("[TemplatesPage] fetch error:", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load templates",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // helper normalize
  const norm = (s?: string) => (s || "").toString().trim().toLowerCase();

  // apply published filter + search
  const filteredTemplates = templates.filter((t) => {
    if (!t.published && !showAll) return false;

    const q = norm(searchQuery);
    if (!q) return true;

    return (
      norm(t.title).includes(q) ||
      (t.description ? norm(t.description).includes(q) : false)
    );
  });

  return (
    <div className="relative h-full max-h-[100%] !space-y-3 overflow-y-auto scrollbar-hidden">
      <BackButton overrideTo="/" />

      <div className="p-4 !space-y-2">
        <div className="flex gap-3 items-center">
          <h2 className="text-lg font-semibold">Templates</h2>
        </div>

        <div className="relative mt-2">
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading && <p className="text-sm mt-2">Loading templates…</p>}
        {error && <p className="text-sm mt-2 text-red-500">Error: {error}</p>}

        <div className="mt-2 text-[10px] framer-color-text-tertiary">
          Showing {filteredTemplates.length} of{" "}
          {templates.filter((t) => t.published).length} templates
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4">
        {filteredTemplates.length === 0 && !loading ? (
          <div className="col-span-full text-center text-sm text-gray-500 py-8">
            No templates found for "{searchQuery || categoryFromPath}"
          </div>
        ) : null}

        {filteredTemplates.map((t) => (
          <div
            key={t.key}
            className={
              "w-full bg-[#FAFAFA] rounded-lg border border-gray-200 overflow-hidden transition-shadow duration-200 flex flex-col gap-2" +
              (!t.published ? "opacity-60 pointer-events-none" : "")
            }
            // aria-disabled={!t.published}
          >
            <div className="aspect-video bg-gray-100 overflow-hidden">
              <img
                src={t.image}
                alt={t.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2 !p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-[16px] text-black truncate">
                  {t.title}
                </h3>
                <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                  {t.category?.map((c) => (
                    <span
                      key={c}
                      className="!px-1.5 !py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] framer-color-text-tertiary">
                  {t.description}
                </p>
              </div>

              <div className="flex gap-2 !mt-2">
                <button
                  onClick={() =>
                    t.previewUrl &&
                    window.open(t.previewUrl, "_blank", "noopener,noreferrer")
                  }
                  className="flex-1 px-3 py-1.5 text-xs !bg-gray-100 hover:!bg-gray-200 !text-gray-600 !border !border-gray-200"
                >
                  Preview
                </button>

                <button
                  onClick={() =>
                    t.templateUrl &&
                    window.open(
                      t.templateUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className={`flex-1  !px-2 framer-color-text-primary  framer-button-secondary hover:!bg-brand-primary/80 !h-fit hover:!text-white`}
                >
                  Use Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
