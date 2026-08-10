import { useEffect, useRef, useState } from "react";
import { Draggable, framer, useIsAllowedTo } from "framer-plugin";
import { useLocation } from "wouter";
import Nav from "../components/ComponentNav";
import { BackButton } from "../components/BackButton";
import { client, urlFor } from "../SanityStuff/sanityClient";
import { ANOPA_CONFIG_COMPONENT_KEY, hasStoreCredentials, useStoreConfig } from "../config/storeConfig";

interface SanityComponentDoc {
  _id: string;
  title?: string;
  slug?: { current?: string };
  isPublished?: boolean;
  description?: string;
  componentUrl?: string;
  mainImage?: Parameters<typeof urlFor>[0];
  imageUrl?: string;
  componentCategory?: string[];
  publishedAt?: string;
  status?: "none" | "new" | "deprecated";
}

interface UIComponent {
  key: string;
  title: string;
  description?: string;
  url: string;
  image: string;
  category: string;
  published: boolean;
  status?: "none" | "new" | "deprecated";
}

async function loadTemplate(): Promise<SanityComponentDoc[]> {
  const query = `*[_type == "component"]{
    _id,
    title,
    slug,
    isPublished,
    description,
    componentUrl,
    mainImage,
    "imageUrl": imageUrl,
    "componentCategory": componentCategory[]->title,
    publishedAt,
    status
  } | order(publishedAt desc)`;
  return await client.fetch(query);
}

export default function ComponentsPage() {
  const isAllowedToAdd = useIsAllowedTo("addComponentInstance");
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [components, setComponents] = useState<UIComponent[]>([]);

  const categoryFromPath = location.split("/")[2] || "product";

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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    // console.log("[ComponentsPage] useEffect start");

    (async () => {
      try {
        const docs = await loadTemplate();
        // console.log("[ComponentsPage] docs fetched:", docs);
        if (!mounted) {
          // console.log("[ComponentsPage] component unmounted before mapping");
          return;
        }

        if (!Array.isArray(docs)) {
          throw new Error(
            "Sanity returned non-array. Check your query or dataset.",
          );
        }

        const mapped: UIComponent[] = docs.map((doc) => {
          const framerUrl = doc.componentUrl || "";

          let image = "";
          if (doc.mainImage) {
            try {
              image = urlFor(doc.mainImage).width(800).url();
            } catch {
              image = "";
            }
          } else if (doc.imageUrl) {
            image = doc.imageUrl;
          } else {
            image = "/components/placeholder.png";
          }

          const category =
            (doc.componentCategory && doc.componentCategory[0]) || "product";

          // If url is missing, mark as unpublished so the UI renders it disabled
          const hasUrl = !!framerUrl;
          const published = hasUrl
            ? typeof doc.isPublished === "boolean"
              ? doc.isPublished
              : true
            : false;

          return {
            key: doc._id,
            title: doc.title || "Untitled",
            description: doc.description,
            url: framerUrl,
            image,
            category,
            published,
            status: doc.status || "none",
          };
        });
        // COMMENT OUT the filter if you want to see items without url
        // .filter((c) => c.url);

        // console.log("[ComponentsPage] mapped components:", mapped);
        setComponents(mapped.sort((a, b) => a.title.localeCompare(b.title)));
      } catch (err: unknown) {
        console.error("[ComponentsPage] fetch/mapping error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // dev toggle: set to true to bypass category filtering
  const showAll = false;

  // helper: safe normalize
  const norm = (s?: string) => (s || "").toString().trim().toLowerCase();

  const filtered = components.filter((c) => {
    if (showAll) return true;

    const pathCat = norm(categoryFromPath); // from URL
    if (!pathCat || pathCat === "all") return true;

    // collect component categories into a normalized array
    const compCats = [norm(c.category)].filter(Boolean);

    // if no compCats, fallback to component.category
    if (compCats.length === 0) compCats.push(norm(c.category));

    // match if any comp category equals the path category or includes it
    const match = compCats.some(
      (cc: string) =>
        cc === pathCat || cc.includes(pathCat) || pathCat.includes(cc),
    );

    // search match unchanged
    const searchMatch =
      searchQuery === "" ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description &&
        c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return match && searchMatch;
  });

  const resultsCount = filtered.length;
  const totalCount = components.filter(
    (comp) => comp.category === categoryFromPath,
  ).length;

  return (
    <div className="relative !h-full !max-h-[100%] !space-y-3 !overflow-y-auto scrollbar-hidden">
      <BackButton overrideTo="/" />
      <div className="sticky top-0 framer-color-bg !z-50 !py-2">
        <Nav />
      </div>

      <div className="p-4 !space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search components..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            ref={searchInputRef}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {loading && (
          <p className="mt-2 text-[10px] framer-color-text-tertiary">
            Loading components…
          </p>
        )}
        {error && (
          <p className="mt-2 text-[10px] framer-color-text-tertiary text-red-500">
            Error: {error}
          </p>
        )}

        {searchQuery && (
          <p className="mt-2 text-[10px] framer-color-text-tertiary">
            Found {resultsCount} of {totalCount} components
            {resultsCount === 0 && (
              <span className="block mt-1 text-red-500">
                No components match your search
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 h-full p-4">
        {filtered.map((component) => (
          <ComponentInsert
            key={component.key}
            url={component.url}
            image={component.image}
            componentKey={component.key}
            title={component.title}
            published={component.published}
            status={component.status}
            isAllowedToAdd={isAllowedToAdd}
          />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-2 text-start text-sm framer-color-text-primary">
            No components found for category "{categoryFromPath}"
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  url: string;
  image: string;
  attributes?: Record<string, unknown>;
  componentKey?: string;
  published?: boolean;
  status?: "none" | "new" | "deprecated";
  title?: string;
  isAllowedToAdd: boolean;
}

export const ComponentInsert = ({
  url,
  image,
  attributes,
  componentKey,
  published,
  status,
  title = "component",
  isAllowedToAdd,
}: Props) => {
  const { config } = useStoreConfig();

  // Auto-populate attributes for the Shopify Context Config component.
  // Every local user gets full access — no tier or account checks here.
  const getAttributes = () => {
    if (
      componentKey === ANOPA_CONFIG_COMPONENT_KEY &&
      hasStoreCredentials(config)
    ) {
      return {
        domain: config.domain,
        token: config.publicStorefrontToken,
        premiumStatus: true,
      };
    }
    return attributes;
  };

  const finalAttributes = getAttributes();
  const canInsert = !!published && isAllowedToAdd;
  const insertComponent = async () => {
    if (!published) return;
    if (!isAllowedToAdd) {
      framer.notify(
        "You don't have permission to add components to this project.",
        { variant: "error" },
      );
      return;
    }
    try {
      await framer.addComponentInstance({
        url,
        attributes: { controls: finalAttributes },
      });
      if (componentKey === ANOPA_CONFIG_COMPONENT_KEY && !hasStoreCredentials(config)) {
        framer.notify("Component added without store details. Open Manage to set up Shopify, then update the config component.", { variant: "warning" });
      } else {
        framer.notify(`${title} added`, { variant: "success" });
      }
    } catch {
      framer.notify(`Could not add ${title}. Please try again.`, { variant: "error" });
    }
  };

  return (
    <div
      className={
        "w-full !p-0 m-0 !bg-transparent !rounded-lg cursor-pointer transform hover:!transition-transform duration-300 hover:!ease-out hover:-translate-y-1 select-none" +
        (!canInsert ? " opacity-20 " : "")
      }
      onClick={() => void insertComponent()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void insertComponent();
        }
      }}
      role="button"
      tabIndex={canInsert ? 0 : -1}
      aria-label={
        canInsert
          ? `Add ${title}`
          : !published
            ? `${title} is unavailable`
            : `You don't have permission to add ${title}`
      }
      aria-disabled={!canInsert}
    >
      <div className="relative">
        {status && status !== "none" && (
          <div
            className={`absolute top-2 right-2 z-10 !px-1 rounded-full !text-[9px] font-bold uppercase tracking-wider shadow-sm ${
              status === "new"
                ? "bg-green-200 text-green-600 border border-green-500"
                : "bg-red-200 text-red-600 border border-red-500"
            }`}
          >
            {status}
          </div>
        )}
        {canInsert ? (
          <Draggable
            data={{
              type: "componentInstance",
              previewImage: image,
              url,
              attributes: { controls: finalAttributes },
            }}
            onDragComplete={(result) => {
              if (result.status === "error") {
                framer.notify(`Could not add ${title}. Please try again.`, {
                  variant: "error",
                });
              }
            }}
          >
            <img
              src={image}
              draggable={false}
              className="!w-full !h-auto object-cover rounded-md"
              alt={`Preview of ${title}`}
            />
          </Draggable>
        ) : (
          <img
            src={image}
            draggable={false}
            className="!w-full !h-auto object-cover rounded-md"
            alt={`${title} is not published`}
          />
        )}
      </div>
    </div>
  );
};
