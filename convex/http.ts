import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount @convex-dev/auth HTTP routes (handles OAuth callbacks, token refresh, etc.)
auth.addHttpRoutes(http);

export default http;
