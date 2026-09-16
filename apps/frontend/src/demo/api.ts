import { TRAJECTORY_COLORS, type Vec3 } from '@tempo/shared-types';
import {
  DEMO_USER_ID,
  DemoApiError,
  mutateDb,
  newId,
  readDb,
  demoIso,
  type DemoAnnotationRow,
  type DemoCameraPathRow,
  type DemoDb,
  type DemoKeyframeRow,
  type DemoPhaseRow,
  type DemoPlayRow,
  type DemoRecordingRow,
  type DemoTrajectoryRow,
  type DemoUserRow,
} from './db';


function bad(message: string, code = 'BAD_REQUEST'): never {
  throw new DemoApiError(message, code);
}

function requirePlay(db: DemoDb, id: string): DemoPlayRow {
  const play = db.plays.find((row) => row.id === id);
  if (!play) bad('Play not found', 'NOT_FOUND');
  return play;
}

function requireRow<T extends { id: string }>(rows: T[], id: string, label: string): T {
  const row = rows.find((item) => item.id === id);
  if (!row) bad(`${label} not found`, 'NOT_FOUND');
  return row;
}

function touch(play: DemoPlayRow): void {
  play.updatedAt = demoIso();
}

function publicUser(user: DemoUserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    teamName: user.teamName,
    createdAt: user.createdAt,
  };
}

function detail(db: DemoDb, playId: string) {
  const play = requirePlay(db, playId);
  return {
    play,
    keyframes: db.keyframes
      .filter((row) => row.playId === playId)
      .sort((a, b) => a.timestampMs - b.timestampMs),
    trajectories: db.trajectories
      .filter((row) => row.playId === playId)
      .sort((a, b) => a.startMs - b.startMs),
    phases: db.phases.filter((row) => row.playId === playId).sort((a, b) => a.startMs - b.startMs),
    annotations: db.annotations.filter((row) => row.playId === playId),
    cameraPaths: db.cameraPaths.filter((row) => row.playId === playId),
  };
}

type Handler = (input: any) => unknown;

const handlers: Record<string, Handler> = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  'auth.register': (input: { email: string; password: string; name: string }) =>
    mutateDb((db) => {
      const email = String(input.email).trim().toLowerCase();
      if (db.users.some((user) => user.email === email)) {
        bad('That email is already registered', 'CONFLICT');
      }
      const user: DemoUserRow = {
        id: newId(),
        email,
        password: String(input.password),
        name: String(input.name),
        teamName: null,
        createdAt: demoIso(),
      };
      db.users.push(user);
      return { token: `demo-${user.id}`, user: publicUser(user) };
    }),

  'auth.login': (input: { email: string; password: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    const email = String(input.email).trim().toLowerCase();
    const user = db.users.find((row) => row.email === email && row.password === input.password);
    if (!user) bad('Incorrect email or password', 'UNAUTHORIZED');
    return { token: `demo-${user.id}`, user: publicUser(user) };
  },

  'auth.me': () => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    const user = db.users.find((row) => row.id === DEMO_USER_ID) ?? db.users[0];
    if (!user) bad('Account no longer exists', 'UNAUTHORIZED');
    return publicUser(user);
  },

  'auth.updateProfile': (input: { name?: string; teamName?: string | null }) =>
    mutateDb((db) => {
      const user = db.users.find((row) => row.id === DEMO_USER_ID) ?? db.users[0];
      if (!user) bad('Account not found', 'NOT_FOUND');
      if (input.name !== undefined) user.name = input.name;
      if (input.teamName !== undefined) user.teamName = input.teamName ?? null;
      return publicUser(user);
    }),

  // ── Plays ─────────────────────────────────────────────────────────────────
  'play.create': (input: Record<string, any>) =>
    mutateDb((db) => {
      const timestamp = demoIso();
      const play: DemoPlayRow = {
        id: newId(),
        userId: DEMO_USER_ID,
        name: String(input.name),
        category: input.category ?? 'serve_receive',
        rotation: input.rotation ?? 1,
        formation: input.formation ?? '5-1',
        libero: input.libero ?? true,
        courtType: input.courtType ?? 'indoor',
        netHeight: input.netHeight ?? 2.43,
        description: input.description ?? null,
        coachingNotes: input.coachingNotes ?? null,
        isPublic: input.isPublic ?? false,
        thumbnailUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.plays.push(play);
      return play;
    }),

  'play.list': (input: { category?: string } | undefined) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    return db.plays
      .filter((play) => !input?.category || play.category === input.category)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  'play.get': (input: { id: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    return detail(db, input.id);
  },

  'play.getPublic': (input: { id: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    const play = requirePlay(db, input.id);
    if (!play.isPublic) bad('This play is not shared publicly', 'NOT_FOUND');
    return detail(db, input.id);
  },

  'play.update': (input: Record<string, any>) =>
    mutateDb((db) => {
      const play = requirePlay(db, input.id);
      const fields = [
        'name',
        'category',
        'rotation',
        'formation',
        'libero',
        'courtType',
        'netHeight',
        'description',
        'coachingNotes',
        'isPublic',
        'thumbnailUrl',
      ] as const;
      for (const field of fields) {
        if (input[field] !== undefined) {
          Object.assign(play, { [field]: input[field] ?? null });
        }
      }
      touch(play);
      return play;
    }),

  'play.delete': (input: { id: string }) =>
    mutateDb((db) => {
      requirePlay(db, input.id);
      db.plays = db.plays.filter((play) => play.id !== input.id);
      db.keyframes = db.keyframes.filter((row) => row.playId !== input.id);
      db.trajectories = db.trajectories.filter((row) => row.playId !== input.id);
      db.cameraPaths = db.cameraPaths.filter((row) => row.playId !== input.id);
      db.phases = db.phases.filter((row) => row.playId !== input.id);
      db.annotations = db.annotations.filter((row) => row.playId !== input.id);
      db.recordings = db.recordings.filter((row) => row.playId !== input.id);
      return { success: true };
    }),

  'play.duplicate': (input: { id: string }) =>
    mutateDb((db) => {
      const source = requirePlay(db, input.id);
      const timestamp = demoIso();
      const copy: DemoPlayRow = {
        ...source,
        id: newId(),
        name: `${source.name} (copy)`,
        isPublic: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.plays.push(copy);
      db.keyframes.push(
        ...db.keyframes
          .filter((row) => row.playId === source.id)
          .map((row) => ({ ...row, id: newId(), playId: copy.id, createdAt: timestamp })),
      );
      db.trajectories.push(
        ...db.trajectories
          .filter((row) => row.playId === source.id)
          .map((row) => ({ ...row, id: newId(), playId: copy.id })),
      );
      db.cameraPaths.push(
        ...db.cameraPaths
          .filter((row) => row.playId === source.id)
          .map((row) => ({ ...row, id: newId(), playId: copy.id })),
      );
      db.phases.push(
        ...db.phases
          .filter((row) => row.playId === source.id)
          .map((row) => ({ ...row, id: newId(), playId: copy.id })),
      );
      db.annotations.push(
        ...db.annotations
          .filter((row) => row.playId === source.id)
          .map((row) => ({ ...row, id: newId(), playId: copy.id })),
      );
      return copy;
    }),

  'play.setPublic': (input: { id: string; isPublic: boolean }) =>
    mutateDb((db) => {
      const play = requirePlay(db, input.id);
      play.isPublic = input.isPublic;
      touch(play);
      return play;
    }),

  // ── Keyframes ─────────────────────────────────────────────────────────────
  'keyframe.upsert': (input: {
    playId: string;
    timestampMs: number;
    playerStates: DemoKeyframeRow['playerStates'];
    ballState?: Vec3 | null;
    cameraState?: DemoKeyframeRow['cameraState'];
  }) =>
    mutateDb((db) => {
      const play = requirePlay(db, input.playId);
      touch(play);
      const existing = db.keyframes.find(
        (row) => row.playId === input.playId && row.timestampMs === input.timestampMs,
      );
      if (existing) {
        existing.playerStates = input.playerStates;
        existing.ballState = input.ballState ?? null;
        existing.cameraState = input.cameraState ?? null;
        return existing;
      }
      const row: DemoKeyframeRow = {
        id: newId(),
        playId: input.playId,
        timestampMs: input.timestampMs,
        playerStates: input.playerStates,
        ballState: input.ballState ?? null,
        cameraState: input.cameraState ?? null,
        createdAt: demoIso(),
      };
      db.keyframes.push(row);
      return row;
    }),

  'keyframe.delete': (input: { id: string }) =>
    mutateDb((db) => {
      const row = requireRow(db.keyframes, input.id, 'Keyframe');
      touch(requirePlay(db, row.playId));
      db.keyframes = db.keyframes.filter((item) => item.id !== input.id);
      return { success: true };
    }),

  'keyframe.list': (input: { playId: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    requirePlay(db, input.playId);
    return db.keyframes
      .filter((row) => row.playId === input.playId)
      .sort((a, b) => a.timestampMs - b.timestampMs);
  },

  'keyframe.retime': (input: { id: string; timestampMs: number }) =>
    mutateDb((db) => {
      const row = requireRow(db.keyframes, input.id, 'Keyframe');
      const conflict = db.keyframes.find(
        (item) =>
          item.playId === row.playId &&
          item.timestampMs === input.timestampMs &&
          item.id !== row.id,
      );
      if (conflict) bad('Another keyframe already exists at that time', 'CONFLICT');
      row.timestampMs = input.timestampMs;
      touch(requirePlay(db, row.playId));
      return row;
    }),

  // ── Trajectories ──────────────────────────────────────────────────────────
  'trajectory.create': (input: Record<string, any>) =>
    mutateDb((db) => {
      touch(requirePlay(db, input.playId));
      const row: DemoTrajectoryRow = {
        id: newId(),
        playId: input.playId,
        type: input.type,
        controlPoints: input.controlPoints,
        startMs: input.startMs,
        durationMs: input.durationMs,
        color: input.color ?? TRAJECTORY_COLORS[input.type as keyof typeof TRAJECTORY_COLORS] ?? null,
        visible: input.visible ?? true,
      };
      db.trajectories.push(row);
      return row;
    }),

  'trajectory.update': (input: Record<string, any>) =>
    mutateDb((db) => {
      const row = requireRow(db.trajectories, input.id, 'Trajectory');
      touch(requirePlay(db, row.playId));
      for (const field of ['type', 'controlPoints', 'startMs', 'durationMs', 'visible'] as const) {
        if (input[field] !== undefined) Object.assign(row, { [field]: input[field] });
      }
      if (input.color !== undefined) row.color = input.color ?? null;
      return row;
    }),

  'trajectory.delete': (input: { id: string }) =>
    mutateDb((db) => {
      const row = requireRow(db.trajectories, input.id, 'Trajectory');
      touch(requirePlay(db, row.playId));
      db.trajectories = db.trajectories.filter((item) => item.id !== input.id);
      return { success: true };
    }),

  'trajectory.list': (input: { playId: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    requirePlay(db, input.playId);
    return db.trajectories
      .filter((row) => row.playId === input.playId)
      .sort((a, b) => a.startMs - b.startMs);
  },

  // ── Camera paths ──────────────────────────────────────────────────────────
  'camera.createPath': (input: Record<string, any>) =>
    mutateDb((db) => {
      touch(requirePlay(db, input.playId));
      const row: DemoCameraPathRow = {
        id: newId(),
        playId: input.playId,
        name: input.name,
        keyframes: input.keyframes,
        isDefault: input.isDefault ?? false,
      };
      db.cameraPaths.push(row);
      return row;
    }),

  'camera.updatePath': (input: Record<string, any>) =>
    mutateDb((db) => {
      const row = requireRow(db.cameraPaths, input.id, 'Camera path');
      touch(requirePlay(db, row.playId));
      for (const field of ['name', 'keyframes', 'isDefault'] as const) {
        if (input[field] !== undefined) Object.assign(row, { [field]: input[field] });
      }
      return row;
    }),

  'camera.deletePath': (input: { id: string }) =>
    mutateDb((db) => {
      const row = requireRow(db.cameraPaths, input.id, 'Camera path');
      touch(requirePlay(db, row.playId));
      db.cameraPaths = db.cameraPaths.filter((item) => item.id !== input.id);
      return { success: true };
    }),

  'camera.listPaths': (input: { playId: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    requirePlay(db, input.playId);
    return db.cameraPaths.filter((row) => row.playId === input.playId);
  },

  // ── Phases ────────────────────────────────────────────────────────────────
  'phase.create': (input: Record<string, any>) =>
    mutateDb((db) => {
      if (input.endMs <= input.startMs) bad('Phase end must be after its start', 'BAD_REQUEST');
      touch(requirePlay(db, input.playId));
      const row: DemoPhaseRow = {
        id: newId(),
        playId: input.playId,
        name: input.name,
        startMs: input.startMs,
        endMs: input.endMs,
        coachingNote: input.coachingNote ?? null,
      };
      db.phases.push(row);
      return row;
    }),

  'phase.update': (input: Record<string, any>) =>
    mutateDb((db) => {
      const row = requireRow(db.phases, input.id, 'Phase');
      touch(requirePlay(db, row.playId));
      for (const field of ['name', 'startMs', 'endMs'] as const) {
        if (input[field] !== undefined) Object.assign(row, { [field]: input[field] });
      }
      if (input.coachingNote !== undefined) row.coachingNote = input.coachingNote ?? null;
      if (row.endMs <= row.startMs) bad('Phase end must be after its start', 'BAD_REQUEST');
      return row;
    }),

  'phase.delete': (input: { id: string }) =>
    mutateDb((db) => {
      const row = requireRow(db.phases, input.id, 'Phase');
      touch(requirePlay(db, row.playId));
      db.phases = db.phases.filter((item) => item.id !== input.id);
      return { success: true };
    }),

  'phase.list': (input: { playId: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    requirePlay(db, input.playId);
    return db.phases
      .filter((row) => row.playId === input.playId)
      .sort((a, b) => a.startMs - b.startMs);
  },

  // ── Annotations ───────────────────────────────────────────────────────────
  'annotation.create': (input: Record<string, any>) =>
    mutateDb((db) => {
      touch(requirePlay(db, input.playId));
      const row: DemoAnnotationRow = {
        id: newId(),
        playId: input.playId,
        text: input.text,
        position: input.position,
        visibleFromMs: input.visibleFromMs ?? null,
        visibleToMs: input.visibleToMs ?? null,
        color: input.color ?? '#ffffff',
      };
      db.annotations.push(row);
      return row;
    }),

  'annotation.update': (input: Record<string, any>) =>
    mutateDb((db) => {
      const row = requireRow(db.annotations, input.id, 'Annotation');
      touch(requirePlay(db, row.playId));
      for (const field of ['text', 'position'] as const) {
        if (input[field] !== undefined) Object.assign(row, { [field]: input[field] });
      }
      if (input.visibleFromMs !== undefined) row.visibleFromMs = input.visibleFromMs ?? null;
      if (input.visibleToMs !== undefined) row.visibleToMs = input.visibleToMs ?? null;
      if (input.color !== undefined) row.color = input.color;
      return row;
    }),

  'annotation.delete': (input: { id: string }) =>
    mutateDb((db) => {
      const row = requireRow(db.annotations, input.id, 'Annotation');
      touch(requirePlay(db, row.playId));
      db.annotations = db.annotations.filter((item) => item.id !== input.id);
      return { success: true };
    }),

  'annotation.list': (input: { playId: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    requirePlay(db, input.playId);
    return db.annotations.filter((row) => row.playId === input.playId);
  },

  // ── Rules ─────────────────────────────────────────────────────────────────
  'rules.list': (input: { category?: string } | undefined) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    return db.rules
      .filter((rule) => !input?.category || rule.category === input.category)
      .sort(
        (a, b) => a.category.localeCompare(b.category) || a.orderIndex - b.orderIndex,
      );
  },

  'rules.search': (input: { query: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    const term = input.query.trim().toLowerCase();
    if (!term) return [];
    return db.rules
      .filter(
        (rule) =>
          rule.title.toLowerCase().includes(term) || rule.content.toLowerCase().includes(term),
      )
      .sort((a, b) => a.category.localeCompare(b.category) || a.orderIndex - b.orderIndex)
      .slice(0, 50);
  },

  // ── Recordings (metadata only — files never leave the browser) ───────────
  'recording.create': (input: Record<string, any>) =>
    mutateDb((db) => {
      touch(requirePlay(db, input.playId));
      const row: DemoRecordingRow = {
        id: newId(),
        playId: input.playId,
        userId: DEMO_USER_ID,
        format: input.format,
        preset: input.preset,
        durationMs: input.durationMs,
        fileSizeBytes: input.fileSizeBytes,
        fileUrl: input.fileUrl ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        createdAt: demoIso(),
      };
      db.recordings.push(row);
      return row;
    }),

  'recording.list': (input: { playId: string }) => {
    const db = readDb();
    if (!db) bad('Demo database is not initialised', 'INTERNAL_SERVER_ERROR');
    requirePlay(db, input.playId);
    return db.recordings
      .filter((row) => row.playId === input.playId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  'recording.delete': (input: { id: string }) =>
    mutateDb((db) => {
      requireRow(db.recordings, input.id, 'Recording');
      db.recordings = db.recordings.filter((row) => row.id !== input.id);
      return { success: true };
    }),
};

export function runDemoProcedure(path: string, input: unknown): unknown {
  const handler = handlers[path];
  if (!handler) {
    bad(`Demo mode does not implement "${path}"`, 'NOT_IMPLEMENTED');
  }
  return handler(input);
}
