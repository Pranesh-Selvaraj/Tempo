import { Navigate, Route, Routes } from 'react-router-dom';
import { DemoBadge } from './components/DemoBadge';
import { DEMO_MODE } from './lib/mode';
import { useAuthStore } from './stores/authStore';
import { AuthPage } from './features/auth/AuthPage';
import { DrillMode } from './features/drills/DrillMode';
import { EditorPage } from './features/editor/EditorPage';
import { PlayLibrary } from './features/library/PlayLibrary';
import { PresentationMode } from './features/presentation/PresentationMode';
import { QuickPlayPage } from './features/quick/QuickPlayPage';
import { ScorecardPage } from './features/scorecard/ScorecardPage';
import { ViewerPage } from './features/presentation/ViewerPage';
import { RulesBrowser } from './features/rules/RulesBrowser';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((state) => state.token);
  // The static demo has no accounts to sign in with: every route is public and
  // the data lives in the browser.
  if (DEMO_MODE) return children;
  return token ? children : <AuthPage />;
}

export function App() {
  return (
    <div className="h-dvh w-screen overflow-hidden bg-panel-950 font-sans text-slate-100">
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
      <DemoBadge />
    </div>
  );
}
