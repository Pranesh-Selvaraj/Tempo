import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { CameraKeyframeSchema } from '@tempo/shared-types';
import { protectedProcedure, router } from '../trpc';
import { cameraPaths } from '../db/schema';
import { assertPlayOwnership } from '../services/play.service';

const CreatePathInput = z.object({
  playId: z.string().uuid(),
  name: z.string().min(1).max(80),
  keyframes: z.array(CameraKeyframeSchema),
  isDefault: z.boolean().optional(),
});

const UpdatePathInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  keyframes: z.array(CameraKeyframeSchema).optional(),
  isDefault: z.boolean().optional(),
});

export const cameraRouter = router({
  createPath: protectedProcedure.input(CreatePathInput).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    const [row] = await ctx.db
      .insert(cameraPaths)
      .values({
        playId: input.playId,
        name: input.name,
        keyframes: input.keyframes,
        isDefault: input.isDefault ?? false,
      })
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  updatePath: protectedProcedure.input(UpdatePathInput).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select()
      .from(cameraPaths)
      .where(eq(cameraPaths.id, input.id))
      .limit(1);
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Camera path not found' });
    await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
    const [row] = await ctx.db
      .update(cameraPaths)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.keyframes !== undefined ? { keyframes: input.keyframes } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      })
      .where(eq(cameraPaths.id, input.id))
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  deletePath: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(cameraPaths)
        .where(eq(cameraPaths.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Camera path not found' });
      await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
      await ctx.db.delete(cameraPaths).where(eq(cameraPaths.id, input.id));
      return { success: true };
    }),

  listPaths: protectedProcedure
    .input(z.object({ playId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
      return ctx.db.select().from(cameraPaths).where(eq(cameraPaths.playId, input.playId));
    }),
});
