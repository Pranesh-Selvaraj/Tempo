import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { Vec3Schema } from '@tempo/shared-types';
import { protectedProcedure, router } from '../trpc';
import { annotations } from '../db/schema';
import { assertPlayOwnership } from '../services/play.service';

const CreateInput = z.object({
  playId: z.string().uuid(),
  text: z.string().min(1).max(240),
  position: Vec3Schema,
  visibleFromMs: z.number().int().min(0).nullish(),
  visibleToMs: z.number().int().min(0).nullish(),
  color: z.string().optional(),
});

const UpdateInput = CreateInput.partial().extend({ id: z.string().uuid() });

export const annotationRouter = router({
  create: protectedProcedure.input(CreateInput).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    const [row] = await ctx.db
      .insert(annotations)
      .values({
        playId: input.playId,
        text: input.text,
        position: input.position,
        visibleFromMs: input.visibleFromMs ?? null,
        visibleToMs: input.visibleToMs ?? null,
        color: input.color ?? '#ffffff',
      })
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  update: protectedProcedure.input(UpdateInput).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select()
      .from(annotations)
      .where(eq(annotations.id, input.id))
      .limit(1);
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annotation not found' });
    await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(annotations)
      .set({
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
        ...(patch.visibleFromMs !== undefined ? { visibleFromMs: patch.visibleFromMs ?? null } : {}),
        ...(patch.visibleToMs !== undefined ? { visibleToMs: patch.visibleToMs ?? null } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      })
      .where(eq(annotations.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(annotations)
        .where(eq(annotations.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annotation not found' });
      await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
      await ctx.db.delete(annotations).where(eq(annotations.id, input.id));
      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({ playId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
      return ctx.db.select().from(annotations).where(eq(annotations.playId, input.playId));
    }),
});
