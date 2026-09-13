import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import {
  PlayCreateInputSchema,
  PlayIdInputSchema,
  PlayListInputSchema,
  PlayUpdateInputSchema,
} from '@tempo/shared-types';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { plays } from '../db/schema';
import { assertPlayOwnership, duplicatePlay, getPlayDetail } from '../services/play.service';

export const playRouter = router({
  create: protectedProcedure.input(PlayCreateInputSchema).mutation(async ({ ctx, input }) => {
    const [play] = await ctx.db
      .insert(plays)
      .values({
        userId: ctx.userId,
        name: input.name,
        category: input.category,
        rotation: input.rotation,
        courtType: input.courtType,
        netHeight: input.netHeight,
        description: input.description ?? null,
        coachingNotes: input.coachingNotes ?? null,
        isPublic: input.isPublic,
      })
      .returning();
    if (!play) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not create play' });
    return play;
  }),

  list: protectedProcedure.input(PlayListInputSchema).query(async ({ ctx, input }) => {
    const conditions = [eq(plays.userId, ctx.userId)];
    if (input.category) conditions.push(eq(plays.category, input.category));
    if (input.rotation) conditions.push(eq(plays.rotation, input.rotation));
    return ctx.db
      .select()
      .from(plays)
      .where(and(...conditions))
      .orderBy(desc(plays.updatedAt));
  }),

  get: protectedProcedure.input(PlayIdInputSchema).query(async ({ ctx, input }) => {
    const play = await assertPlayOwnership(ctx.db, input.id, ctx.userId);
    const detail = await getPlayDetail(ctx.db, input.id);
    return { ...detail, play };
  }),

  /** Read-only endpoint for share links and presentation mode. */
  getPublic: publicProcedure
    .input(PlayIdInputSchema)
    .query(async ({ ctx, input }) => getPlayDetail(ctx.db, input.id, { publicOnly: true })),

  update: protectedProcedure.input(PlayUpdateInputSchema).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.id, ctx.userId);
    const { id, description, coachingNotes, thumbnailUrl, ...rest } = input;
    const [play] = await ctx.db
      .update(plays)
      .set({
        ...rest,
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(coachingNotes !== undefined ? { coachingNotes: coachingNotes ?? null } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl: thumbnailUrl ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(plays.id, id))
      .returning();
    if (!play) throw new TRPCError({ code: 'NOT_FOUND', message: 'Play not found' });
    return play;
  }),

  delete: protectedProcedure.input(PlayIdInputSchema).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.id, ctx.userId);
    await ctx.db.delete(plays).where(eq(plays.id, input.id));
    return { success: true };
  }),

  duplicate: protectedProcedure.input(PlayIdInputSchema).mutation(async ({ ctx, input }) => {
    return duplicatePlay(ctx.db, input.id, ctx.userId);
  }),

  setPublic: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlayOwnership(ctx.db, input.id, ctx.userId);
      const [play] = await ctx.db
        .update(plays)
        .set({ isPublic: input.isPublic, updatedAt: new Date() })
        .where(eq(plays.id, input.id))
        .returning();
      if (!play) throw new TRPCError({ code: 'NOT_FOUND', message: 'Play not found' });
      return play;
    }),
});
