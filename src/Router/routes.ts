import { ComponentType } from "react";
import HomePage from "../pages/Homepage";
import TemplatesPage from "../pages/TemplatesPage";
import ComponentsPage from "../pages/ComponentsPage";
import StoreDetailsForm from "../pages/StoreDetailsForm";
import Settings from "../pages/Settings";
import HelpPage from "../pages/HelpPage";
import LearnPage from "../pages/LearnPage";
import WhatsNewPage from "../pages/WhatsNewPage";

export interface PluginRoute {
  path: string;
  Component: ComponentType;
  size?: {
    width: number;
    height: number;
  };
}

export const routes: PluginRoute[] = [
  {
    path: "/",
    Component: HomePage,
    size: { width: 350, height: 380 },
  },
  {
    path: "/templates",
    Component: TemplatesPage,
    size: { width: 350, height: 500 },
  },
  {
    path: "/components",
    Component: ComponentsPage,
    size: { width: 350, height: 500 },
  },
  {
    path: "/components/products",
    Component: ComponentsPage,
    size: { width: 350, height: 500 },
  },
  {
    path: "/components/cart",
    Component: ComponentsPage,
    size: { width: 350, height: 500 },
  },
  {
    path: "/components/global",
    Component: ComponentsPage,
    size: { width: 350, height: 500 },
  },
  {
    path: "/settings",
    Component: Settings,
    size: { width: 350, height: 500 },
  },
  {
    path: "/help",
    Component: HelpPage,
    size: { width: 350, height: 600 },
  },
  {
    path: "/learn",
    Component: LearnPage,
    size: { width: 350, height: 400 },
  },
  {
    path: "/whats-new",
    Component: WhatsNewPage,
    size: { width: 350, height: 450 },
  },
  {
    path: "/manage",
    Component: StoreDetailsForm,
    size: { width: 350, height: 500 },
  },
];
