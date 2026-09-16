import {
  DEMO_STORAGE_KEY,
  DEMO_TOKEN,
} from '../lib/mode';
import type {
  CourtType,
  Formation,
  PlayerState,
  PlayCategory,
  RecordingFormat,
  RecordingPresetId,
  TrajectoryType,
  Vec3,
  CameraKeyframe,
} from '@tempo/shared-types';

/** Rows mirror the Postgres schema, with dates stored as ISO strings. */
export interface DemoUserRow {
  id: string;
  email: string;
  /** Plaintext on purpose: this is a browser-local demo, never sent anywhere. */
  password: string;
  name: string | null;
  teamName: string | null;
  createdAt: string;
}

export interface DemoPlayRow {
  id: string;
  userId: string;
  name: string;
  category: PlayCategory;
  rotation: number;
  formation: Formation;
  libero: boolean;
  courtType: CourtType;
  netHeight: number;
  description: string | null;
  coachingNotes: string | null;
  isPublic: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemoKeyframeRow {
  id: string;
  playId: string;
  timestampMs: number;
  playerStates: PlayerState[];
  ballState: Vec3 | null;
  cameraState: { position: [number, number, number]; target: [number, number, number]; fov: number } | null;
  createdAt: string;
}

export interface DemoTrajectoryRow {
  id: string;
  playId: string;
  type: TrajectoryType;
  controlPoints: Vec3[];
  startMs: number;
  durationMs: number;
  color: string | null;
  visible: boolean;
}

export interface DemoCameraPathRow {
  id: string;
  playId: string;
  name: string;
  keyframes: CameraKeyframe[];
  isDefault: boolean;
}

export interface DemoPhaseRow {
  id: string;
  playId: string;
  name: string;
  startMs: number;
  endMs: number;
  coachingNote: string | null;
}

export interface DemoAnnotationRow {
  id: string;
  playId: string;
  text: string;
  position: Vec3;
  visibleFromMs: number | null;
  visibleToMs: number | null;
  color: string;
}

export interface DemoRecordingRow {
  id: string;
  playId: string;
  userId: string;
  format: RecordingFormat;
  preset: RecordingPresetId;
  durationMs: number;
  fileSizeBytes: number;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface DemoRuleRow {
  id: string;
  category: string;
  title: string;
  content: string;
  diagramUrl: string | null;
  orderIndex: number;
}

export interface DemoDb {
  version: 1;
  users: DemoUserRow[];
  plays: DemoPlayRow[];
  keyframes: DemoKeyframeRow[];
  trajectories: DemoTrajectoryRow[];
  cameraPaths: DemoCameraPathRow[];
  phases: DemoPhaseRow[];
  annotations: DemoAnnotationRow[];
  recordings: DemoRecordingRow[];
  rules: DemoRuleRow[];
}

export const DEMO_USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

export function demoIso(date: Date = new Date()): string {
  return date.toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

let memoryFallback: DemoDb | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readDb(): DemoDb | null {
  const store = storage();
  if (!store) return memoryFallback;
  try {
    const raw = store.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoDb;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDb(db: DemoDb): void {
  const store = storage();
  if (!store) {
    memoryFallback = db;
    return;
  }
  try {
    store.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('[demo] could not persist database', error);
  }
}

export function clearDemoDb(): void {
  memoryFallback = null;
  const store = storage();
  try {
    store?.removeItem(DEMO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Load → change → persist in one step. */
export function mutateDb<T>(fn: (db: DemoDb) => T): T {
  const db = readDb();
  if (!db) throw new Error('Demo database is not initialised');
  const result = fn(db);
  writeDb(db);
  return result;
}

export class DemoApiError extends Error {
  readonly code: string;

  constructor(message: string, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'DemoApiError';
    this.code = code;
  }
}

export { DEMO_TOKEN, DEMO_STORAGE_KEY };
