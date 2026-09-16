import { AlertTriangle, X } from 'lucide-react';
import { useStorageStatus } from './storageStatus';

/** Red banner shown when a browser-storage write fails (quota exceeded). */
export function StorageWarning() {
  const error = useStorageStatus((state) => state.error);
  if (!error) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-red-500/95 px-4 py-2 text-center text-xs font-medium text-white">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
      <button
        type="button"
        aria-label="Dismiss storage warning"
        className="ml-1 text-white/80 transition hover:text-white"
        onClick={() => useStorageStatus.getState().setError(null)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
