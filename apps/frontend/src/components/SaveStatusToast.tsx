import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { useSaveStatusStore } from '../stores/saveStatusStore';

/** Floating save feedback used by the editor. Errors persist until dismissed. */
export function SaveStatusToast() {
  const status = useSaveStatusStore((state) => state.status);
  const message = useSaveStatusStore((state) => state.message);
  const reset = useSaveStatusStore((state) => state.reset);

  if (status === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto fixed bottom-52 right-4 z-40 flex max-w-xs items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-lg backdrop-blur',
        status === 'error'
          ? 'border-red-400/40 bg-red-950/80 text-red-100'
          : status === 'saving'
            ? 'border-white/10 bg-panel-900/90 text-slate-300'
            : 'border-emerald-400/30 bg-emerald-950/80 text-emerald-100',
      )}
    >
      {status === 'saving' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      {status === 'saved' && <Check className="h-3.5 w-3.5 shrink-0" />}
      {status === 'error' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      <span className="min-w-0 flex-1">
        {status === 'error' ? `Could not save: ${message}` : (message ?? 'All changes saved')}
      </span>
      {status === 'error' && (
        <button
          type="button"
          aria-label="Dismiss save error"
          className="shrink-0 text-red-200/70 transition hover:text-red-100"
          onClick={reset}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
