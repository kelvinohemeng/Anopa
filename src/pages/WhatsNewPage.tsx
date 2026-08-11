import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { framer } from "framer-plugin";
import { client } from "../SanityStuff/sanityClient";

const PLUGIN_DATA_KEY = "whatsNewDismissed";

interface Slide {
  imageUrl: string;
  caption?: string;
}

interface WhatsNewData {
  version: string;
  title: string;
  slides: Slide[];
}

async function fetchWhatsNew(): Promise<WhatsNewData | null> {
  return client.fetch(
    `*[_type == "whatsNew"] | order(_createdAt desc)[0] {
      version,
      title,
      "slides": slides[] {
        caption,
        "imageUrl": image.asset->url
      }
    }`,
  );
}

export default function WhatsNewPage() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<WhatsNewData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    fetchWhatsNew()
      .then((d) => {
        if (d) {
          setData(d);
          versionRef.current = d.version;
        }
      })
      .catch((err) => console.warn("WhatsNewPage: failed to load", err));

    // Dismiss on unmount — covers back button navigation. This just marks the
    // "what's new" banner as seen, so skip silently (no framer.notify) if the
    // permission isn't available rather than surfacing an error for it. A
    // fresh, synchronous check right here (rather than a hook value read
    // through a closure) confirms live permission state immediately before
    // the write, since this doesn't drive any UI.
    return () => {
      if (versionRef.current && framer.isAllowedTo("setPluginData")) {
        framer
          .setPluginData(PLUGIN_DATA_KEY, versionRef.current)
          .catch((err) =>
            console.error("[WhatsNewPage] Failed to save dismissal", err),
          );
      }
    };
  }, []);

  const prev = () =>
    setCurrentSlide((i) => (i === 0 ? (data?.slides.length ?? 1) - 1 : i - 1));

  const next = () =>
    setCurrentSlide((i) => (i === (data?.slides.length ?? 1) - 1 ? 0 : i + 1));

  const handleDone = () => navigate("/");

  const slide = data?.slides[currentSlide];

  return (
    <div className="flex flex-col !h-full !min-h-full items-start">
      {/* Back / header */}
      <button onClick={handleDone} className="!px-0 text-sm !bg-transparent">
        ← Back
      </button>

      {/* Scrollable content */}
      <div className="flex-1 w-full flex flex-col gap-4 !pt-4 overflow-y-auto scrollbar-hidden">
        {!data ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="framer-spinner" />
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="flex flex-col gap-1">
              <h2 className="text-[20px] font-bold framer-color-text leading-tight">
                {data.title}
              </h2>
              <p className="text-[12px] framer-color-text-secondary">
                Version {data.version}
              </p>
            </div>

            {/* Slide image */}
            {slide && (
              <div className="relative w-full aspect-video framer-color-bg-secondary rounded-xl overflow-hidden">
                <img
                  src={slide.imageUrl}
                  alt={slide.caption || `Slide ${currentSlide + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Prev / Next arrows */}
                {data.slides.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 !w-7 !h-7 !p-0 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
                      aria-label="Previous"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-2 top-1/2 -translate-y-1/2 !w-7 !h-7 !p-0 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
                      aria-label="Next"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Caption */}
            {slide?.caption && (
              <p className="text-[11px] framer-color-text-secondary text-center">
                {slide.caption}
              </p>
            )}

            {/* Dot indicators */}
            {data.slides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {data.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`!p-0 !m-0 rounded-full transition-all ${
                      i === currentSlide
                        ? "!w-4 !h-1.5 bg-brand-primary"
                        : "!w-1.5 !h-1.5 bg-black/20 dark:bg-white/20"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="w-full flex flex-col gap-2 !pt-3 border-t border-black/10 dark:border-white/10">
        <button
          onClick={handleDone}
          className="!w-full !bg-brand-primary !text-white !text-[13px] font-semibold"
        >
          Got it →
        </button>
      </div>
    </div>
  );
}
