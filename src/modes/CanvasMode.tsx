import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { routes } from "../Router/routes";

// Paths handled outside CanvasMode (Router.tsx or App.tsx level)
const EXCLUDED_PATHS = new Set(["/login", "/signup", "/forgot-password", "/my-account"]);

// Group routes by their root path segment so sub-routes share one animation key.
// e.g. /components, /components/products, /components/cart → all keyed as "/components"
const canvasRouteGroups = (() => {
  const seen = new Map<string, (typeof routes)[number]["Component"]>();
  for (const route of routes) {
    if (EXCLUDED_PATHS.has(route.path)) continue;
    const first = route.path.split("/")[1]; // "" for "/", "components" for "/components/..."
    const rootPath = first ? `/${first}` : "/";
    if (!seen.has(rootPath)) seen.set(rootPath, route.Component);
  }
  return [...seen.entries()];
})();

const NON_HOME_ROOTS = canvasRouteGroups
  .map(([p]) => p)
  .filter((p) => p !== "/");

const pageMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
};

export default function CanvasMode() {
  const [location] = useLocation();

  const isActive = (rootPath: string) =>
    rootPath === "/"
      ? !NON_HOME_ROOTS.some(
          (r) => location === r || location.startsWith(`${r}/`),
        )
      : location === rootPath || location.startsWith(`${rootPath}/`);

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait" initial={false}>
        {canvasRouteGroups.map(([rootPath, Component]) =>
          isActive(rootPath) ? (
            <motion.div
              key={rootPath}
              className="w-full h-full"
              {...pageMotion}
            >
              <Component />
            </motion.div>
          ) : null,
        )}
      </AnimatePresence>
    </div>
  );
}
