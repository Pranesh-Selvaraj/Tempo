import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { users } from '../db/schema';
import { signToken } from '../middleware/auth';

const credentials = z.object({
  email: z.string().email().max(200).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(200),
});

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    teamName: user.teamName,
    createdAt: user.createdAt,
  };
}

export const authRouter = router({
  register: publicProcedure
    .input(credentials.extend({ name: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'That email is already registered' });
      }
      const passwordHash = await hash(input.password, 10);
      const [user] = await ctx.db
        .insert(users)
        .values({ email: input.email, passwordHash, name: input.name })
        .returning();
      if (!user) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not create account' });
      }
      return { token: signToken(user.id), user: publicUser(user) };
    }),

  login: publicProcedure.input(credentials).mutation(async ({ ctx, input }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Incorrect email or password' });
    }
    return { token: signToken(user.id), user: publicUser(user) };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Account no longer exists' });
    return publicUser(user);
  }),

  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80).optional(), teamName: z.string().max(80).nullish() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .update(users)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.teamName !== undefined ? { teamName: input.teamName ?? null } : {}),
        })
        .where(eq(users.id, ctx.userId))
        .returning();
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' });
      return publicUser(user);
    }),
});
