# Contributing to Anopa

Thanks for contributing. The plugin is anonymous-first: contributors should be
able to run the core client and connect a store without an Anopa account,
authentication provider, or hosted application backend.

## Development setup

1. Fork and clone the repository.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the development plugin from a Framer project.
5. In **Manage**, connect a Shopify test store using its domain and a
   public Storefront API access token.

No Convex deployment, account signup, Google OAuth relay, or server migration
is part of local setup. See [README.md](README.md) and
[`.env.example`](.env.example) for the optional Sanity and analytics settings.

## Configuration and credential safety

Store configuration is a versioned object in the plugin iframe origin's
`localStorage`, under `anopa.shopify.store-config`. Keep changes backward-aware:
validate stored data, treat unavailable or corrupt storage as unconfigured,
and bump the schema version only with an explicit compatibility plan. Version
1 contains `domain`, `publicStorefrontToken`, `customFields`, `metafields`, and
`syncImageAsGallery`; the domain is stored as a canonical lowercase
`*.myshopify.com` hostname. Paths, ports, and private Shopify token prefixes
must be rejected before storage.
Keep Framer plugin data non-sensitive: it may retain field selections and
collection sync metadata, but not the Storefront token.

Do not imply that this storage syncs across devices or Framer environments.
Browser storage can be partitioned, blocked, or cleared, and private sessions
may be ephemeral. Never log, add to analytics, commit, or copy into fixtures a
real store token.

Only public Shopify Storefront tokens belong in this client. **Never use an
Admin API access token or private app secret.** Do not put secrets in `VITE_`
variables; they are bundled into browser code.

## Making changes

- Keep pull requests focused and preserve the no-account path through canvas,
  managed-collection configuration, and sync modes.
- Do not reintroduce login, signup, Google OAuth, account/profile screens,
  Convex runtime dependencies, tier checks, or license gating.
- Run `npm run lint` and `npm run build` before opening a pull request.
- Keep the client/external-component license boundary clear. Published Framer
  commerce components come from another project and are not relicensed by this
  repository.
- If the local configuration shape changes, add validation and document the
  upgrade/re-entry behavior. Never silently reinterpret a credential field.
- Shopify checkout used by a shopper is product functionality, not an Anopa
  subscription or account flow.

## Analytics and privacy

Anopa collects no analytics or telemetry — do not reintroduce any. Anonymous
use must not be converted into a hidden stable user identity, and Shopify
domains, tokens, and customer/product payloads must never leave the plugin
except in direct calls to Shopify or the plugin's own Sanity content backend.

## Transition and release checks

Account-based releases do not automatically migrate their server-side store
credentials into iframe `localStorage`. Upgrade notes must explicitly tell
existing users to re-enter their domain and public Storefront token, and to
review field/metafield settings before syncing.

For the account-removal release, keep the last account-based build and its
backend unchanged for a 30-day rollback window starting on the production
release date. Put the actual dates in the release notes. Test rollback as a
paired old-client/old-backend operation. Retire authentication and Convex only
after the window ends, stability is confirmed, and retained data is handled
under the applicable privacy/retention policy.

Before requesting review, complete the manual Framer checklist in
[README.md](README.md): anonymous entry, local save/reopen/clear, invalid
credentials, component insertion, managed-collection configure and sync,
storage clearing, analytics-off behavior, upgrade re-entry, and paired
rollback. Include the Framer version and test-store scenario in the PR.

## Reporting issues

Open a GitHub issue with reproduction steps, expected behavior, actual
behavior, Framer version, and plugin mode. Do not post real tokens, store data,
or screenshots containing credentials. Report credential exposure or other
security issues privately to the maintainer.

## Code style

- Use TypeScript strict mode. Prefer `unknown` plus narrowing over `any`.
- Follow the existing structure under `src/pages`, `src/modes`,
  `src/components`, `src/config`, and `src/utils`.
- Keep local configuration parsing and validation centralized rather than
  reading or writing the storage key from unrelated components.
