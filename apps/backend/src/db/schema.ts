import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  BallState,
  CameraKeyframe,
  CameraState,
  PlayerState,
  Vec3,
} from '@tempo/shared-types';

export const playCategoryEnum = pgEnum('play_category', [
  'serve_receive',
  'attack',
  'defense',
  'transition',
  'block',
  'serve',
]);

export const courtTypeEnum = pgEnum('court_type', ['indoor', 'beach']);

export const trajectoryTypeEnum = pgEnum('trajectory_type', [
  'serve',
  'pass',
  'set',
  'attack',
  'block',
  'dig',
]);

export const recordingFormatEnum = pgEnum('recording_format', ['webm', 'mp4', 'gif', 'glb']);

export const recordingPresetEnum = pgEnum('recording_preset', [
  'whatsapp',
  'instagram',
  'presentation',
  'slowmo',
  'gif',
  'glb',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  teamName: text('team_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const plays = pgTable('plays', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: playCategoryEnum('category').notNull().default('serve_receive'),
  rotation: integer('rotation').notNull().default(1),
  formation: text('formation').notNull().default('5-1'),
  libero: boolean('libero').notNull().default(true),
  courtType: courtTypeEnum('court_type').notNull().default('indoor'),
  netHeight: numeric('net_height', { precision: 4, scale: 2, mode: 'number' }).notNull().default(2.43),
  description: text('description'),
  coachingNotes: text('coaching_notes'),
  isPublic: boolean('is_public').notNull().default(false),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const keyframes = pgTable(
  'keyframes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playId: uuid('play_id')
      .notNull()
      .references(() => plays.id, { onDelete: 'cascade' }),
    timestampMs: integer('timestamp_ms').notNull(),
    playerStates: jsonb('player_states').$type<PlayerState[]>().notNull(),
    ballState: jsonb('ball_state').$type<BallState>(),
    cameraState: jsonb('camera_state').$type<CameraState>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('keyframes_play_time_idx').on(t.playId, t.timestampMs),
    uniqueIndex('keyframes_play_time_uq').on(t.playId, t.timestampMs),
  ],
);

export const trajectories = pgTable(
  'trajectories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playId: uuid('play_id')
      .notNull()
      .references(() => plays.id, { onDelete: 'cascade' }),
    type: trajectoryTypeEnum('type').notNull(),
    controlPoints: jsonb('control_points').$type<Vec3[]>().notNull(),
    startMs: integer('start_time_ms').notNull(),
    durationMs: integer('duration_ms').notNull(),
    color: text('color'),
    visible: boolean('visible').notNull().default(true),
  },
  (t) => [index('trajectories_play_start_idx').on(t.playId, t.startMs)],
);

export const cameraPaths = pgTable('camera_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  playId: uuid('play_id')
    .notNull()
    .references(() => plays.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyframes: jsonb('keyframes').$type<CameraKeyframe[]>().notNull(),
  isDefault: boolean('is_default').notNull().default(false),
});

export const phases = pgTable(
  'phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playId: uuid('play_id')
      .notNull()
      .references(() => plays.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    coachingNote: text('coaching_note'),
  },
  (t) => [index('phases_play_start_idx').on(t.playId, t.startMs)],
);

export const annotations = pgTable('annotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  playId: uuid('play_id')
    .notNull()
    .references(() => plays.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  position: jsonb('position').$type<Vec3>().notNull(),
  visibleFromMs: integer('visible_from_ms'),
  visibleToMs: integer('visible_to_ms'),
  color: text('color').notNull().default('#ffffff'),
});

export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  playId: uuid('play_id')
    .notNull()
    .references(() => plays.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  format: recordingFormatEnum('format').notNull(),
  preset: recordingPresetEnum('preset').notNull(),
  durationMs: integer('duration_ms').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  fileUrl: text('file_url'),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  diagramUrl: text('diagram_url'),
  orderIndex: integer('order_index').notNull().default(0),
});

export type UserRow = typeof users.$inferSelect;
export type PlayRow = typeof plays.$inferSelect;
export type KeyframeRow = typeof keyframes.$inferSelect;
export type TrajectoryRow = typeof trajectories.$inferSelect;
export type CameraPathRow = typeof cameraPaths.$inferSelect;
export type PhaseRow = typeof phases.$inferSelect;
export type AnnotationRow = typeof annotations.$inferSelect;
export type RecordingRow = typeof recordings.$inferSelect;
export type RuleRow = typeof rules.$inferSelect;
