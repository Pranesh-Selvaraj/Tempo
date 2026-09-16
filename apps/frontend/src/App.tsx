import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DemoBadge } from './components/DemoBadge';
import { MasterGate } from './demo/MasterGate';
import { useMasterStore } from './demo/masterStore';
import { OnboardingTour } from './demo/OnboardingTour';
import { StorageWarning } from './demo/StorageWarning';
import { BRAND_ICON } from './lib/brand';
import { DEMO_MODE } from './lib/mode';
import { useAuthStore } from './stores/authStore';

/**
 * Routes are split so the 3D editor, quick play and recording code only load
 * when a coach actually opens them — the library stays fast on phones.
 */
const AuthPage = lazy(() =>
  import('./features/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
);
const DrillMode = lazy(() =>
  import('./features/drills/DrillMode').then((module) => ({ default: module.DrillMode })),
);
const EditorPage = lazy(() =>
  import('./features/editor/EditorPage').then((module) => ({ default: module.EditorPage })),
);
const PlayLibrary = lazy(() =>
  import('./features/library/PlayLibrary').then((module) => ({ default: module.PlayLibrary })),
);
const PresentationMode = lazy(() =>
  import('./features/presentation/PresentationMode').then((module) => ({
    default: module.PresentationMode,
  })),
);
const ViewerPage = lazy(() =>
  import('./features/presentation/ViewerPage').then((module) => ({ default: module.ViewerPage })),
);
const QuickPlayPage = lazy(() =>
  import('./features/quick/QuickPlayPage').then((module) => ({ default: module.QuickPlayPage })),
);
const ScorecardPage = lazy(() =>
  import('./features/scorecard/ScorecardPage').then((module) => ({ default: module.ScorecardPage })),
);
const RulesBrowser = lazy(() =>
  import('./features/rules/RulesBrowser').then((module) => ({ default: module.RulesBrowser })),
);

function RouteLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
      <img src={BRAND_ICON} alt="" className="h-10 w-10 animate-pulse rounded-xl" />
      <span className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </span>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((state) => state.token);
  // The static demo has no accounts to sign in with: every route is public and
  // the data lives in the browser.
  if (DEMO_MODE) return children;
  return token ? children : <AuthPage />;
}

export function App() {
  const unlocked = useMasterStore((state) => state.unlocked);

  // The static preview is gated behind the master credentials before any
  // route (including viewer links) renders.
  if (DEMO_MODE && !unlocked) return <MasterGate />;

  return (
    <div className="h-dvh w-screen overflow-hidden bg-panel-950 font-sans text-slate-100">
      {DEMO_MODE && <StorageWarning />}
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <PlayLibrary />
              </RequireAuth>
            }
          />
          <Route
            path="/play/:playId"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/interactive"
            element={
              <RequireAuth>
                <QuickPlayPage />
              </RequireAuth>
            }
          />
          <Route
            path="/drill/:playId"
            element={
              <RequireAuth>
                <DrillMode />
              </RequireAuth>
            }
          />
          <Route path="/view/:playId" element={<ViewerPage />} />
          <Route path="/present/:playId" element={<PresentationMode />} />
          <Route path="/rules" element={<RulesBrowser />} />
          <Route path="/scorecard" element={<ScorecardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <DemoBadge />
      <OnboardingTour />
    </div>
  );
}
