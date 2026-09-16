import { useState } from 'react';
import { FlaskConical, RotateCcw, X } from 'lucide-react';
import { resetDemoData } from '../demo';
import { DEMO_MODE } from '../lib/mode';

/**
 * Small floating badge so visitors know the static build keeps everything in
 * their browser. Rendered only when VITE_DEMO_MODE is enabled.
 */
export function DemoBadge() {
  const [hidden, setHidden] = useState(false);
  if (!DEMO_MODE || hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[70] flex items-center gap-2 rounded-full border border-sky-400/30 bg-panel-900/90 px-3 py-1.5 text-[10px] text-slate-300 shadow-lg backdrop-blur">
      <FlaskConical className="h-3 w-3 text-sky-300" />
      <span>
        Demo mode — everything is saved in <span className="text-slate-100">this browser</span>
      </span>
      <button
        type="button"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 transition hover:border-sky-400/40 hover:text-sky-100"
        onClick={() => {
          resetDemoData();
          window.location.assign('/');
        }}
      >
        <RotateCcw className="h-2.5 w-2.5" />
        Reset
      </button>
      <button
        type="button"
        aria-label="Hide demo badge"
        className="pointer-events-auto text-slate-500 transition hover:text-slate-200"
        onClick={() => setHidden(true)}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
