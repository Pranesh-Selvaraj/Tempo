import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import './styles/globals.css';
import { App } from './App';
import { bootstrapDemo, demoLink } from './demo';
import { DEMO_MODE } from './lib/mode';
import { TRPC_URL, trpc, type AppRouter } from './lib/trpc';
import { getStoredToken } from './stores/authStore';

if (DEMO_MODE) {
  // Seed the local database and sign in the demo coach before React mounts.
  bootstrapDemo();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = DEMO_MODE
  ? trpc.createClient({
      transformer: superjson,
      links: [demoLink<AppRouter>()],
    })
  : trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: TRPC_URL,
          headers() {
            const token = getStoredToken();
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    });

function Root() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// Installable PWA. The dev server is left untouched so HMR always wins.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => console.error('Service worker registration failed', error));
  });
}
