import { framer } from "framer-plugin";
import { Router as WouterRouter, useLocation } from "wouter";
import "./App.css";
import { PermissionsProvider } from "./components/PermissionContext";
import Router from "./Router/Router";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hasStoreCredentials, useStoreConfig } from "./config/storeConfig";

function PluginController() {
  const { config } = useStoreConfig();
  const [location, navigate] = useLocation();
  const startupRouteSelected = useRef(false);

  // Handle the Window Sizing once based on mode
  useEffect(() => {
    if (framer.mode !== "canvas") {
      framer.showUI({ width: 480, height: 700, resizable: false });
    }
  }, [framer.mode]);

  useEffect(() => {
    if (startupRouteSelected.current || framer.mode !== "canvas") return;
    startupRouteSelected.current = true;
    navigate(hasStoreCredentials(config) ? "/" : "/manage", {
      replace: true,
    });
  }, [config, navigate]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
        <Router />
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <PermissionsProvider>
      <WouterRouter>
        <main className="main plugin-container !flex !items-center !justify-center w-full">
          <PluginController />
        </main>
      </WouterRouter>
    </PermissionsProvider>
  );
}
