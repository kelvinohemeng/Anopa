import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  authenticationRequired?: boolean;
  redirectPath?: string;
}

/**
 * ProtectedRoute component that handles route protection based on authentication state
 *
 * @param children - The component to render if access is allowed
 * @param authenticationRequired - If true, redirects unauthenticated users away. If false, redirects authenticated users away.
 * @param redirectPath - The path to redirect to if access is not allowed
 */
export default function ProtectedRoute({
  children,
  authenticationRequired = true,
  redirectPath = "/",
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      // If authentication is required but user is not authenticated, redirect
      if (authenticationRequired && !isAuthenticated) {
        navigate(redirectPath);
      }

      // If authentication is NOT required but user IS authenticated, redirect
      // This is for pages like login/signup that shouldn't be accessible when logged in
      if (!authenticationRequired && isAuthenticated) {
        navigate(redirectPath);
      }
    }
  }, [
    authenticationRequired,
    isAuthenticated,
    loading,
    navigate,
    redirectPath,
  ]);

  // Show nothing while checking authentication
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // If authentication requirements are met, render children
  if (
    (authenticationRequired && isAuthenticated) ||
    (!authenticationRequired && !isAuthenticated)
  ) {
    return <>{children}</>;
  }

  // This will briefly show before redirect happens
  return <div className="loading">Redirecting...</div>;
}
