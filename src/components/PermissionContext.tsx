import { framer, type ProtectedMethod } from "framer-plugin";
import React, { createContext, useContext, useEffect, useState } from "react";

// Define permission groups relevant to configure and sync modes
// Kept beside the provider so sync error messages use the exact checked list.
// eslint-disable-next-line react-refresh/only-export-components
export const SYNC_PERMISSIONS = [
  "ManagedCollection.addItems",
  "ManagedCollection.removeItems",
  "ManagedCollection.setPluginData",
  "setPluginData",
  "ManagedCollection.setFields",
] as const satisfies ProtectedMethod[];

const CONFIGURE_PERMISSIONS = [
  "ManagedCollection.setPluginData",
  "setPluginData",
  "ManagedCollection.setFields",
] as const satisfies ProtectedMethod[];

// Simple context with just what we need
interface PermissionsContextType {
  // Can the user perform sync operations?
  canSync: boolean;
  // Can the user configure the plugin?
  canConfigure: boolean;
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
        loading,
        getPermissionTitle,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

// Custom hook to use permissions
// Context hooks conventionally share their provider module.
// eslint-disable-next-line react-refresh/only-export-components
export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
