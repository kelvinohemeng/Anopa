import "framer-plugin/framer.css";
import "./App.css";
import { framer } from "framer-plugin";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

// Log the current Framer mode and environment info
// console.log("Framer plugin mode:", framer.mode);
// console.log("Environment:", {
//   userAgent: navigator.userAgent,
//   language: navigator.language,
//   windowDimensions: {
//     width: window.innerWidth,
//     height: window.innerHeight,
//   },
// });

// Set up error handling
window.addEventListener("error", (event) => {
  // console.error("Global error:", event.error);

  // Show an error notification
  framer.notify(`Error: ${event.error?.message || "Unknown error"}`, {
    variant: "error",
    durationMs: 5000,
  });
});

// Set up promise rejection handling
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);

  // Show an error notification
  framer.notify(`Promise error: ${event.reason?.message || "Unknown error"}`, {
    variant: "error",
    durationMs: 5000,
  });
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
