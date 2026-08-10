import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { framer } from "framer-plugin";

// Import your modes
import ConfigurationMode from "../modes/ConfigurationMode";
import SyncMode from "../modes/SyncMode";
import CanvasMode from "../modes/CanvasMode";
// Import your other pages

export default function Router() {
  const [, navigate] = useLocation();

  useEffect(() => {
    framer.setMenu([
      {
        label: "Manage Store",
        onAction: () => navigate("/manage"),
      },
    ]);
  }, [navigate]);

  return (
    <Switch>
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
