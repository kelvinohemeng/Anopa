import { useEffect } from "react";
import { useLocation, Switch, Route } from "wouter";
import { framer } from "framer-plugin";
import { useAuth } from "../components/AuthContext";

// Import your modes
import ConfigurationMode from "../modes/ConfigurationMode";
import SyncMode from "../modes/SyncMode";
import CanvasMode from "../modes/CanvasMode";
// Import your other pages
import MyAccount from "../pages/MyAccount";

export default function Router() {
  const [, navigate] = useLocation();
  const { signOut, isAuthenticated } = useAuth();

  // Setup the Framer Menu globally
  useEffect(() => {
    framer.setMenu([
      {
        label: "My Account",
        onAction: () => navigate("/my-account"),
        enabled: isAuthenticated,
      },
      {
        label: "Sign Out",
        onAction: () => signOut(),
        enabled: isAuthenticated,
      },
    ]);
  }, [isAuthenticated, signOut, navigate]);

  return (
    <Switch>
      {/* 1. EXPOSED PAGES: These work regardless of Framer Mode */}
      <Route path="/my-account">
        <MyAccount />
      </Route>

      {/* 2. Catch-all: shows the correct mode based on Framer state.
          Must be last so /my-account matches first. */}
      <Route>
        {() => {
          if (framer.mode === "configureManagedCollection")
            return <ConfigurationMode />;
          if (framer.mode === "syncManagedCollection") return <SyncMode />;
          return <CanvasMode />;
        }}
      </Route>
    </Switch>
  );
}
