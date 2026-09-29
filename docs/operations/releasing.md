# Releasing Tempo

Tempo uses a two-track branch model: every branch gets a **preview deployment**
you can click through, and only the `production` branch deploys to the live
site. Nothing is live until you promote a reviewed build.

## Branch model

```
feature branches ─┐
                  ├─→ integration/next ──(review the Vercel preview)──┐
        main ─────┘        (optional stable mirror)                   │
                                                                     ▼
                                                              production
                                                        (Vercel Production → live)
                                                                     │
                                                          GitHub Action tags
                                                          v<package.json> + Release
```

- `main` — stable mirror, never deployed (kept for CI history and PRs).
- `integration/next` — all feature/fix branches merge here. Pushing it gives a
  Vercel **Preview** URL for with the whole batch.
- `production` — the only branch wired to a Vercel **Production** deployment.

## One-time Vercel setup

1. Vercel Dashboard → project `tempo-volleyball` → **Settings → Git**.
2. Set **Production Branch** to `production`.
3. Leave preview deployments enabled for all other branches.
4. (Optional) Enable **Comments** on preview deployments so review notes attach
   to the deployment.

No tokens or secrets are needed for this flow: Vercel's Git integration builds
previews for every branch and production only for `production`.

## Day-to-day

1. Branch from `main`, implement the issue, run `pnpm typecheck`.
2. Open a PR into `integration/next` (CI runs on every PR).
3. When the batch is ready, push `integration/next` and open the Vercel preview
   from the deployment list (or `vercel ls` if you use the CLI locally).
4. Review the live preview on desktop and phone before promoting anything.

## Cutting a release

1. Bump the version on `integration/next`:

   ```bash
   pnpm version 0.2.0 --no-git-tag-version
   git commit -am "chore(release): 0.2.0"
   ```

2. Merge `integration/next` into `main` (optional, keeps the stable mirror).
3. Merge `integration/next` into `production` — this is the release action:

   ```bash
   git checkout production
   git merge --no-ff integration/next -m "release: 0.2.0"
   git push origin production
   ```

4. Vercel deploys `production` to the live URL.
5. The **Version Release** workflow tags `v0.2.0` and publishes a GitHub
   Release with generated notes.

If a release goes wrong:

- **Instant rollback:** Vercel → Deployments → previous production deployment →
  **Promote to Production**.
- **Forward fix:** revert the offending commit on `production` (or hotfix onto
  `production` directly for emergencies, then back-merge into `integration/next`).

## Alternative: keep `main` as the production branch

If you prefer not to add a `production` branch, production deploys can instead
be gated on GitHub Releases with the Vercel CLI. This needs three repository
secrets — `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — plus a
`.github/workflows/release.yml` that runs
`npx vercel deploy --prod` on `release: published`, and a Vercel
**Ignored Build Step** that skips automatic production builds. The
`production`-branch approach is recommended because it needs no secrets and
uses Vercel's native behavior.
