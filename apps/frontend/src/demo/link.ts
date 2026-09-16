import { TRPCClientError, type TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { runDemoProcedure } from './api';

/**
 * A terminating tRPC link that answers every call from the in-browser demo
 * database. No fetch, no API URL, no transformer — inputs and outputs stay as
 * plain objects, exactly what the React components expect.
 */
export function demoLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
  return () => ({ op }) =>
    observable((observer) => {
      let cancelled = false;

      Promise.resolve()
        .then(() => runDemoProcedure(op.path, op.input))
        .then((data) => {
          if (cancelled) return;
          observer.next({ result: { data } });
          observer.complete();
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          const error = cause instanceof Error ? cause : new Error(String(cause));
          observer.error(TRPCClientError.from(error));
        });

      return () => {
        cancelled = true;
      };
    });
}
