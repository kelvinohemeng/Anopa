import { framer, useIsAllowedTo } from "framer-plugin";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";
import { BackButton } from "../components/BackButton";

export default function StoreDetailsForm() {
  const [, navigate] = useLocation();
  const { appUser, refreshAppUser } = useAuth();

  const updateStore = useMutation(api.users.updateStore);
  const disconnectStore = useMutation(api.users.disconnectStore);

  const [storeUrl, setStoreUrl] = useState("");
  const [storeToken, setStoreToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configOnCanvas, setConfigOnCanvas] = useState<boolean | null>(null);
  const isAllowedToSetAttributes = useIsAllowedTo("setAttributes");

  useEffect(() => {
    framer.getNodesWithType("ComponentInstanceNode").then((nodes) => {
      const found = nodes.some(
        (n) => "domain" in n.controls && "token" in n.controls,
      );
      setConfigOnCanvas(found);
    });
  }, []);

  const handleSyncConfig = async () => {
    if (!appUser || !isAllowedToSetAttributes) return;
    setSyncing(true);
    try {
      const nodes = await framer.getNodesWithType("ComponentInstanceNode");
      const targets = nodes.filter(
        (n) => "domain" in n.controls && "token" in n.controls,
      );

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
              domain: appUser.shopify_domain ?? "",
              token: appUser.shopify_storefront_token ?? "",
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

  // Track initialization to prevent overwriting user input during auto-save
  const initialized = useRef(false);

  // Initialize form with appUser data only once
  useEffect(() => {
    if (appUser && !initialized.current) {
      setStoreUrl(appUser.shopify_domain ?? "");
      setStoreToken(appUser.shopify_storefront_token ?? "");
      initialized.current = true;
    }
  }, [appUser]);

  const handleSave = async (navigateOnSuccess: boolean = false) => {
    setLoading(true);

    try {
      await updateStore({
        shopify_domain: storeUrl,
        shopify_storefront_token: storeToken,
      });

      refreshAppUser();
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
    } catch (error) {
      console.error("Failed to save store info:", error);
      framer.notify("Failed to save store info.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!initialized.current) return;

    const savedUrl = appUser?.shopify_domain ?? "";
    const savedToken = appUser?.shopify_storefront_token ?? "";

    if (storeUrl === savedUrl && storeToken === savedToken) return;

    const timer = setTimeout(() => {
      handleSave(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [storeUrl, storeToken, appUser]);

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectStore();
      refreshAppUser();

      setStoreUrl("");
      setStoreToken("");

      if (isAllowedToSetAttributes) {
        const nodes = await framer.getNodesWithType("ComponentInstanceNode");
        const targets = nodes.filter(
          (n) => "domain" in n.controls && "token" in n.controls,
        );
        await Promise.all(
          targets.map((node) =>
            node.setAttributes({
              controls: { domain: "", token: "", premiumStatus: true },
            }),
          ),
        );
      }

      framer.notify("Store disconnected", { variant: "success" });
    } catch (error) {
      console.error("Disconnect error:", error);
      framer.notify("Failed to disconnect", { variant: "error" });
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
          {appUser?.shopify_domain && appUser?.shopify_storefront_token ? (
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
                Enter your Storefront API details below.
              </p>
            </div>
          )}
        </div>
        <form onSubmit={onManualSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 w-full">
            <label className="flex flex-col gap-2">
              <span className="framer-color-text-secondary">
                Storefront URL:
              </span>
              <input
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full"
                placeholder="https://your-store.myshopify.com"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="framer-color-text-secondary">
                Storefront Token:
              </span>
              <input
                type="text"
                value={storeToken}
                onChange={(e) => setStoreToken(e.target.value)}
                className="w-full"
              />
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
                : appUser?.shopify_domain
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
