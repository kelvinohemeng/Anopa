# Anopa

Anopa is an anonymous-first Shopify integration for Framer. Open the plugin,
connect a Shopify store, sync products into Framer CMS, and insert commerce
components without creating or signing in to an Anopa account.

- **Install from the Framer Marketplace:** https://www.framer.com/community/marketplace/plugins/anopa/
- **Documentation:** https://docs.thegeneralyst.com
- **Video overview:** https://www.youtube.com/watch?v=Ug3CrpsolQ0
- **Client license:** [MIT](LICENSE)

## What Anopa does

- Connects to Shopify through the Storefront API
- Syncs products, variants, prices, images, and metafields into a
  Framer managed CMS collection
- Inserts published commerce components such as product cards, carts,
  add-to-cart controls, option selectors, and checkout handoff
- Loads the component catalogue and release notes from Sanity

There is no Anopa account, sign-in, paid tier, or license check in the plugin.
Store setup is available immediately when the plugin opens. In Framer canvas
mode, an unconfigured installation goes directly to **Manage**.

## Licensing boundary

The client code in this repository is licensed under MIT. That license covers
the plugin panel, Shopify sync logic, catalogue UI, and local configuration
workflow in this repository.

The published Framer commerce components inserted by the plugin are external
assets whose implementation source lives in a separate Framer project. They
are **not** licensed by this repository's MIT license. Review the license or
terms supplied with those components before redistributing or modifying them.

## Store configuration and privacy

The plugin saves one versioned configuration object under the iframe origin's
`localStorage` key `anopa.shopify.store-config`. Version 1 contains the Shopify
domain, a public Storefront token, custom fields, metafields, and the gallery
sync preference. On save, an HTTP(S) protocol and root slash are removed and
the domain is normalized to a lowercase hostname. Non-root paths, ports,
credentials, query strings, and fragments are rejected. Missing, corrupt, or non-v1 data is treated as
no configuration. **Disconnect** clears this local object and the domain/token
attributes on Anopa Config component instances that the plugin can update.
Framer plugin data retains only non-sensitive field selections and collection
sync metadata, not the Storefront token.

This storage model has deliberate limitations:

- Configuration is local to the browser profile and storage partition in
  which Framer embeds the plugin. It is not an Anopa cloud account and does not
  sync to another browser, profile, machine, or Framer environment.
- Clearing site data, blocking iframe storage, or using an ephemeral/private
  browser session can remove or prevent access to the configuration.
- Anyone with access to that browser profile or plugin iframe origin may be
  able to read the saved value. Treat the device accordingly.
- Invalid or unsupported stored data is ignored. Re-enter the store details if
  the plugin reports that no usable configuration exists.

Use only a Shopify **public Storefront API access token** with the minimum
Storefront scopes needed by the plugin. Only canonical `*.myshopify.com`
hostnames are accepted; paths and ports are rejected. Never paste an Admin API access token,
private app secret, password, or other privileged Shopify credential into the
plugin: browser storage and client-side requests are not an appropriate place
for server secrets.

Anopa collects no analytics or telemetry. Nothing is sent to a third party
beyond the direct calls needed to talk to Shopify and to the plugin's own
Sanity content backend.

## Upgrading from an account-based release

The anonymous client does not copy credentials from the former account
backend into browser storage. Existing users must open **Manage** once
after upgrading and re-enter their Shopify domain and public Storefront token.
Custom field and metafield choices should also be reviewed before the first
sync. In canvas mode, users without local credentials are sent to **Manage**
automatically. Do not ask users to provide an Admin/private token during this
transition.

For a production rollout, retain the last account-based build and its backend
unchanged for a **30-day rollback window beginning on the anonymous release
date**. Record the exact start and end dates in the release notes. During that
window the old deployment is rollback-only; do not write its credentials into
the new client's `localStorage`. After the window closes and support confirms
the anonymous release is stable, retire the authentication/Convex services and
handle retained user data according to the published privacy and retention
policy. A rollback restores the old build and backend together; it does not
make locally saved anonymous configuration available to the old build.

## Local development

Requirements: a current Node.js LTS release, npm, Framer Desktop, and a Framer
project in which you can run a development plugin.

```bash
npm install
npm run dev
```

Open the local development plugin from inside Framer. No Anopa account,
Convex deployment, Google OAuth setup, or server migration is required.

Optional client environment variables are documented in [`.env.example`](.env.example).
Keep analytics variables blank to disable analytics. Never put Shopify Admin
credentials or other server secrets in a `VITE_` variable because Vite embeds
those values in the client bundle.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Build the production plugin bundle |
| `npm run lint` | Run ESLint |
| `npm run pack` | Build and package the plugin for Marketplace submission |

## Manual verification in Framer

Run these checks in Framer Desktop, not only in a standalone browser tab:

- Open a fresh installation and confirm it goes directly to **Manage** without
  a login, signup, account, or OAuth screen.
- Open **Manage**, enter a test-store domain and a public Storefront
  token, save, close the plugin, and reopen it. Confirm the configuration is
  restored and can be cleared or replaced.
- Confirm an invalid domain/token produces a useful fetch or sync error without
  exposing the token in UI, logs, analytics, or generated CMS data.
- Insert each catalogue component used by the release and confirm it is a
  normal Framer component instance with the expected store controls.
- Create/configure a managed collection, select standard/custom/metafield
  mappings and the gallery option, then reopen configuration mode and confirm
  the choices remain available.
- Run managed-collection sync and verify products, variants, prices,
  images/gallery, and metafields against the Shopify test store.
- Repeat the open/configure/sync flow after clearing the iframe's site data and
  confirm the plugin asks for store details again instead of failing silently.
- Test with analytics variables absent. If analytics is enabled for the build,
  verify no domain, token, product/customer payload, or legacy account identity
  is captured.
- For an upgrade test, install the last account-based build, then the anonymous
  build, and confirm the user is clearly prompted to re-enter store details.
  Also rehearse restoring the old build together with its backend.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The repository client is MIT-licensed; see [LICENSE](LICENSE). External Framer
components have separate licensing as described above.
