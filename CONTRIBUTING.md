# Contributing to Anopa

Thanks for considering a contribution! Anopa is free and open source (MIT) —
there's no paid tier or gated functionality to worry about breaking. Every
feature should stay available to every signed-in user.

## Development setup

1. Fork and clone the repo.
2. `npm install`
3. `npx convex dev` — logs you into your own Convex account and creates a dev
   deployment, writing `CONVEX_DEPLOYMENT` / `VITE_CONVEX_URL` to `.env.local`.
   You do not need access to the maintainer's deployment to develop locally.
4. `npm run dev` and open the plugin from Framer.
5. Sign up, then use **Manage** to connect a Shopify Storefront API domain
   and token for a test store (a Shopify dev store works fine).

See [README.md](README.md) and [.env.example](.env.example) for full setup
details, including optional Google OAuth, Sanity, and PostHog configuration.

## Making changes

- Keep PRs focused — one feature or fix per PR.
- Run `npm run lint` and `npm run build` before opening a PR; both must pass.
- If you touch `convex/schema.ts` or any `convex/*.ts` function, run
  `npx convex codegen` so `convex/_generated/` stays in sync, and include the
  regenerated files in your PR.
- Don't reintroduce tier/plan/license gating. This project intentionally has
  no paywall — if you're adding a feature, it should be available to everyone.
- Shopify storefront checkout (what shoppers use to buy from an Anopa-powered
  store) is core product functionality — don't confuse it with, or reimplement
  it as, an Anopa-side paid checkout.
- Never commit `.env`, `.env.local`, real Convex deployment credentials, real
  Shopify store credentials, or any file containing real user data.
  `convex/migration.ts` must never contain hardcoded user data — real
  migration data is always passed as a runtime argument (see the file's
  header comment), never as a source-code constant.

## Reporting issues

Open a GitHub issue with steps to reproduce, what you expected, and what
happened instead. For security issues (auth bypass, data exposure, leaked
credentials), please avoid filing a public issue — instead contact the
maintainer directly.

## Code style

- TypeScript, strict mode. Avoid `any`; prefer `unknown` with narrowing.
- Match the existing component structure under `src/pages`, `src/modes`,
  `src/components`, and `src/utils`.
- Convex functions live in `convex/`; keep query/mutation/action naming
  consistent with the existing files (`users.ts`, `auth.ts`).
