import { TRPCError } from '@trpc/server';
import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db';
import {
  annotations,
  cameraPaths,
  keyframes,
  phases,
  plays,
  trajectories,
} from '../db/schema';

export async function assertPlayOwnership(db: Db, playId: string, userId: string) {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId)).limit(1);
  if (!play) throw new TRPCError({ code: 'NOT_FOUND', message: 'Play not found' });
  if (play.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'This play belongs to another coach' });
  }
  return play;
}

export async function getPlayDetail(
  db: Db,
  playId: string,
  options: { publicOnly?: boolean; userId?: string | null } = {},
) {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId)).limit(1);
  if (!play) throw new TRPCError({ code: 'NOT_FOUND', message: 'Play not found' });

  if (options.publicOnly && !play.isPublic) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'This play is not shared publicly' });
  }
  if (
    !options.publicOnly &&
    options.userId &&
    play.userId !== options.userId &&
    !play.isPublic
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'This play is private' });
  }

  const [playKeyframes, playTrajectories, playPhases, playAnnotations, playCameraPaths] =
    await Promise.all([
      db.select().from(keyframes).where(eq(keyframes.playId, playId)).orderBy(asc(keyframes.timestampMs)),
      db
        .select()
        .from(trajectories)
        .where(eq(trajectories.playId, playId))
        .orderBy(asc(trajectories.startMs)),
      db.select().from(phases).where(eq(phases.playId, playId)).orderBy(asc(phases.startMs)),
      db.select().from(annotations).where(eq(annotations.playId, playId)),
      db.select().from(cameraPaths).where(eq(cameraPaths.playId, playId)),
    ]);

  return {
    play,
    keyframes: playKeyframes,
    trajectories: playTrajectories,
    phases: playPhases,
    annotations: playAnnotations,
    cameraPaths: playCameraPaths,
  };
}

export type PlayDetail = Awaited<ReturnType<typeof getPlayDetail>>;

/** Deep copy of a play, all of its authored content, owned by `userId`. */
export async function duplicatePlay(db: Db, playId: string, userId: string) {
  const source = await assertPlayOwnership(db, playId, userId);

  const [copy] = await db
    .insert(plays)
    .values({
      userId,
      name: `${source.name} (copy)`,
      category: source.category,
      rotation: source.rotation,
      courtType: source.courtType,
      netHeight: source.netHeight,
      description: source.description,
      coachingNotes: source.coachingNotes,
      isPublic: false,
      thumbnailUrl: source.thumbnailUrl,
    })
    .returning();
  if (!copy) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not duplicate play' });

  const [sourceKeyframes, sourceTrajectories, sourcePhases, sourceAnnotations, sourceCameraPaths] =
    await Promise.all([
      db.select().from(keyframes).where(eq(keyframes.playId, playId)),
      db.select().from(trajectories).where(eq(trajectories.playId, playId)),
      db.select().from(phases).where(eq(phases.playId, playId)),
      db.select().from(annotations).where(eq(annotations.playId, playId)),
      db.select().from(cameraPaths).where(eq(cameraPaths.playId, playId)),
    ]);

  if (sourceKeyframes.length > 0) {
    await db.insert(keyframes).values(
      sourceKeyframes.map((row) => ({
        playId: copy.id,
        timestampMs: row.timestampMs,
        playerStates: row.playerStates,
        ballState: row.ballState,
        cameraState: row.cameraState,
      })),
    );
  }
  if (sourceTrajectories.length > 0) {
    await db.insert(trajectories).values(
      sourceTrajectories.map((row) => ({
        playId: copy.id,
        type: row.type,
        controlPoints: row.controlPoints,
        startMs: row.startMs,
        durationMs: row.durationMs,
        color: row.color,
        visible: row.visible,
      })),
    );
  }
  if (sourcePhases.length > 0) {
    await db.insert(phases).values(
      sourcePhases.map((row) => ({
        playId: copy.id,
        name: row.name,
        startMs: row.startMs,
        endMs: row.endMs,
        coachingNote: row.coachingNote,
      })),
    );
  }
  if (sourceAnnotations.length > 0) {
    await db.insert(annotations).values(
      sourceAnnotations.map((row) => ({
        playId: copy.id,
        text: row.text,
        position: row.position,
        visibleFromMs: row.visibleFromMs,
        visibleToMs: row.visibleToMs,
        color: row.color,
      })),
    );
  }
  if (sourceCameraPaths.length > 0) {
    await db.insert(cameraPaths).values(
      sourceCameraPaths.map((row) => ({
        playId: copy.id,
        name: row.name,
        keyframes: row.keyframes,
        isDefault: row.isDefault,
      })),
    );
  }

  return copy;
}

export async function findKeyframeAt(db: Db, playId: string, timestampMs: number) {
  const [row] = await db
    .select()
    .from(keyframes)
    .where(and(eq(keyframes.playId, playId), eq(keyframes.timestampMs, timestampMs)))
    .limit(1);
  return row ?? null;
}
