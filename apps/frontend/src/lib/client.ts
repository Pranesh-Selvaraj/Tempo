import { createTRPCProxyClient, httpBatchLink, type CreateTRPCProxyClient } from '@trpc/client';
import superjson from 'superjson';
import { demoLink } from '../demo/link';
import { getStoredToken } from '../stores/authStore';
import { DEMO_MODE } from './mode';
import { TRPC_URL, trpc, type AppRouter } from './trpc';

const links = DEMO_MODE
  ? [demoLink<AppRouter>()]
  : [
      httpBatchLink({
        url: TRPC_URL,
        headers() {
          const token = getStoredToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ];

const options = { transformer: superjson, links };

/** Raw client passed to the React provider. */
export const trpcClient = trpc.createClient(options);

/**
 * Typed procedure proxy for non-React code (editor history reconciliation).
 * Uses the same links/options as the provider client.
 */
export const trpcApi: CreateTRPCProxyClient<AppRouter> =
  createTRPCProxyClient<AppRouter>(options);
