import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import {
  TRAJECTORY_COLORS,
  TrajectoryTypeSchema,
  Vec3Schema,
} from '@tempo/shared-types';
import { protectedProcedure, router } from '../trpc';
import { trajectories } from '../db/schema';
import { assertPlayOwnership } from '../services/play.service';

const CreateInput = z.object({
  playId: z.string().uuid(),
  type: TrajectoryTypeSchema,
  controlPoints: z.array(Vec3Schema).min(2),
  startMs: z.number().int().min(0),
  durationMs: z.number().int().min(1).max(60_000),
  color: z.string().optional(),
  visible: z.boolean().optional(),
});

const UpdateInput = CreateInput.partial().extend({
  id: z.string().uuid(),
  color: z.string().nullish(),
});

export const trajectoryRouter = router({
  create: protectedProcedure.input(CreateInput).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    const [row] = await ctx.db
      .insert(trajectories)
      .values({
        playId: input.playId,
        type: input.type,
        controlPoints: input.controlPoints,
        startMs: input.startMs,
        durationMs: input.durationMs,
        color: input.color ?? TRAJECTORY_COLORS[input.type],
        visible: input.visible ?? true,
      })
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  update: protectedProcedure.input(UpdateInput).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select()
      .from(trajectories)
      .where(eq(trajectories.id, input.id))
      .limit(1);
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trajectory not found' });
    await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(trajectories)
      .set({
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.controlPoints !== undefined ? { controlPoints: patch.controlPoints } : {}),
        ...(patch.startMs !== undefined ? { startMs: patch.startMs } : {}),
        ...(patch.durationMs !== undefined ? { durationMs: patch.durationMs } : {}),
        ...(patch.color !== undefined ? { color: patch.color ?? null } : {}),
        ...(patch.visible !== undefined ? { visible: patch.visible } : {}),
      })
      .where(eq(trajectories.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(trajectories)
        .where(eq(trajectories.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trajectory not found' });
      await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
      await ctx.db.delete(trajectories).where(eq(trajectories.id, input.id));
      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({ playId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
      return ctx.db
        .select()
        .from(trajectories)
        .where(eq(trajectories.playId, input.playId))
        .orderBy(asc(trajectories.startMs));
    }),
});
