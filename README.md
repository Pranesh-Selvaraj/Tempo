# Tempo

A 3D volleyball teaching tool. Author plays, choreograph cameras, record video, teach on any device.

Tempo is the implementation of the **Project Rotation** blueprint: a browser-based play designer where a coach draws serve receive, attack, defense, block and transition plays on an accurate 3D court, records them as shareable video, and presents them to the team from a phone at the gym.

Built by **Pranesh Selvaraj** — volleyball player and developer ([@Pranesh-Selvaraj](https://github.com/Pranesh-Selvaraj)).

## Features

- **Interactive play mode** — skip setup and start on the court: drag the receive formation, tap three ball targets, **pick who receives, sets and spikes**, pick the block count, mark the spike, watch natural curved runs animate, then save or record. Save your own **custom formation** at any time
- **Theme options** — OLED Black, Midnight and Graphite, switchable from any header and remembered per device
- **Formation systems** — 5-1, 6-2, 4-2 and 6-6 base positions per play, with or without a libero
- **Match scorecard & analytics** — live rally scoring, sets, rotation tracking, timeouts with a **configurable countdown (5–600 s, presets)**, a **match clock/stopwatch**, a **general countdown timer with minutes + seconds**, substitutions, sideout %, points by rotation and longest runs (saved on the device)
- **Court sides** — each team's panel, **players & starting-positions list**, court map, rotation tracker and bench/staff sit on their own side of the scoreboard, using the full desktop width; tap a player to set their position. Teams switch sides automatically at the end of every set and at 8 in the deciding set, with a manual **Swap sides** button
- **Responsive** — the home dashboard and scorecard adapt from phones in portrait up to ultrawide desktops with no horizontal overflow
- **Home dashboard** — searchable plays, plus a sidebar with the live scoreboard (sets pips, quick points, timeout countdown, match clock and the running timer), archived **match history** you can restore, and library stats
- **Match types** — practice match (unlimited sets), single match, best of 3 and best of 5, each with the right set targets and deciding set
- **Print & export** — print or save a full match report as PDF (sets, team analytics, points by rotation, lineups & staff, substitutions, player stats) or download the match as JSON
- **Optional lineups & staff** — pick the playing formation, then tap the 2D court map to assign each position: jersey number, name and player type (setter / outside / middle / opposite / libero). Bench, coaches and support staff included; substitutions are player-for-player and per-player stats stay accurate across subs (service points, rallies on court, subs in, best serving run)
- **Library analytics** — play counts, categories and sharing stats at a glance
- **Roster & positions** — live panel showing who is who, their role, current zone (4–3–2 / 5–6–1) and task (receiver / setter / spiker / blocker)
- **Undo / redo everywhere in quick mode** — player moves, ball targets, blocks and step changes (`Ctrl+Z` / `Ctrl+Shift+Z`), plus draggable ball markers and arrow-key nudging
- **Accurate 3D court** — 18 × 9 m floor, 2.43 m net, 3 m attack lines, antennas, rotation zones 1–6
- **Authored ball trajectories** — click out Catmull-Rom bezier paths per action (serve / pass / set / attack / block / dig), no physics engine
- **Timeline keyframe animation** — record player positions + poses, scrub, retime, slow motion, frame stepping
- **Procedural player poses** — ready, pass, set, serve, approach, jump, spike, block, dive, celebrate
- **Camera angles** — coaching view, top-down, home/away end, attacker and setter POV, sideline, plus authored dolly paths with captured keys
- **Teaching layer** — phase markers with coaching notes, 3D annotations with visibility windows, movement ghost trails, court zone overlay
- **Client-side video export** — MediaRecorder captures the canvas, ffmpeg.wasm converts to MP4 (WhatsApp / Instagram / Presentation / Slow-mo / GIF presets) or GLB
- **Studio render** — frame-perfect, deterministic WebCodecs (H.264/VP9) encoding via mp4-muxer, with an in-browser background render queue
- **GLB player models** — load any Mixamo/skinned `.glb`, map its clips to the 12 volleyball poses, auto-scale and root-motion stripping; falls back to the procedural mannequin
- **File hosting** — authenticated upload endpoint storing to local `/uploads` or Cloudflare R2, with a direct video link + QR code
- **Sharing** — public read-only play links, QR codes, Web Share API, `navigator.share()` with the video file
- **Presentation mode (PWA)** — full-screen `/present/:playId` with chapter bar for gym-side teaching
- **Drill mode** — guided phase-by-phase walkthrough with hidden/revealed ball paths
- **Rules reference** — 45 seeded rules across scoring, rotations, faults, contact, net, serve and libero, with court diagrams for visual learners and the official **FIVB Volleyball Rules 2025–2028** bundled as a PDF in the app
- **Dual database** — PostgreSQL 16 in production, or embedded PGlite for a zero-dependency local run

## Tech Stack

React 18 · Vite · TypeScript · Three.js · React Three Fiber · drei · postprocessing · Node 20 · Express · tRPC v10 · Drizzle ORM · PostgreSQL 16 / PGlite · Zustand · Zod · Tailwind · ffmpeg.wasm · WebCodecs · mp4-muxer

## Quick Start

```bash
# 1. Install
pnpm install

# 2. Configure the backend
cp .env.example apps/backend/.env
#    Postgres via Docker:
#      docker compose up -d
#    …or, if Docker is not available, run the embedded database instead:
#      DATABASE_URL=pglite://./.pglite

# 3. Migrate + seed the database, build shared types, generate PWA icons
pnpm setup

# 4. Run backend (4000) + frontend (5173) together
pnpm dev
```

Open <http://localhost:5173>, create an account, and hit **New play**.

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Builds shared types, then runs API + web in watch mode |
| `pnpm build` | Type-checks and builds every package |
| `pnpm typecheck` | Type-checks every package |
| `pnpm setup` | Shared-types build, PWA icons, DB migrate + seed |
| `pnpm build:demo` | Builds the static no-backend demo into `apps/frontend/dist` |
| `pnpm preview:demo` | Builds and serves the static demo on <http://localhost:4173> |
| `pnpm db:generate` | Generates Drizzle migrations from the schema |
| `pnpm db:migrate` | Applies migrations (works on Postgres and PGlite) |
| `pnpm db:seed` | Seeds/updates the 45 volleyball rules |
| `pnpm smoke` | End-to-end API smoke test (auth → play → keyframes → trajectories → duplicate → rules) |

## The 60-second tour

1. **Library** — create a play, pick category, rotation, court and net height.
2. **Author** — choose the *Ball* tool, pick the action type (color-coded), set the control-point height, and click the court to draw the flight. Finish the path.
3. **Animate** — drag players into position, pick their pose, put the playhead where you want a beat, and press **Record keyframe** (or `K`). Scrub to watch the interpolation.
4. **Teach** — add phases (or generate them from the ball paths), drop 3D notes, toggle zones and ghost trails.
5. **Camera** — orbit to a view, capture camera keys into a path, then preview the path during playback.
6. **Export** — choose WhatsApp / Instagram / Presentation / Slow-mo / GIF / GLB in **Realtime capture**, or switch to **Studio render** for a frame-perfect MP4 (WebCodecs, queued in the background). Then download, Web Share, upload for a direct link, or scan the QR code.
7. **Present** — open `/present/:playId` on a phone, add it to the home screen, and teach chapter by chapter.

### In a hurry? Interactive play

Interactive play is desktop-first: on a phone it asks you to rotate to landscape for the full court, roster and controls. Open **Library → Interactive play** to skip play creation entirely. You start on the court with your rotation already set:

1. Drag the six silhouettes to your receive formation and lock it.
2. Tap three spots on the court — where the serve lands, where the pass goes and where the ball should be set.
3. Drag players to their spike-time spots (dashed lines show each run), choose 0–3 blocks and tap where the spike lands.
4. Press **Watch the play** — serve, pass, set and spike animate with the ball. Then save it as a normal play or jump straight to recording a video.

Undo/redo covers every step (`Ctrl+Z` / `Ctrl+Shift+Z`), the roster panel explains who is who and which zone they play, and ball markers can be dragged or nudged with the arrow keys. Use **Who plays** to pick the receiver, setter and spiker (or leave them on Auto), switch formation (5-1 / 6-2 / 4-2 / 6-6) or **Save custom** to turn your current positions into your own formation, and jump between camera angles — Coaching, Top Down, Home End, Away End or player POVs — with one tap. Players run curved, eased routes toward their positions and turn to face their run.

### Match scorecard

Open **Scorecard** from the library header (or `/scorecard`) to run a live match on any device: rally scoring, sets and the deciding set, rotation tracking, timeouts, substitutions and analytics — sideout percentage, points by rotation and longest scoring runs. **Lineups & staff** is optional and now formation-aware: choose the system (5-1 / 6-2 / 4-2 / 6-6), then tap any of the six positions on the 2D court map to enter a name, jersey number and player type — the map shows the current rotation with jersey numbers, role abbreviations and a serving marker. You can also edit the roster list, fill the bench and add coaches/support staff. Substitutions become player-for-player (pick who comes out and who comes in), and the player stats table tracks service points, rallies played, subs and best serving runs correctly across substitutions. The match is saved in the browser, so a refresh at the gym does not lose the score. Run the **match clock** (stopwatch), start a **30-second timeout countdown** from either team panel, and keep an eye on the live widget on the home page.

### Player models (Sprint 5)

Tempo ships with a fully procedural mannequin (12 poses built from damped joints) so it works with zero assets. To use
a real skinned model:

1. Download a character from Mixamo (or any GLB/GLTF viewer-ready rig) as **FBX Binary / glTF**, and drop the `.glb`
   into `apps/frontend/public/models/` (gitignored — licensed models are never committed).
2. In the editor's **Player model** panel, enter `/models/player.glb` (or use **Open local .glb** for a quick preview)
   and press **Load**.
3. Adjust **Facing offset** (Mixamo faces the opposite way to the mannequin, so 180° is the default), **Scale** and
   **Animation speed**. Auto-scale normalises cm/m rigs to 1.85 m.
4. Under **Pose → clip mapping**, each of the 12 volleyball poses is auto-matched to a clip by name (`spike`, `block`,
   `run`, …) — override any mapping manually. The mixer time is `currentMs` plus a per-player offset, so GLB poses are
   deterministic during playback and studio renders.
5. Root motion (horizontal hip translation) is stripped so players stay exactly where they were authored, while jump
   height is preserved.

If the model fails to load or animate, the mannequin is used automatically.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Step one frame (hold `Shift` for 10) |
| `K` | Record keyframe at playhead |
| `Esc` | Cancel drawing / clear selection |
| `Delete` | Delete the selected keyframe, ball path, phase, note or camera path |

## Repository layout

```
apps/
  backend/          Express + tRPC API, Drizzle schema, migrations, rules seed
  frontend/         Vite + React SPA, R3F court, editor, recorder, PWA
    public/rules/   FIVB rule book PDF + rule diagrams (SVG)
    src/demo/       localStorage API + seed for the static VITE_DEMO_MODE build
packages/
  shared-types/     Zod schemas, court constants, interpolation helpers
```

## Static demo (no backend, no database)

`VITE_DEMO_MODE=1` swaps the tRPC client for a localStorage-backed database and auto-signs-in a demo coach.
The SPA deploys to any static host — Vercel, Cloudflare Pages, Netlify — with **no API and no Postgres**.

```bash
pnpm preview:demo   # build + serve at http://localhost:4173
```

What works in demo mode:

| Works fully | Works locally only | Not available |
| --- | --- | --- |
| Interactive play (tap-to-target, save to library) | Create/edit/delete plays (browser storage) | Sharing data across devices |
| Match scorecard, analytics, print/PDF | Keyframes, trajectories, phases, annotations, camera paths | Hosting rendered videos (download/share-sheet only) |
| 3D editor, drill & presentation modes | Rules browser (seeded from shared-types) | User accounts beyond the local demo user |
| Recording/render + download, PWA, QR play links | Public `/view/:id` share links | |

The demo seeds three authored plays, the full rules set and a demo user. Visitors get a floating badge with a
**Reset** button to restore the seed. All data stays in their browser; nothing is uploaded.

### Deploy the demo to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new) — leave the **Root Directory** as the repo root;
   the root `vercel.json` handles everything (pnpm workspace install, `pnpm build:demo`, SPA rewrites, COOP/COEP
   headers for ffmpeg.wasm).
2. Deploy. No environment variables are required.

Or from the CLI:

```bash
npx vercel --prod
```

The full-stack version is unchanged: omit `VITE_DEMO_MODE` (or run `pnpm dev`) and the app talks to the Express API.

## Deployment notes

- **Static demo**: set `VITE_DEMO_MODE=1` at build time (Vercel does this via `pnpm build:demo`). It replaces the API
  with `src/demo` — a localStorage implementation of every tRPC procedure plus a seed of three plays and the rules.
- **COOP/COEP**: ffmpeg.wasm needs `SharedArrayBuffer`, so both the API and the origin serving the SPA must send:
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
  Vite (dev + preview) and Express already do this.
- **Database**: set `DATABASE_URL` to your Postgres instance and run `pnpm db:migrate && pnpm db:seed`.
  `pglite://<dir>` switches to the embedded database for local demos.
- **Player models**: drop licensed Mixamo `.glb` files into `apps/frontend/public/models/` (gitignored) and select
  them in the editor's Player model panel — see the Player models section above. The procedural mannequins remain the
  zero-asset default and the fallback for broken/missing models.
- **Recording storage**: `POST /api/upload?filename=…` (raw body + JWT) writes to `apps/backend/uploads/` and returns a
  public URL. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_URL` to store
  recordings in Cloudflare R2 instead — signing is implemented with `node:crypto` (AWS SigV4) and needs no SDK.
- **Studio renders** require WebCodecs (`VideoEncoder`) — Chrome/Edge today. Firefox/Safari users can still use the
  realtime MediaRecorder → ffmpeg.wasm path.

## Sprint status vs. blueprint

| Sprint | Status |
| --- | --- |
| 1 · 3D court foundation | ✅ court, net, antennas, zones, 6 players, camera presets |
| 2 · Ball & trajectory | ✅ bezier editor, colored tubes, landing markers, action types |
| 3 · Timeline & keyframes | ✅ scrubber, record keyframe, interpolation, persistence, library |
| 4 · Teaching layer | ✅ phases, annotations, ghost trails, slow-mo, frame stepping |
| 5 · Player models | ✅ GLB loader with clip mapping, deterministic mixer, auto-scale, root-motion stripping, mannequin fallback |
| 6 · Camera choreography | ✅ capture keys, multiple paths, path playback, presets |
| 7 · Recording core | ✅ MediaRecorder → ffmpeg.wasm → MP4/GIF, download, Web Share |
| 8 · Export presets & share | ✅ presets, QR codes, public read-only links |
| 9 · Presentation mode (PWA) | ✅ manifest, service worker, full-screen route, chapter bar |
| 10 · Studio export | ✅ frame-by-frame WebCodecs render, background queue, upload to `/uploads` or R2 |
| 11 · Interactive play | ✅ start-on-court quick mode, tap-to-target ball paths, block stepper, undo/redo, roster panel, save → advanced editor |
| 12 · Volleyball suite | ✅ theme options (OLED / Midnight / Graphite), formation systems (5-1 / 6-2 / 4-2 / 6-6) with libero, quick-play role picks, custom formations, natural curved runs and camera angles, live scorecard with lineups & staff, per-player analytics, match clock + timeout countdown, match types, print/PDF report, JSON export, home dashboard with scoreboard widget and match history |

## Author

**Pranesh Selvaraj** — volleyball player and builder of Tempo.

- GitHub: [@Pranesh-Selvaraj](https://github.com/Pranesh-Selvaraj)
- The official **FIVB Volleyball Rules 2025–2028** PDF is bundled under `apps/frontend/public/rules/` for offline reference. All rights to the rule book remain with the FIVB; the court diagrams are original illustrations for this project.
- Security policy: see [SECURITY.md](./SECURITY.md).

## License

MIT — see [LICENSE](./LICENSE).
