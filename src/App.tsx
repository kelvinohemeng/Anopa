import { framer } from "framer-plugin";
import { Router as WouterRouter, useLocation } from "wouter";
import "./App.css";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { PermissionsProvider } from "./components/PermissionContext";
import { PostHogProvider } from "./components/PostHogProvider";
import Router from "./Router/Router";
import { useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AnimatePresence, motion } from "framer-motion";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex } from "./utils/convexClient";

function PluginController() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  // Handle the Window Sizing once based on mode
  useEffect(() => {
    let width = 350;
    let height = 500;

    if (framer.mode === "configureManagedCollection") {
      width = 480;
      height = 700;
    } else if (framer.mode === "syncManagedCollection") {
      width = 500;
      height = 450;
    }

    framer.showUI({ width, height, resizable: false });
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  // Single AnimatePresence owns ALL page transitions.
  // Key is the location for authenticated pages, or "login"/"signup" for auth pages.
  const pageKey = !isAuthenticated
    ? location === "/signup"
      ? "signup"
      : "login"
    : "app";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
        {!isAuthenticated ? (
          location === "/signup" ? (
            <Signup />
          ) : (
            <Login />
          )
        ) : (
          <Router />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ConvexAuthProvider client={convex}>
      <PostHogProvider>
        <PermissionsProvider>
          <AuthProvider>
            <WouterRouter>
              <main className="main plugin-container !flex !items-center !justify-center w-full">
                <PluginController />
              </main>
            </WouterRouter>
          </AuthProvider>
        </PermissionsProvider>
      </PostHogProvider>
    </ConvexAuthProvider>
  );
}
