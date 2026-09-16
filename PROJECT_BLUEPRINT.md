# PROJECT ROTATION: MASTER BLUEPRINT
**Role:** 3D Volleyball Teaching & Play Authoring Tool
**Status:** Ready for Implementation (MVP)
**Target Audience:** AI Coding Agent (Cursor, Claude, Windsurf)
**License:** Source-available, all rights reserved

---

## 1. HIGH-LEVEL OBJECTIVE
Build a web-based 3D volleyball teaching tool where a coach/captain authors plays (serve receive, attack combinations, defensive setups, transitions) in a full 3D court environment, choreographs camera movements, records the play as a shareable video, and presents it to teammates on any device — including a phone at the gym.

**Core Differentiators:**
- 3D court with accurate dimensions and rigged human players
- Authored (not simulated) ball trajectories using bezier curves
- Timeline-based keyframe animation system
- Camera choreography (cinematic recording paths)
- Client-side video export (WebM → MP4 via ffmpeg.wasm)
- Presentation mode as a PWA for in-person teaching
- Chapter markers, slow motion, and 3D annotations

---

## 2. DEFINITIVE TECH STACK (DO NOT DEVIATE)

### Core
- Package Manager: `pnpm` (workspace monorepo)
- Frontend: `Vite` + `React` (v18) + TypeScript
- Backend: `Node.js` (v20 LTS) + `Express`
- Type Safety: `tRPC` (v10) — shared types between frontend/backend
- Database: `PostgreSQL` (16) + `Drizzle ORM`

### 3D
- Engine: `three` (v0.160+)
- React Bindings: `@react-three/fiber`
- Helpers: `@react-three/drei` (OrbitControls, Html, Line, Text, useGLTF, Environment)
- Post-processing: `@react-three/postprocessing`
- Animation: `@react-spring/three` or Framer Motion 3D for UI-tied animation; `useFrame` for timeline-driven interpolation

### Media
- Recording: `MediaRecorder` API (browser native)
- Encoding: `@ffmpeg/ffmpeg` + `@ffmpeg/util` (WASM)
- GIF: `gif.js` (optional, Sprint 8+)
- Export: `three/examples/jsm/exporters/GLTFExporter`

### UI & State
- State: `zustand` (timeline, selection, editor state)
- Forms/Validation: `zod`
- Charts/UI: `tailwindcss` + `shadcn/ui` (optional)
- Timeline UI: custom (HTML/CSS, not a library)
- Icons: `lucide-react`

### Auth & Infra
- Auth: JWT + bcrypt
- File storage: Local `/uploads/` for MVP; Cloudflare R2 for share links (Sprint 8+)
- Deployment target: Docker Compose (local), Fly.io or Railway (production)

---

## 3. DATABASE SCHEMA (DRIZZLE)
*Location:* `apps/backend/src/db/schema.ts`

### users
- `id` (uuid, primaryKey, default: `gen_random_uuid()`)
- `email` (text, unique, notNull)
- `password_hash` (text, notNull)
- `name` (text)
- `team_name` (text, nullable)
- `created_at` (timestamp, default: now)

### plays
- `id` (uuid, primaryKey)
- `user_id` (uuid, foreignKey: users.id, onDelete: cascade)
- `name` (text, notNull)               — e.g., "Rotation 3 — Stack Slide"
- `category` (enum: 'serve_receive' | 'attack' | 'defense' | 'transition' | 'block' | 'serve')
- `rotation` (integer, 1–6)
- `court_type` (enum: 'indoor' | 'beach', default 'indoor')
- `net_height` (numeric, default 2.43)
- `description` (text)
- `coaching_notes` (text)
- `is_public` (boolean, default false)
- `thumbnail_url` (text)
- `created_at` (timestamp, default: now)
- `updated_at` (timestamp, default: now)

### keyframes
- `id` (uuid, primaryKey)
- `play_id` (uuid, foreignKey: plays.id, onDelete: cascade)
- `timestamp_ms` (integer, notNull)
- `player_states` (jsonb, notNull)     — see shape below
- `ball_state` (jsonb, nullable)       — see shape below
- `camera_state` (jsonb, nullable)     — see shape below
- `created_at` (timestamp, default: now)

**`player_states` shape:**
```json
[
  {
    "playerId": "p1",
    "role": "setter",
    "position": { "x": 2.5, "y": 0, "z": 3 },
    "rotationY": 45,
    "pose": "approach_2",
    "animationTime": 0.4
  }
]
```
**ball_state shape:**
```json
{ "x": 3.2, "y": 2.8, "z": 1.5 }
```
**camera_state shape:**
```json
{
  "position": [12, 8, 12],
  "target": [0, 1.5, 0],
  "fov": 50
}
```

### trajectories
- `id` (uuid, primaryKey)
- `play_id` (uuid, foreignKey: plays.id, onDelete: cascade)
- `type` (enum: 'serve' | 'pass' | 'set' | 'attack' | 'block' | 'dig')
- `control_points` (jsonb, notNull) — array of `{ x, y, z }` for CatmullRomCurve3
- `start_time_ms` (integer, notNull)
- `duration_ms` (integer, notNull)
- `color` (text) — hex
- `visible` (boolean, default true)

### camera_paths
- `id` (uuid, primaryKey)
- `play_id` (uuid, foreignKey: plays.id, onDelete: cascade)
- `name` (text, notNull) — "Coaching view", "Attacker POV"
- `keyframes` (jsonb, notNull) — array of CameraKeyframe
- `is_default` (boolean, default false)

**CameraKeyframe shape:**
```json
{
  "timestamp_ms": 1200,
  "position": [4, 3, 6],
  "target": [0, 2, 0],
  "fov": 45,
  "easing": "easeInOut"
}
```

### phases
- `id` (uuid, primaryKey)
- `play_id` (uuid, foreignKey: plays.id, onDelete: cascade)
- `name` (text, notNull) — "Serve", "Pass", "Set", "Attack"
- `start_ms` (integer, notNull)
- `end_ms` (integer, notNull)
- `coaching_note` (text)

### annotations
- `id` (uuid, primaryKey)
- `play_id` (uuid, foreignKey: plays.id, onDelete: cascade)
- `text` (text, notNull)
- `position` (jsonb, notNull) — { x, y, z } in 3D space
- `visible_from_ms` (integer)
- `visible_to_ms` (integer)
- `color` (text, default '#ffffff')

### recordings
- `id` (uuid, primaryKey)
- `play_id` (uuid, foreignKey: plays.id, onDelete: cascade)
- `user_id` (uuid, foreignKey)
- `format` (enum: 'webm' | 'mp4' | 'gif' | 'glb')
- `preset` (enum: 'whatsapp' | 'instagram' | 'presentation' | 'slowmo' | 'gif' | 'glb')
- `duration_ms` (integer)
- `file_size_bytes` (integer)
- `file_url` (text)
- `thumbnail_url` (text)
- `created_at` (timestamp, default: now)

### rules (reference content — seed data)
- `id` (uuid, primaryKey)
- `category` (text, notNull) — "Scoring", "Positions", "Faults", "Rotations"
- `title` (text, notNull)
- `content` (text, notNull)
- `diagram_url` (text, nullable)
- `order_index` (integer)

**Indexes:**

```sql
CREATE INDEX ON keyframes (play_id, timestamp_ms);
CREATE INDEX ON trajectories (play_id, start_time_ms);
CREATE INDEX ON phases (play_id, start_ms);
```

## 4. PROJECT FOLDER STRUCTURE (MONOREPO)

```
rotation/
├── docker-compose.yml
├── .env.example
├── LICENSE                          (source-available)
├── README.md
├── package.json                     (root, pnpm workspaces)
├── pnpm-workspace.yaml
├── apps/
│   ├── frontend/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── public/
│   │   │   ├── manifest.webmanifest   (PWA)
│   │   │   ├── sw.js                  (service worker)
│   │   │   └── models/                (Mixamo .glb files)
│   │   ├── package.json
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── lib/trpc.ts
│   │       ├── stores/
│   │       │   ├── playStore.ts       (Zustand: current play, keyframes)
│   │       │   ├── timelineStore.ts   (currentTime, playing, speed)
│   │       │   └── cameraStore.ts     (current camera preset)
│   │       ├── features/
│   │       │   ├── court/
│   │       │   │   ├── Scene.tsx      (R3F <Canvas>)
│   │       │   │   ├── Court.tsx      (floor, lines, zones)
│   │       │   │   ├── Net.tsx
│   │       │   │   ├── Player.tsx     (mannequin or GLB)
│   │       │   │   ├── Ball.tsx
│   │       │   │   └── TrajectoryTube.tsx
│   │       │   ├── designer/
│   │       │   │   ├── DragControls.tsx
│   │       │   │   ├── ArrowDrawer.tsx
│   │       │   │   └── TrajectoryEditor.tsx
│   │       │   ├── timeline/
│   │       │   │   ├── Timeline.tsx
│   │       │   │   ├── Scrubber.tsx
│   │       │   │   └── PhaseMarkers.tsx
│   │       │   ├── camera/
│   │       │   │   ├── CameraRig.tsx
│   │       │   │   └── CameraPathEditor.tsx
│   │       │   ├── recording/
│   │       │   │   ├── useRecorder.ts
│   │       │   │   ├── exportPresets.ts
│   │       │   │   └── ShareDialog.tsx
│   │       │   ├── presentation/
│   │       │   │   ├── PresentationMode.tsx
│   │       │   │   └── ChapterBar.tsx
│   │       │   ├── library/
│   │       │   │   ├── PlayLibrary.tsx
│   │       │   │   └── PlayCard.tsx
│   │       │   ├── rules/
│   │       │   │   └── RulesBrowser.tsx
│   │       │   └── drills/
│   │       │       └── DrillMode.tsx
│   │       └── styles/globals.css
│   └── backend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── drizzle.config.ts
│       ├── src/
│       │   ├── index.ts               (Express entry)
│       │   ├── trpc.ts                (tRPC init + context)
│       │   ├── db/
│       │   │   ├── index.ts           (Drizzle client)
│       │   │   ├── schema.ts
│       │   │   └── seed.ts            (seed rules table)
│       │   ├── routers/
│       │   │   ├── _app.ts
│       │   │   ├── auth.router.ts
│       │   │   ├── play.router.ts
│       │   │   ├── keyframe.router.ts
│       │   │   ├── trajectory.router.ts
│       │   │   ├── camera.router.ts
│       │   │   ├── phase.router.ts
│       │   │   ├── rules.router.ts
│       │   │   └── recording.router.ts
│       │   ├── services/
│       │   │   ├── play.service.ts
│       │   │   └── rules.service.ts
│       │   └── middleware/
│       │       └── auth.ts
│       └── uploads/                    (gitignored)
└── packages/
    └── shared-types/
        ├── package.json
        └── src/
            ├── index.ts
            ├── play.ts
            ├── keyframe.ts
            ├── trajectory.ts
            └── camera.ts
```

## 5. API CONTRACTS (tRPC ROUTERS)
All procedures require authenticated context (userId) unless noted.

**auth.router**
- `register`: { email, password, name } → { token, user }
- `login`: { email, password } → { token, user }
- `me`: void → User

**play.router**
- `create`: { name, category, rotation, description?, coachingNotes? } → Play
- `list`: { category?, rotation? } → Play[]
- `get`: { id } → Play & { keyframes, trajectories, phases, annotations, cameraPaths }
- `update`: { id, ...partial } → Play
- `delete`: { id } → { success: boolean }
- `duplicate`: { id } → Play (deep copy)

**keyframe.router**
- `upsert`: { playId, timestampMs, playerStates, ballState?, cameraState? } → Keyframe
- `delete`: { id } → { success: boolean }
- `list`: { playId } → Keyframe[]

**trajectory.router**
- `create`: { playId, type, controlPoints, startMs, durationMs, color } → Trajectory
- `update`: { id, ...partial } → Trajectory
- `delete`: { id } → { success: boolean }

**camera.router**
- `createPath`: { playId, name, keyframes } → CameraPath
- `updatePath`: { id, ...partial } → CameraPath
- `deletePath`: { id } → { success: boolean }
- `listPaths`: { playId } → CameraPath[]

**phase.router**
- `create`: { playId, name, startMs, endMs, coachingNote? } → Phase
- `list`: { playId } → Phase[]

**rules.router**
- `list`: { category? } → Rule[]
- `search`: { query } → Rule[]

**recording.router**
- `create`: { playId, format, preset, durationMs, fileSizeBytes, fileUrl, thumbnailUrl? } → Recording
- `list`: { playId } → Recording[]
- `delete`: { id } → { success: boolean }

## 6. CRITICAL IMPLEMENTATION LOGIC (AGENT INSTRUCTIONS)

### 6.1. The R3F Scene (Court Dimensions)
Use meters as the unit. Court is 18m × 9m. Net height 2.43m (men) or 2.24m (women). Attack line is 3m from the net.

```tsx
// apps/frontend/src/features/court/Scene.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';

export function Scene() {
  return (
    <Canvas shadows camera={{ position: [12, 8, 12], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <Environment preset="warehouse" />

      {/* Court floor: 18m along X, 9m along Z */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 9]} />
        <meshStandardMaterial color="#c98b4b" />
      </mesh>

      {/* Attack lines at x = -3 and x = +3 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0.01, 0]}>
        <planeGeometry args={[0.05, 9]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.01, 0]}>
        <planeGeometry args={[0.05, 9]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Net at x = 0, height 2.43m, length 9m along Z */}
      <mesh position={[0, 1.215, 0]}>
        <boxGeometry args={[0.05, 2.43, 9]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>

      <OrbitControls target={[0, 1.5, 0]} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
```

### 6.2. Player Model (Start Simple, Upgrade Later)
**Phase 1 (MVP): Mannequin**

```tsx
// apps/frontend/src/features/court/Player.tsx
import { Html } from '@react-three/drei';

export function Player({ position, color, number, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.9, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#f0c8a0" />
      </mesh>
      <Html position={[0, 2.1, 0]} center>
        <span className="jersey">{number}</span>
      </Html>
    </group>
  );
}
```

Role colors:
- Setter: `#3b82f6` (blue)
- Outside hitter: `#ef4444` (red)
- Middle blocker: `#22c55e` (green)
- Opposite: `#eab308` (yellow)
- Libero: `#a855f7` (purple)

**Phase 2 (Sprint 5): Mixamo GLB**

```tsx
import { useGLTF, useAnimations } from '@react-three/drei';

export function PlayerGLB({ position, modelUrl, animation, animationTime }) {
  const group = useRef();
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, mixer } = useAnimations(animations, group);

  useFrame(() => {
    // Blend actions based on timeline state
    // e.g., idle → approach_1 → approach_2 → jump → spike
  });

  return <primitive ref={group} object={scene} position={position} />;
}
```

### 6.3. Ball Trajectory (Bezier Curves, Not Physics)

```tsx
// apps/frontend/src/features/court/TrajectoryTube.tsx
import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3, TubeGeometry } from 'three';

export function TrajectoryTube({ controlPoints, color }) {
  const curve = useMemo(() => {
    return new CatmullRomCurve3(
      controlPoints.map(p => new Vector3(p.x, p.y, p.z))
    );
  }, [controlPoints]);

  const geometry = useMemo(
    () => new TubeGeometry(curve, 64, 0.03, 8, false),
    [curve]
  );

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
```

Ball position at time t (0 to 1 along the curve):

```ts
const ballPos = curve.getPointAt(t);
```

Landing marker (raycast to y=0):

```ts
// Find the point on the curve where y drops below 0.12 (ball radius)
// Drop a crosshair mesh at that x,z
```

### 6.4. Timeline & Keyframe Interpolation
The timeline is the heart of the app. Every frame, compute the state by interpolating between the surrounding keyframes.

```ts
// apps/frontend/src/features/timeline/interpolate.ts
export function interpolatePlayState(
  keyframes: Keyframe[],
  currentMs: number
) {
  const sorted = [...keyframes].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const before = sorted.filter(k => k.timestamp_ms <= currentMs).pop();
  const after = sorted.find(k => k.timestamp_ms > currentMs);

  if (!before) return sorted[0]?.playerStates ?? [];
  if (!after) return before.playerStates;

  const t = (currentMs - before.timestamp_ms) /
            (after.timestamp_ms - before.timestamp_ms);

  return before.playerStates.map((p, i) => ({
    ...p,
    position: {
      x: lerp(p.position.x, after.playerStates[i].position.x, t),
      y: lerp(p.position.y, after.playerStates[i].position.y, t),
      z: lerp(p.position.z, after.playerStates[i].position.z, t),
    },
    rotationY: lerpAngle(p.rotationY, after.playerStates[i].rotationY, t),
  }));
}
```

Drive currentMs from the Zustand timelineStore. A useFrame loop advances it during playback.

### 6.5. Camera Choreography

```tsx
// apps/frontend/src/features/camera/CameraRig.tsx
export function CameraRig({ cameraPath, currentMs }) {
  const { camera } = useThree();

  useFrame(() => {
    const kfs = cameraPath.keyframes;
    const before = kfs.filter(k => k.timestamp_ms <= currentMs).pop();
    const after = kfs.find(k => k.timestamp_ms > currentMs);
    if (!before) return;

    const t = after
      ? (currentMs - before.timestamp_ms) / (after.timestamp_ms - before.timestamp_ms)
      : 1;

    const eased = before.easing === 'easeInOut' ? easeInOut(t) : t;

    camera.position.set(...lerpVec3(before.position, after?.position ?? before.position, eased));
    camera.lookAt(...lerpVec3(before.target, after?.target ?? before.target, eased));
    camera.fov = lerp(before.fov, after?.fov ?? before.fov, eased);
    camera.updateProjectionMatrix();
  });

  return null;
}
```

### 6.6. Recording — MediaRecorder + ffmpeg.wasm
See `apps/frontend/src/features/recording/useRecorder.ts` (full hook provided in prior conversation — reuse exactly).

Critical backend requirement for ffmpeg.wasm: COOP/COEP headers.

```ts
// apps/backend/src/index.ts
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
```

### 6.7. Export Presets

```ts
// apps/frontend/src/features/recording/exportPresets.ts
export const PRESETS = {
  whatsapp:     { width: 720,  height: 720,  fps: 30, crf: 26, maxMB: 16,   maxSec: 20 },
  instagram:    { width: 1080, height: 1920, fps: 30, crf: 24, maxMB: 60,   maxSec: 60 },
  presentation: { width: 1920, height: 1080, fps: 60, crf: 20, maxMB: 200,  maxSec: 120 },
  slowmo:       { width: 1080, height: 1080, fps: 60, crf: 22, maxMB: 60,   maxSec: 30, speed: 0.25 },
  gif:          { width: 480,  height: 480,  fps: 15, maxSec: 8 },
  glb:          { format: 'glb' },
};
```

### 6.8. Presentation Mode (PWA)
`manifest.webmanifest` with `display: "fullscreen"`, `orientation: "any"`, icons.

Service worker caches last N play videos + app shell.

Route `/present/:playId` enters fullscreen, hides chrome, shows chapter bar.

### 6.9. Rules Seed Data
Populate the rules table with categories: Scoring, Positions & Rotations, Faults, Contact Rules, Net Rules, Serve Rules, Libero Rules. Each rule = { category, title, content, order_index }. Aim for 30–50 rules. Diagrams are optional and can be added later.

## 7. ENVIRONMENT VARIABLES (.env.example)

```env
# Backend
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/rotation_db
JWT_SECRET=replace_with_a_long_random_string
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Frontend (Vite)
VITE_API_URL=http://localhost:4000
```

## 8. DOCKER COMPOSE
Location: `docker-compose.yml`

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: rotation_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: rotation_db
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
volumes:
  pg_data:
```

## 9. INITIALIZATION COMMANDS (RUN IN ORDER)

```bash
# 1. Root workspace
mkdir rotation && cd rotation
pnpm init -y
echo "packages:\n  - 'apps/*'\n  - 'packages/*'" > pnpm-workspace.yaml
pnpm add -D typescript @types/node -w

# 2. Backend
mkdir -p apps/backend && cd apps/backend
pnpm init
pnpm add express cors @trpc/server drizzle-orm pg bcrypt jsonwebtoken dotenv zod
pnpm add -D @types/express @types/cors @types/pg @types/bcrypt @types/jsonwebtoken tsx drizzle-kit

# 3. Frontend
cd ../.. && mkdir -p apps/frontend && cd apps/frontend
pnpm create vite . --template react-ts
pnpm add @trpc/client @trpc/react-query @tanstack/react-query three @react-three/fiber @react-three/drei @react-three/postprocessing zustand zod tailwindcss lucide-react @ffmpeg/ffmpeg @ffmpeg/util react-dropzone
pnpm add -D @types/three tailwindcss postcss autoprefixer

# 4. Shared types
cd ../.. && mkdir -p packages/shared-types && cd packages/shared-types
pnpm init && pnpm add zod

# 5. Spin up Postgres
cd ../.. && docker-compose up -d

# 6. Migrate DB
cd apps/backend
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts   # seed rules table

# 7. Dev servers (run in two terminals)
cd apps/backend && pnpm tsx watch src/index.ts
cd apps/frontend && pnpm dev
```

## 10. CODING CONVENTIONS
- **Zod first.** Every shared type lives in `packages/shared-types` as a Zod schema. Frontend and backend import it. Never duplicate type definitions.
- **Units are meters.** Never mix cm/mm. Ball radius = 0.105m. Player height ≈ 1.9m.
- **No any.** Use `unknown` and narrow. If you must escape, use `// eslint-disable-next-line` with a comment explaining why.
- **Error handling.** TRPCError for expected client errors. console.error for unexpected ones. Never swallow silently.
- **Performance.** Use `useMemo` for geometry, `useFrame` (not `useEffect`) for per-frame updates. Never allocate objects inside `useFrame`.
- **Determinism.** Playback state must be a pure function of (keyframes, currentMs). This makes recording deterministic and share links reproducible.
- **Auth.** JWT in `Authorization: Bearer <token>` header. Verified in tRPC middleware. Attached to `ctx.userId`.
- **No physics.** Ball trajectories are authored bezier curves, not Rapier/Cannon. Do not add a physics engine.

## 11. MVP MILESTONES (CHECKLIST)

**Sprint 1 — 3D Court Foundation**
- [x] Docker Compose up, Postgres running
- [x] Drizzle schema migrated
- [x] R3F `<Canvas>` renders with OrbitControls
- [x] Court floor, attack lines, net, antennas visible
- [x] Six mannequin players positioned in Rotation 1 base
- [x] Camera presets: coach view, top-down, attacker POV (dropdown switches)

**Sprint 2 — Ball & Trajectory**
- [x] Bezier curve editor (click to add control point)
- [x] Trajectory renders as a colored tube
- [x] Ball follows the curve during playback
- [x] Landing marker via raycast to floor
- [x] Color-coded by action type (serve/pass/set/attack)

**Sprint 3 — Timeline & Keyframes**
- [x] Timeline scrubber (0 to play duration)
- [x] "Record keyframe" button captures current positions
- [x] Playback interpolates between keyframes
- [x] Save play + keyframes to Postgres
- [x] Load play from the library

**Sprint 4 — Teaching Layer**
- [x] Phase markers (Serve/Pass/Set/Attack) on the timeline
- [x] 3D annotations with visibility window
- [x] Ghost trails on the floor
- [x] Slow motion (0.25× / 0.5× / 1×)
- [x] Step forward/back one frame

**Sprint 5 — Player Models (Wow Factor)**
- [x] Load Mixamo GLB into Player.tsx
- [x] Blend idle → approach → jump → spike
- [x] Sync animation time to timeline
- [x] Fallback to mannequin if model fails to load

**Sprint 6 — Camera Choreography**
- [x] Camera keyframe editor (set pos + target + fov, click "add")
- [x] Interpolate camera during playback
- [x] Save multiple camera paths per play
- [x] Preset selector during playback ("Coaching view" / "Attacker POV")

**Sprint 7 — Recording Core**
- [x] MediaRecorder captures the canvas
- [x] ffmpeg.wasm converts WebM → MP4
- [x] COOP/COEP headers on backend
- [x] Download MP4 file
- [x] `navigator.share()` integration

**Sprint 8 — Export Presets & Share**
- [x] Preset dropdown (WhatsApp, Instagram, Presentation, Slow-mo, GIF, GLB)
- [x] Resolution/aspect/bitrate applied per preset
- [x] QR code generation for play URL
- [x] Public read-only play URL (/play/:id)

**Sprint 9 — Presentation Mode (PWA)**
- [x] manifest.webmanifest + service worker
- [x] Full-screen route /present/:playId
- [x] Chapter bar with phase markers
- [x] Tap to jump phases, swipe to change speed
- [x] Installable on iOS + Android

**Sprint 10 — Studio Export (Optional)**
- [x] Frame-by-frame deterministic render
- [x] WebCodecs API for speed
- [x] Background render queue
- [x] Upload to Cloudflare R2 for share links

## 12. WHAT NOT TO DO
- ❌ Do not add a physics engine. Authored bezier curves only.
- ❌ Do not use Next.js. This is a Vite SPA.
- ❌ Do not add real-time multiplayer. Out of scope.
- ❌ Do not build a custom video encoder. Use ffmpeg.wasm.
- ❌ Do not store video files in Postgres. Filesystem or R2 only; DB stores metadata.
- ❌ Do not render player GLB models with skinning in Sprint 1. Start with capsules.
- ❌ Do not skip the COOP/COEP headers. ffmpeg.wasm will silently fail without them.

## 13. SUCCESS CRITERIA FOR MVP
By the end of Sprint 7, the following flow must work end-to-end:

1. Coach logs in on their laptop.
2. Creates a play called "Rotation 3 — Stack Slide."
3. Positions 6 players, draws the pass/set/attack trajectories.
4. Records 3 keyframes at 0s, 1.2s, 2.5s, 3.4s.
5. Sets a camera path that dollies in during the set.
6. Hits Export → WhatsApp preset.
7. Downloads a 20-second vertical MP4.
8. Taps Share → sends to the team group via WhatsApp.
9. Opens the app on their phone the next day at the gym, enters Presentation Mode, and teaches the play frame-by-frame.

If that loop works, the project is a success. Everything else is polish.

## 14. README TEMPLATE
Use this structure for README.md:

```markdown
# Rotation

A 3D volleyball teaching tool. Author plays, choreograph cameras, record video, teach on any device.

## Features
- 3D court with accurate dimensions
- Authored ball trajectories (bezier curves)
- Timeline-based keyframe animation
- Camera choreography
- Client-side video export (WebM → MP4)
- Presentation mode (PWA)

## Tech Stack
React · Vite · Three.js · React Three Fiber · Node · Express · tRPC · PostgreSQL · Drizzle · ffmpeg.wasm

## Quick Start
[pnpm commands]

## License
Source-available, all rights reserved
```

---

## IMPLEMENTATION NOTES (Tempo build)

This repository is the working implementation of the blueprint above. Deviations and additions, each chosen as the simplest option that keeps the blueprint's contracts:

- **Product name** is `Tempo`; package scope is `@tempo/*`. The blueprint's `rotation/` folder is this repo root.
- **PNPM 12** uses `allowBuilds` in `pnpm-workspace.yaml` instead of the older `onlyBuiltDependencies`.
- **`bcryptjs`** replaces native `bcrypt` so installs never need a compiler; the API and hashing behaviour are identical.
- **PGlite fallback**: the DB layer accepts `pglite://<dir>` for environments without Docker. Production still targets PostgreSQL 16 exactly as specified; migrations run on both drivers.
- **`react-router-dom`** was added for the `/play/:id`, `/view/:id`, `/present/:id`, `/drill/:id` routes the blueprint requires.
- **`play.getPublic`, `play.setPublic`, `keyframe.retime`, `play.update/delete/duplicate`, phase/annotation/camera update+delete** extend the router list with the operations the UI needs for the MVP loop.
- **drei `Environment` is not used**: it fetches an HDR from a CDN, which COEP blocks. Plain lights plus a shader-free gradient background keep recording working offline.
- **Labels are WebGL sprites, not drei `Text`/`Html`**: troika's default font and DOM overlays would not survive cross-origin isolation or canvas capture. Sprites are captured in video.
- **Mixamo GLB (Sprint 5)**: implemented as a user-asset pipeline because licensed models cannot be redistributed. `PlayerGLB.tsx` loads any skinned `.glb` via `useGLTF`, clones it per player with `SkeletonUtils`, auto-normalises scale, strips horizontal root motion, and drives an `AnimationMixer` with `mixer.setTime(currentMs + offset)` so GLB animation is a pure function of the timeline (deterministic in studio renders). Clips are mapped to the 12 volleyball poses with fuzzy name matching plus manual overrides (`lib/playerModel.ts`, `stores/modelStore.ts`, Player model panel). The procedural mannequin is the zero-asset default and the `ErrorBoundary`/`Suspense` fallback.
- **Sprint 10 (Studio export)**: `deterministicRenderer.ts` renders each frame at an exact timestamp (forcing a React flush, then a single R3F `advance()`), captures it as a `VideoFrame`, and encodes with `VideoEncoder` (H.264/VP9/AV1) into MP4 through `mp4-muxer` — the one added dependency, required for muxing WebCodecs chunks. Jobs run through an in-browser queue (`stores/renderQueueStore.ts` + `useRenderQueue.ts`) so multiple presets can be rendered back-to-back while editing continues, with progress in a floating badge. The realtime MediaRecorder path remains the fallback for browsers without WebCodecs. `POST /api/upload` stores finished files locally or in Cloudflare R2 (AWS SigV4 implemented with `node:crypto`, no SDK), returning a public URL that the share dialog turns into a direct video link and QR code.
