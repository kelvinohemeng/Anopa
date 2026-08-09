import { framer, type ProtectedMethod } from "framer-plugin";
import React, { createContext, useContext, useEffect, useState } from "react";

// Define permission groups relevant to configure and sync modes
export const SYNC_PERMISSIONS = [
  "ManagedCollection.addItems",
  "ManagedCollection.removeItems",
  "ManagedCollection.setPluginData",
  "setPluginData",
  "ManagedCollection.setFields",
] as const satisfies ProtectedMethod[];

export const CONFIGURE_PERMISSIONS = [
  "ManagedCollection.setPluginData",
  "setPluginData",
  "ManagedCollection.setFields",
] as const satisfies ProtectedMethod[];

export const CANVAS_PERMISSIONS = [
  "addComponentInstance",
] as const satisfies ProtectedMethod[];

// Simple context with just what we need
interface PermissionsContextType {
  // Can the user perform sync operations?
  canSync: boolean;
  // Can the user configure the plugin?
  canConfigure: boolean;
  // Can the user interact with Canvas?
  canInteractWithCanvas: boolean;
  // Is the system still checking permissions?
  loading: boolean;
  // Helper for button titles
  getPermissionTitle: (hasPermission: boolean) => string | undefined;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [canSync, setCanSync] = useState(false);
  const [canConfigure, setCanConfigure] = useState(false);
  const [canInteractWithCanvas, setCanInteractWithCanvas] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        // Check sync permissions
        const syncPermissionResult = await framer.isAllowedTo(
          ...SYNC_PERMISSIONS
        );
        setCanSync(syncPermissionResult);

        // Check configure permissions
        const configurePermissionResult = await framer.isAllowedTo(
          ...CONFIGURE_PERMISSIONS
        );
        setCanConfigure(configurePermissionResult);

        // Check canvas permissions
        const canvasPermissionResult = await framer.isAllowedTo(
          ...CANVAS_PERMISSIONS
        );
        setCanInteractWithCanvas(canvasPermissionResult);
      } catch (error) {
        console.error("Error checking permissions:", error);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, []);

  // Helper function for button titles
  const getPermissionTitle = (hasPermission: boolean): string | undefined => {
    return hasPermission ? undefined : "Insufficient permissions";
  };

  return (
    <PermissionsContext.Provider
      value={{
        canSync,
        canConfigure,
        canInteractWithCanvas,
        loading,
        getPermissionTitle,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

// Custom hook to use permissions
export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

// Utility function to check if we're in sync mode
export function isSyncMode(): boolean {
  return framer.mode === "syncManagedCollection";
}

// Utility function to check if we're in configure mode
export function isConfigureMode(): boolean {
  return framer.mode === "configureManagedCollection";
}
