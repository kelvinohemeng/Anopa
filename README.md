# Anopa

Anopa is a free Shopify integration and component ecosystem for Framer —
connect a Shopify store, sync products into Framer's CMS, and add commerce
components without leaving Framer's visual workflow. Every feature is
available to every signed-in user — there are no paid tiers, license checks,
or upgrade prompts.

The **plugin client in this repository** is open source under the MIT License.
The separately hosted Framer component library and managed production services
are not included in this repository.

- 🔌 **Install from the Framer Marketplace:** https://www.framer.com/community/marketplace/plugins/anopa/
- 📖 **Documentation:** https://docs.thegeneralyst.com
- 🎥 **Video overview:** https://www.youtube.com/watch?v=Ug3CrpsolQ0
- 📄 **License:** [MIT](LICENSE)

## What Anopa does

- Connect a Shopify store via the Storefront API (no admin access required)
- Sync products, variants, pricing, inventory, images, and metafields into a
  Framer CMS collection, with custom fields and gallery/multi-image support
- Drop in commerce components — product cards, cart, add-to-cart, quantity
  controls, variant/option selectors, checkout handoff to Shopify — as
  regular Framer component instances
- Manage a component catalogue and release notes from Sanity CMS

## Tech stack

- **UI:** React + TypeScript + Vite, using the [`framer-plugin`](https://www.framer.com/developers/plugins/introduction) SDK
- **Backend:** [Convex](https://www.convex.dev/) for auth, user/store data, and server functions
- **Auth:** [`@convex-dev/auth`](https://labs.convex.dev/auth) — email/password plus a custom Google OAuth provider
- **Commerce data:** Shopify Storefront API (GraphQL)
- **Content:** [Sanity](https://www.sanity.io/) for the component catalogue and "What's new" posts
- **Analytics (optional):** [PostHog](https://posthog.com/)

## Architecture and open-source scope

This repository contains the plugin interface: the panel UI, Shopify sync
engine, component catalogue, and configuration workflows that run inside
Framer.

The commerce components referenced by the catalogue are published Framer
components inserted through their Framer URLs. Their implementation source
lives in a separate Framer project and is not included in, or licensed by,
this repository. The hosted production backend and component catalogue used
by the Marketplace version are also operated separately.

| Part | Availability |
| --- | --- |
| Plugin client in this repository | Open source under MIT |
| Framer component library | Available under its applicable Framer license |
| Hosted production backend | Managed Anopa service |
| Product features | Free for signed-in users |

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/kelvinohemeng/Anopa.git
cd Anopa
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This logs you into Convex, creates (or connects) a dev deployment, and writes
`CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` into `.env.local` automatically.
Leave `npx convex dev` running in a terminal while you develop — it pushes
your `convex/` functions and schema on every save.

See [`.env.example`](.env.example) for every environment variable, including
the optional Sanity and PostHog vars and the server-side Convex vars you set
separately with `npx convex env set`.

### 3. (Optional) Enable Google sign-in

Email/password auth works out of the box via Convex Auth. Google sign-in
requires a small OAuth relay, since Framer plugins run in an iframe and can't
do redirect-based OAuth directly:

1. Deploy a copy of Framer's [`plugin-oauth`](https://github.com/framer/plugin-oauth) worker (e.g. on Cloudflare Workers).
2. Point `AUTH_BACKEND` in [`src/components/AuthContext.tsx`](src/components/AuthContext.tsx) at your deployed worker URL.
3. Set `AUTH_GOOGLE_ID` on your Convex deployment: `npx convex env set AUTH_GOOGLE_ID <your-google-oauth-client-id>`.

### 4. Connect a Shopify store

Once signed in, use **Manage** (`/manage`) to save a Shopify Storefront API
domain and access token. These are stored per-user in Convex and used by the
sync and commerce components.

### 5. Run the plugin

```bash
npm run dev
```

Framer will detect the local dev server; open the plugin from inside a Framer
project to load it.

## Scripts

| Command         | Description                                                 |
| --------------- | ------------------------------------------------------------ |
| `npm run dev`   | Start the Vite dev server for local development               |
| `npm run build` | Build the production bundle                                   |
| `npm run lint`  | Run ESLint                                                     |
| `npm run pack`  | Build and zip the plugin for Framer Marketplace submission     |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The source code contained in this repository is licensed under the
[MIT License](LICENSE). This license does not apply to the separately hosted
Framer component project, managed backend deployment, third-party services,
or Framer's platform and Marketplace.
