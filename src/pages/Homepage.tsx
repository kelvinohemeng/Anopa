import { useLocation } from "wouter";
import { framer, useIsAllowedTo } from "framer-plugin";
import { useEffect } from "react";
import { client } from "../SanityStuff/sanityClient";
import { hasStoreCredentials, useStoreConfig } from "../config/storeConfig";

const pages = [
  { id: "/components", label: "Components" }, // Fixed typo in "Components"
  { id: "/templates", label: "Templates" },
  { id: "/learn", label: "Learn" },
  { id: "/help", label: "Help" },
];

export default function HomePage() {
  const isAllowedToAddComponent = useIsAllowedTo("addComponentInstance");
  const [, navigate] = useLocation();
  const { config } = useStoreConfig();

  // Navigate to What's New page if a new version exists
  useEffect(() => {
    (async () => {
      try {
        const [whatsNew, dismissed] = await Promise.all([
          client.fetch(
            `*[_type == "whatsNew"] | order(_createdAt desc)[0] { version }`,
          ),
          framer.getPluginData("whatsNewDismissed"),
        ]);
        if (whatsNew?.version && dismissed !== whatsNew.version) {
          navigate("/whats-new");
        }
      } catch (err) {
        console.warn("Homepage: failed to check for a new What's New post", err);
      }
    })();
  }, [navigate]);

  return (
    <div className="flex flex-col gap-3 !min-h-full">
      {/* hero-section */}
      <div className="min-h-[210px]  h-full flex flex-col justify-between bg-gradient-to-b from-1% via-40% to-80% from-brand-primary/50 rounded-xl">
        <div className="!p-5 !text-white !space-y-2">
          <div className="ap-logo !w-[80px] !h-[40px]"></div>
        </div>
        {/* Store Connection Status */}
        <div className="absoulute inset-0 !p-1">
          <div className="!w-full h-full !flex !justify-between !p-3 !rounded-xl framer-color-bg border-2 border-brand-primary/10">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center justify-between !w-full ">
                <div className="flex gap-2 w-full items-center">
                  <div className="relative !w-[10px] !h-[10px] aspect-square rounded-full ">
                    <div className="w-[105%] h-[105%] bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-[105%] h-[105%] bg-green-200 rounded-full animate-ping"></div>
                  </div>
                  <p className="font-medium text-[14px]">
                    {hasStoreCredentials(config)
                      ? "Store Connected"
                      : "Connect Your Store"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full">
                <button
                  className=" flex-1 !p-1 !px-2 framer-color-text-primary  framer-button-secondary hover:!bg-brand-primary/80 !h-fit hover:!text-white"
                  onClick={() => navigate("/manage")}
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr />

      {/* Navigation Pages */}
      <div className="w-full h-full grid grid-cols-2 gap-2 relative z-10">
        {pages.map((page) => (
          <button
            className=" page-nav !p-2 !w-full !h-full flex items-center gap-1"
            key={page.id}
            onClick={() => navigate(page.id)}
            // disabled={page.label === "Templates"}
          >
            <div>
              <div className="w-[32px] h-[32px] aspect-square bg-brand-primary rounded-md grid place-items-center">
                {page.label === "Components" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="#ffffff"
                    viewBox="0 0 256 256"
                  >
                    <path d="M82.34,69.66a8,8,0,0,1,0-11.32l40-40a8,8,0,0,1,11.32,0l40,40a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32,0Zm51.32,76.68a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0,0-11.32Zm104-24-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,237.66,122.34Zm-128,0-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,109.66,122.34Z"></path>
                  </svg>
                ) : page.label === "Templates" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="#ffffff"
                    viewBox="0 0 256 256"
                  >
                    <path d="M224,104v96a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V104A16,16,0,0,1,48,88H208A16,16,0,0,1,224,104ZM56,72H200a8,8,0,0,0,0-16H56a8,8,0,0,0,0,16ZM72,40H184a8,8,0,0,0,0-16H72a8,8,0,0,0,0,16Z"></path>
                  </svg>
                ) : page.label === "Learn" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="#ffffff"
                    viewBox="0 0 256 256"
                  >
                    <path d="M216,32V192a8,8,0,0,1-8,8H72a16,16,0,0,0-16,16H192a8,8,0,0,1,0,16H48a8,8,0,0,1-8-8V56A32,32,0,0,1,72,24H208A8,8,0,0,1,216,32Z"></path>
                  </svg>
                ) : page.label === "Help" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="#ffffff"
                    viewBox="0 0 256 256"
                  >
                    <path d="M108,84a16,16,0,1,1,16,16A16,16,0,0,1,108,84Zm128,44A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Zm-72,36.68V132a20,20,0,0,0-20-20,12,12,0,0,0-4,23.32V168a20,20,0,0,0,20,20,12,12,0,0,0,4-23.32Z"></path>
                  </svg>
                ) : null}
              </div>
            </div>
            <div className="flex items-center w-full !p-1">
              <p className=" !text-xs">{page.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Permission Warning */}
      {!isAllowedToAddComponent && (
        <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          <p>You don't have permission to add components to this project.</p>
        </div>
      )}
    </div>
  );
}
