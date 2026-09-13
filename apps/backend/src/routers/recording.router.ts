import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { RecordingFormatSchema, RecordingPresetSchema } from '@tempo/shared-types';
import { protectedProcedure, router } from '../trpc';
import { recordings } from '../db/schema';
import { assertPlayOwnership } from '../services/play.service';

const CreateInput = z.object({
  playId: z.string().uuid(),
  format: RecordingFormatSchema,
  preset: RecordingPresetSchema,
  durationMs: z.number().int().min(0),
  fileSizeBytes: z.number().int().min(0),
  fileUrl: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
});

export const recordingRouter = router({
  create: protectedProcedure.input(CreateInput).mutation(async ({ ctx, input }) => {
    await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
    const [row] = await ctx.db
      .insert(recordings)
      .values({
        playId: input.playId,
        userId: ctx.userId,
        format: input.format,
        preset: input.preset,
        durationMs: input.durationMs,
        fileSizeBytes: input.fileSizeBytes,
        fileUrl: input.fileUrl ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
      })
      .returning();
    if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return row;
  }),

  list: protectedProcedure
    .input(z.object({ playId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlayOwnership(ctx.db, input.playId, ctx.userId);
      return ctx.db
        .select()
        .from(recordings)
        .where(eq(recordings.playId, input.playId))
        .orderBy(desc(recordings.createdAt));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(recordings)
        .where(eq(recordings.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Recording not found' });
      await assertPlayOwnership(ctx.db, existing.playId, ctx.userId);
      await ctx.db.delete(recordings).where(eq(recordings.id, input.id));
      return { success: true };
    }),
});
