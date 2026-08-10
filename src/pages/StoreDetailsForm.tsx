import { framer, useIsAllowedTo } from "framer-plugin";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BackButton } from "../components/BackButton";
import {
  clearStoreConfig,
  hasStoreCredentials,
  isAnopaConfigComponent,
  isPublicStorefrontToken,
  normalizeShopifyDomain,
  saveStoreConfig,
  useStoreConfig,
} from "../config/storeConfig";

export default function StoreDetailsForm() {
  const [, navigate] = useLocation();
  const { config, refresh } = useStoreConfig();

  const [storeUrl, setStoreUrl] = useState("");
  const [storeToken, setStoreToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configOnCanvas, setConfigOnCanvas] = useState<boolean | null>(null);
  const isAllowedToSetAttributes = useIsAllowedTo("setAttributes");

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

  const handleSyncConfig = async () => {
    if (!hasStoreCredentials(config)) {
      framer.notify(
        "Set up your Shopify store before updating the config component.",
        { variant: "warning" },
      );
      return;
    }
    if (!isAllowedToSetAttributes) return;
    setSyncing(true);
    try {
      const nodes = await framer.getNodesWithType("ComponentInstanceNode");
      const targets = nodes.filter(isAnopaConfigComponent);

      if (targets.length === 0) {
        framer.notify("No Shopify Config component found on canvas.", {
          variant: "error",
        });
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
    handleSave(true);
  };

  return (
    <div className="!space-y-3">
      <BackButton />
      <hr />
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
                Enter your public Storefront API details below. They stay in
                this plugin's local iframe storage.
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
            <button
              type="button"
              onClick={handleSyncConfig}
              disabled={syncing || loading || configOnCanvas === false}
              className="framer-color-text-primary framer-button-secondary !h-fit disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Update Anopa Config"}
            </button>
            {configOnCanvas === false && (
              <p className="text-[10px] text-amber-500">
                Anopa Config component not found on canvas. Add it from the
                Components page first.
              </p>
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
