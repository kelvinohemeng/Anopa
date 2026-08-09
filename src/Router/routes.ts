import { ComponentType } from "react";
import HomePage from "../pages/Homepage";
import TemplatesPage from "../pages/TemplatesPage";
import ComponentsPage from "../pages/ComponentsPage";
import UserProfile from "../pages/UserProfile";

import StoreDetailsForm from "../pages/StoreDetailsForm";
import Settings from "../pages/Settings";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import GetStarted from "../pages/GetStarted";
import ForgotPassword from "../pages/ForgotPassword";
import HelpPage from "../pages/HelpPage";
import LearnPage from "../pages/LearnPage";
import MyAccount from "../pages/MyAccount";
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
    size: { width: 350, height: 500 },
  },
  {
    path: "/get-started",
    Component: GetStarted,
    size: { width: 350, height: 500 },
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
    path: "/profile",
    Component: UserProfile,
    size: { width: 350, height: 500 },
  },
  {
    path: "/settings",
    Component: Settings,
    size: { width: 350, height: 500 },
  },
  {
    path: "/login",
    Component: Login,
    size: { width: 350, height: 500 },
  },
  {
    path: "/signup",
    Component: Signup,
    size: { width: 350, height: 600 },
  },
  {
    path: "/help",
    Component: HelpPage,
    size: { width: 350, height: 600 },
  },
  {
    path: "/learn",
    Component: LearnPage,
    size: { width: 350, height: 600 },
  },
  {
    path: "/my-account",
    Component: MyAccount,
    size: { width: 350, height: 600 },
  },
  {
    path: "/whats-new",
    Component: WhatsNewPage,
    size: { width: 350, height: 650 },
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
    size: { width: 350, height: 500 },
  },
  {
    path: "/manage",
    Component: StoreDetailsForm,
    size: { width: 350, height: 500 },
  },
];
