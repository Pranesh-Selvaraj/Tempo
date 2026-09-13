import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { protectedProcedure, router } from '../trpc';
import { phases } from '../db/schema';
import { assertPlayOwnership } from '../services/play.service';

const CreateInput = z
  .object({
    playId: z.string().uuid(),
    name: z.string().min(1).max(80),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    coachingNote: z.string().max(2000).nullish(),
  })
  .refine((value) => value.endMs > value.startMs, {
    message: 'Phase end must be after its start',
    path: ['endMs'],
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  startMs: z.number().int().min(0).optional(),
  endMs: z.number().int().min(0).optional(),
  coachingNote: z.string().max(2000).nullish(),
});

export const phaseRouter = router({
  create: protectedProcedure.input(CreateInput).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    const [row] = await ctx.db
      .insert(phases)
      .values({
        playId: input.playId,
        name: input.name,
        startMs: input.startMs,
        endMs: input.endMs,
        coachingNote: input.coachingNote ?? null,
      })
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  update: protectedProcedure.input(UpdateInput).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db.select().from(phases).where(eq(phases.id, input.id)).limit(1);
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Phase not found' });
    await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
    const [row] = await ctx.db
      .update(phases)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.startMs !== undefined ? { startMs: input.startMs } : {}),
        ...(input.endMs !== undefined ? { endMs: input.endMs } : {}),
        ...(input.coachingNote !== undefined ? { coachingNote: input.coachingNote ?? null } : {}),
      })
      .where(eq(phases.id, input.id))
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db.select().from(phases).where(eq(phases.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Phase not found' });
      await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
      await ctx.db.delete(phases).where(eq(phases.id, input.id));
      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({ playId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
      return ctx.db
        .select()
        .from(phases)
        .where(eq(phases.playId, input.playId))
        .orderBy(asc(phases.startMs));
    }),
});
