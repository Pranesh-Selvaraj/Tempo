import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { listRules, searchRules } from '../services/rules.service';

export const rulesRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => listRules(ctx.db, input.category)),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => searchRules(ctx.db, input.query)),
});
