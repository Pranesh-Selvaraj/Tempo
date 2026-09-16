# Contributing to Tempo

Thanks for wanting to help. Tempo is a 3D volleyball play designer and every
improvement — code, docs, testing, ideas — makes it better for coaches and
players.

Before anything else, two project rules:

1. **Read the [LICENSE](./LICENSE).** Tempo is source-available: you may read,
   use and self-host it freely (including commercially), but the product comes
   only from this repository. You may not publish modified or forked versions.
   The license includes a limited exception that lets you make a copy **solely**
   to prepare a contribution for this repository.
2. **Be kind.** Everyone interacting with the project follows the
   [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** — open an issue using the bug report template.
- **Request a feature** — open an issue describing the coaching problem first,
  and the solution you have in mind.
- **Improve the docs** — README, this guide, the rule summaries, the in-app copy.
- **Write code** — fixes, features, performance, accessibility, tests.
- **Test on real devices** — phones and tablets at the gym are the target; your
  report about a real device is worth a lot.

**Security issues must not be reported in public issues.** Follow
[SECURITY.md](./SECURITY.md) instead.

## Getting started

```bash
pnpm install

# Backend config (only needed for the full-stack version)
cp .env.example apps/backend/.env
#   Postgres:        docker compose up -d
#   or embedded:     DATABASE_URL=pglite://./.pglite

pnpm setup        # shared types, PWA icons, DB migrate + seed
pnpm dev          # API on :4000 + web on :5173

# Static preview (no backend, browser storage only)
pnpm preview:demo # builds and serves http://localhost:4173
```

Requirements: Node 20+ and pnpm (the exact version is pinned in
`package.json`). The repository is a pnpm workspace:

```
apps/backend      Express + tRPC API, Drizzle schema, migrations
apps/frontend     Vite + React SPA (3D court, editor, recorder, PWA)
packages/shared   Zod schemas and helpers shared by both
```

## Branch and commit conventions

Create a branch from `main`:

| Prefix | Use |
| --- | --- |
| `feat/` | new user-facing functionality |
| `fix/` | bug fix |
| `docs/` | documentation only |
| `chore/` | tooling, dependencies, housekeeping |
| `refactor/` | behaviour-preserving code change |

Write [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(interactive): allow custom receive formations
fix(editor): keep camera path keyframes when duplicating a play
docs(readme): document the static preview build
```

Keep each commit focused, and prefer several small commits over one large one.

## Pull requests

1. Fork or branch, then make your change on a `feat/`, `fix/`, `docs/` or
   `chore/` branch.
2. Run the checks locally:
   ```bash
   pnpm typecheck
   pnpm build
   pnpm build:demo    # when you touched the frontend
   ```
3. Open a pull request against `main` and fill in the template. Describe **what**
   changed and **why**, and add screenshots for UI changes (dark theme, phone
   and desktop if relevant).
4. CI must pass. The maintainer reviews the change; review comments are
   addressed with new commits, not force pushes.
5. PRs are **squash-merged** onto `main` so the history stays linear. Delete
   your branch afterwards.

Keep PRs small and single-purpose — a fix plus a refactor plus a new feature in
one PR is hard to review and hard to revert.

## Code guidelines

- TypeScript strict mode everywhere. No `any`; model data with the Zod schemas
  in `packages/shared-types` so client and server stay in sync.
- Keep the full-stack version and the static preview (`VITE_DEMO_MODE=1`)
  working. If you add a backend procedure, add its local implementation in
  `apps/frontend/src/demo/api.ts` too.
- Application state belongs in the existing Zustand stores; persistence goes
  through the existing layers (Drizzle in the backend, the demo database in the
  preview).
- UI: Tailwind classes in the existing style, dark themes first, keyboard
  accessible controls, and no text smaller than `text-[10px]`.
- Comment *why*, not *what*.
- Do not commit secrets, `.env` files, licensed `.glb` models, uploaded
  recordings or anything under a path listed in `.gitignore`.

## Testing

There is no automated test suite yet. For now:

- `pnpm typecheck` and `pnpm build` must pass (CI enforces this).
- Exercise the changed flow manually in `pnpm dev` (full stack) and, if the
  change touches shared UI, in `pnpm preview:demo` as well.
- Mention in the PR what you clicked through and on which screen sizes.
- Adding focused tests for new shared logic in `packages/shared-types` is very
  welcome.

## License of contributions

By submitting a contribution you agree that it is assigned to the project owner
and becomes part of Tempo under the terms of the [LICENSE](./LICENSE). Only
contribute work you wrote yourself or that you have the right to submit — no
code copied from projects with incompatible licenses.
