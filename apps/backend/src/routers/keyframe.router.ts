import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import { KeyframeUpsertInputSchema } from '@tempo/shared-types';
import { protectedProcedure, router } from '../trpc';
import { keyframes } from '../db/schema';
import { assertPlayOwnership, findKeyframeAt } from '../services/play.service';

const PlayScopedInput = z.object({ playId: z.string().uuid() });
const IdInput = z.object({ id: z.string().uuid() });

export const keyframeRouter = router({
  upsert: protectedProcedure.input(KeyframeUpsertInputSchema).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    const values = {
      playerStates: input.playerStates,
      ballState: input.ballState ?? null,
      cameraState: input.cameraState ?? null,
    };
    const existing = await findKeyframeAt(ctx.db, input.playId, input.timestampMs);
    if (existing) {
      const [row] = await ctx.db
        .update(keyframes)
        .set(values)
        .where(eq(keyframes.id, existing.id))
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }
    const [row] = await ctx.db
      .insert(keyframes)
      .values({ playId: input.playId, timestampMs: input.timestampMs, ...values })
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  delete: protectedProcedure.input(IdInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(keyframes).where(eq(keyframes.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Keyframe not found' });
    await assertPlayOwnership(ctx.db, row.playId, ctx.userId);
    await ctx.db.delete(keyframes).where(eq(keyframes.id, input.id));
    return { success: true };
  }),

  list: protectedProcedure.input(PlayScopedInput).query(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    return ctx.db
      .select()
      .from(keyframes)
      .where(eq(keyframes.playId, input.playId))
      .orderBy(asc(keyframes.timestampMs));
  }),

  retime: protectedProcedure
    .input(z.object({ id: z.string().uuid(), timestampMs: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(keyframes).where(eq(keyframes.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Keyframe not found' });
      await assertPlayOwnership(ctx.db, row.playId, ctx.userId);
      const conflict = await findKeyframeAt(ctx.db, row.playId, input.timestampMs);
      if (conflict && conflict.id !== row.id) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Another keyframe already exists at that time',
        });
      }
      const [updated] = await ctx.db
        .update(keyframes)
        .set({ timestampMs: input.timestampMs })
        .where(and(eq(keyframes.id, input.id)))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return updated;
    }),
});
