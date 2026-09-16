import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { usePlayStore } from '../../stores/playStore';

const HINT_KEY = 'tempo.editor.hints.v1';

/** First-run tips shown over an empty play; dismissed forever after closing. */
export function FirstRunHints() {
  const keyframes = usePlayStore((state) => state.keyframes);
  const trajectories = usePlayStore((state) => state.trajectories);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return true;
    }
  });

  if (dismissed || keyframes.length > 0 || trajectories.length > 0) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 w-[min(92%,26rem)] -translate-x-1/2 rounded-xl border border-sky-400/25 bg-panel-900/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
        <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-400">
          <p className="font-semibold text-slate-100">Getting started</p>
          <ul className="mt-1 space-y-0.5">
            <li>· Drag players on the court to move them.</li>
            <li>
              · Press{' '}
              <kbd className="rounded border border-white/10 bg-white/5 px-1 text-slate-200">K</kbd>{' '}
              or click <span className="text-slate-200">Record keyframe</span> to snapshot a moment.
            </li>
            <li>
              · Use the <span className="text-slate-200">Ball</span> tool to draw a path, then scrub
              the timeline to preview.
            </li>
          </ul>
        </div>
        <button
          type="button"
          aria-label="Dismiss tips"
          className="text-slate-500 transition hover:text-slate-200"
          onClick={dismiss}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
