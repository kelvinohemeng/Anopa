import { framer, useIsAllowedTo } from "framer-plugin";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BackButton } from "../components/BackButton";
import {
  ANOPA_CONFIG_COMPONENT_URL,
  clearStoreConfig,
  hasStoreCredentials,
  isAnopaConfigComponent,
  isPublicStorefrontToken,
  normalizeShopifyDomain,
  saveStoreConfig,
  useStoreConfig,
} from "../config/storeConfig";

interface StoreDetailsFormProps {
  /**
   * True when rendered inline inside a managed-collection mode (Sync or
   * Configure) because store credentials are missing, rather than as the
   * standalone Manage page reached via canvas navigation. Hides navigation
   * and the canvas-insertion action, since neither applies in that context
   * — those modes don't have a canvas insertion point or a page to go back
   * to.
   */
  embedded?: boolean;
}

export default function StoreDetailsForm({
  embedded = false,
}: StoreDetailsFormProps) {
  const [, navigate] = useLocation();
  const { config, refresh } = useStoreConfig();

  const [storeUrl, setStoreUrl] = useState("");
  const [storeToken, setStoreToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configOnCanvas, setConfigOnCanvas] = useState<boolean | null>(null);
  const isAllowedToSetAttributes = useIsAllowedTo("setAttributes");
  const isAllowedToAddComponent = useIsAllowedTo("addComponentInstance");

  useEffect(() => {
    framer
      .getNodesWithType("ComponentInstanceNode")
      .then((nodes) => {
        const found = nodes.some(isAnopaConfigComponent);
        setConfigOnCanvas(found);
      })
      .catch(() => setConfigOnCanvas(false));
  }, []);

  useEffect(() => {
    setStoreUrl(config?.domain ?? "");
    setStoreToken(config?.publicStorefrontToken ?? "");
  }, [config]);

  const handleAddConfig = async () => {
    if (!isAllowedToAddComponent) {
      framer.notify(
        "You don't have permission to add components to this project.",
        { variant: "error" },
      );
      return;
    }
    setSyncing(true);
    try {
      await framer.addComponentInstance({
        url: ANOPA_CONFIG_COMPONENT_URL,
        attributes: {
          controls: {
            domain: config?.domain ?? "",
            token: config?.publicStorefrontToken ?? "",
            // Every user has full access — no premium tier to gate on.
            premiumStatus: true,
          },
        },
      });
      setConfigOnCanvas(true);
      if (hasStoreCredentials(config)) {
        framer.notify("Anopa Config added to the canvas", {
          variant: "success",
        });
      } else {
        framer.notify(
          "Anopa Config added. Save your Shopify store details above, then click Update Anopa Config to sync them.",
          { variant: "warning" },
        );
      }
    } catch (err: unknown) {
      console.error("[AddConfig]", err);
      framer.notify("Could not add Anopa Config. Please try again.", {
        variant: "error",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncConfig = async () => {
    if (!hasStoreCredentials(config)) {
      framer.notify(
        "Set up your Shopify store before updating the config component.",
        { variant: "warning" },
      );
      return;
    }
    if (!isAllowedToSetAttributes) {
      framer.notify(
        "You don't have permission to update components in this project.",
        { variant: "error" },
      );
      return;
    }
    setSyncing(true);
    try {
      const nodes = await framer.getNodesWithType("ComponentInstanceNode");
      const targets = nodes.filter(isAnopaConfigComponent);

      if (targets.length === 0) {
        setConfigOnCanvas(false);
        framer.notify(
          "Anopa Config isn't on the canvas anymore. Click Add Anopa Config to place it again.",
          { variant: "error" },
        );
        return;
      }

      await Promise.all(
        targets.map((node) =>
          node.setAttributes({
            controls: {
              domain: config.domain,
              token: config.publicStorefrontToken,
              // Every user has full access — no premium tier to gate on.
              premiumStatus: true,
            },
          }),
        ),
      );

      framer.notify(
        `✅ Synced ${targets.length} config component${targets.length > 1 ? "s" : ""}`,
        { variant: "success" },
      );
    } catch (err: unknown) {
      console.error("[SyncConfig]", err);
      framer.notify("❌ Failed to sync config.", { variant: "error" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (navigateOnSuccess: boolean = false) => {
    setLoading(true);

    try {
      const domain = normalizeShopifyDomain(storeUrl);
      const publicStorefrontToken = storeToken.trim();
      if (!domain || !isPublicStorefrontToken(publicStorefrontToken)) {
        framer.notify(
          "Enter a valid myshopify.com domain and public Storefront API token. Admin and private tokens are not accepted.",
          { variant: "error" },
        );
        return;
      }
      saveStoreConfig({
        version: 1,
        domain,
        publicStorefrontToken,
        customFields: config?.customFields ?? [],
        metafields: config?.metafields ?? [],
        syncImageAsGallery: config?.syncImageAsGallery ?? false,
      });
      refresh();
      setStoreUrl(domain);
      setSuccess(true);

      if (navigateOnSuccess) {
        framer.notify("Store info saved successfully!", { variant: "success" });
        setTimeout(() => {
          setSuccess(false);
          navigate("/");
        }, 1500);
      } else {
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch {
      framer.notify("Failed to save store info.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const nodes = await framer.getNodesWithType("ComponentInstanceNode");
      const targets = nodes.filter(isAnopaConfigComponent);
      if (targets.length > 0 && !isAllowedToSetAttributes) {
        framer.notify(
          "Framer did not allow canvas changes. Local store details were kept so you can retry disconnecting.",
          { variant: "error" },
        );
        return;
      }

      const results = await Promise.allSettled(
        targets.map((node) =>
          node.setAttributes({
            controls: { domain: "", token: "", premiumStatus: true },
          }),
        ),
      );
      const clearedCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      if (clearedCount !== targets.length) {
        framer.notify(
          `Cleared ${clearedCount} of ${targets.length} canvas config components. Local store details were kept so you can retry.`,
          { variant: "error" },
        );
        return;
      }

      clearStoreConfig();
      refresh();
      setStoreUrl("");
      setStoreToken("");

      framer.notify("Store disconnected", { variant: "success" });
    } catch {
      framer.notify(
        "Canvas credentials may be cleared, but local store details could not be cleared. Please retry.",
        { variant: "error" },
      );
    } finally {
      setLoading(false);
    }
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Embedded (Sync/Configure) has no "/" page to navigate back to — the
    // mode swaps back to its normal view on its own once config updates.
    handleSave(!embedded);
  };

  return (
    <div className="!space-y-3">
      {!embedded && <BackButton />}
      {!embedded && <hr />}
      <div className=" flex flex-col gap-6 space-y-3">
        <div className="!space-y-4">
          {hasStoreCredentials(config) ? (
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <div className="relative !w-[10px] !h-[10px] aspect-square rounded-full">
                  <div className="w-[105%] h-[105%] bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-[105%] h-[105%] bg-green-200 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-sm font-bold text-green-600">
                  Store Connected
                </h2>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <h2 className="text-md font-bold">Connect Shopify</h2>
              <p className="text-xs text-gray-500">
                {embedded
                  ? "Connect your Shopify store to continue."
                  : "Enter your public Storefront API details below. They stay in this plugin's local iframe storage."}
              </p>
            </div>
          )}
        </div>
        <form onSubmit={onManualSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 w-full">
            <label className="flex flex-col gap-2">
              <span className="framer-color-text-secondary">
                Shopify store domain
              </span>
              <input
                type="text"
                inputMode="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full"
                placeholder="your-store.myshopify.com"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="framer-color-text-secondary">
                Public Storefront API token
              </span>
              <input
                type="password"
                value={storeToken}
                onChange={(e) => setStoreToken(e.target.value)}
                className="w-full"
                autoComplete="off"
                required
              />
              <span className="text-[10px] text-amber-600">
                Use only a public Storefront API token. Never paste an Admin API
                token or another private credential here.
              </span>
            </label>
          </div>
          <div className="flex flex-col w-full gap-2">
            <button
              type="submit"
              disabled={loading}
              className="framer-color-text-primary framer-button-secondary hover:!bg-brand-primary/80 hover:!text-white"
            >
              {loading
                ? "Saving..."
                : config?.domain
                  ? "Update Store Info"
                  : "Save Store Info"}
            </button>
            {!embedded && (
              <button
                type="button"
                onClick={configOnCanvas ? handleSyncConfig : handleAddConfig}
                disabled={
                  syncing ||
                  loading ||
                  configOnCanvas === null ||
                  (configOnCanvas
                    ? !isAllowedToSetAttributes
                    : !isAllowedToAddComponent)
                }
                title={
                  configOnCanvas === null
                    ? "Checking canvas…"
                    : configOnCanvas
                      ? !isAllowedToSetAttributes
                        ? "You don't have permission to update components in this project."
                        : undefined
                      : !isAllowedToAddComponent
                        ? "You don't have permission to add components to this project."
                        : undefined
                }
                className="!bg-brand-primary !text-white hover:!bg-brand-primary/80 !h-fit disabled:opacity-50"
              >
                {configOnCanvas === null
                  ? "Checking canvas…"
                  : syncing
                    ? configOnCanvas
                      ? "Updating…"
                      : "Adding…"
                    : configOnCanvas
                      ? "Update Anopa Config"
                      : "Add Anopa Config"}
              </button>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="text-xs !bg-red-500 !text-white"
            >
              Disconnect
            </button>
          </div>
          {success && <p>✅ Info saved successfully!</p>}
        </form>
      </div>
    </div>
  );
}
