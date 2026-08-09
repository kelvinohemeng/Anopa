import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { client } from "../SanityStuff/sanityClient";

interface LearnItem {
  _id: string;
  title: string;
  description?: string;
  url: string;
  type: "youtube" | "article";
  thumbnailUrl?: string;
}

async function fetchLearnItems(): Promise<LearnItem[]> {
  return client.fetch(
    `*[_type == "learnItem"] | order(order asc, _createdAt desc) {
      _id,
      title,
      description,
      url,
      type,
      "thumbnailUrl": thumbnail.asset->url
    }`,
  );
}

const YoutubeIcon = () => (
  <svg viewBox="0 0 256 256" className="!w-3 !h-3 fill-current">
    <path d="M234.33,69.52a24.08,24.08,0,0,0-14.49-16.4C185.56,40,128,40,128,40S70.44,40,36.16,53.12A24.08,24.08,0,0,0,21.67,69.52,251.12,251.12,0,0,0,16,128a251.12,251.12,0,0,0,5.67,58.48,24.08,24.08,0,0,0,14.49,16.4C70.44,216,128,216,128,216s57.56,0,91.84-13.12a24.08,24.08,0,0,0,14.49-16.4A251.12,251.12,0,0,0,240,128,251.12,251.12,0,0,0,234.33,69.52Zm-108.6,96V90.48L168,128Z" />
  </svg>
);

const ArticleIcon = () => (
  <svg viewBox="0 0 256 256" className="!w-3 !h-3 fill-current">
    <path d="M216,32H40A16,16,0,0,0,24,48V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V48A16,16,0,0,0,216,32ZM80,176H72a8,8,0,0,1,0-16h8a8,8,0,0,1,0,16Zm0-32H72a8,8,0,0,1,0-16h8a8,8,0,0,1,0,16Zm0-32H72a8,8,0,0,1,0-16h8a8,8,0,0,1,0,16Zm104,64H104a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Zm0-32H104a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Zm0-32H104a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Z" />
  </svg>
);

export default function LearnPage() {
  const [items, setItems] = useState<LearnItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearnItems()
      .then(setItems)
      .catch((err) => console.warn("LearnPage: failed to load", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col !min-h-full items-start">
      <BackButton overrideTo="/" />

      <div className="flex-1 w-full grid grid-cols-2 gap-3 !pt-3 overflow-y-auto scrollbar-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="framer-spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12px] framer-color-text-secondary">
              No content yet — check back soon.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item._id}
              onClick={() => window.open(item.url, "_blank")}
              className="!p-0 !m-0 !bg-transparent flex flex-col !border-0 text-left w-full overflow-hidden framer-color-bg-secondary hover:brightness-95 transition-all"
            >
              {item.thumbnailUrl && (
                <div className="w-full aspect-video overflow-hidden rounded-xl">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="!pt-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex items-center gap-1 !px-1.5 !py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                      item.type === "youtube"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {item.type === "youtube" ? (
                      <YoutubeIcon />
                    ) : (
                      <ArticleIcon />
                    )}
                    {item.type === "youtube" ? "YouTube" : "Article"}
                  </span>
                </div>
                <p className="text-[12px] font-semibold framer-color-text leading-snug">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-[11px] framer-color-text-secondary leading-snug line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
