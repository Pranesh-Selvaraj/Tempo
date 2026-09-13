import { History, RotateCcw, Trash2 } from 'lucide-react';
import { useScorecardStore } from '../../stores/scorecardStore';
import { MATCH_TYPE_INFO, setsWon } from './match';

export function MatchHistoryPanel() {
  const history = useScorecardStore((state) => state.history);
  const restore = useScorecardStore((state) => state.restoreMatch);
  const remove = useScorecardStore((state) => state.deleteArchived);
  const clear = useScorecardStore((state) => state.clearHistory);

  return (
    <section className="panel p-4" aria-label="Match history">
      <header className="mb-2 flex items-center gap-2">
        <History className="h-4 w-4 text-sky-300" />
        <h2 className="text-sm font-semibold text-slate-100">Match history</h2>
        <span className="chip">{history.length}</span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="ml-auto text-[10px] text-slate-500 transition hover:text-red-300"
          >
            Clear
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          Completed matches are archived here automatically — score a match and it appears in this
          list with its sets and analytics.
        </p>
      ) : (
        <ul className="scroll-thin max-h-[42vh] space-y-1 overflow-y-auto pr-1">
          {history.map((entry) => {
            const snapshot = entry.snapshot;
            const homeSets = setsWon(snapshot, 'home');
            const awaySets = setsWon(snapshot, 'away');
            const winner =
              snapshot.winner === 'home'
                ? snapshot.config.homeName
                : snapshot.winner === 'away'
                  ? snapshot.config.awayName
                  : 'In progress';
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-white/5 bg-white/[0.03] p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {snapshot.config.homeName} {homeSets}–{awaySets} {snapshot.config.awayName}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(entry.savedAt).toLocaleDateString()} ·{' '}
                      {MATCH_TYPE_INFO[snapshot.config.type].label} · {winner} won
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      title="Restore this match to the scorecard"
                      onClick={() => restore(entry.id)}
                      className="btn btn-ghost h-7 w-7 p-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete from history"
                      onClick={() => remove(entry.id)}
                      className="btn btn-ghost h-7 w-7 p-0 text-slate-500 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {snapshot.sets.map((set, index) => (
                    <span key={index} className="chip text-[9px]">
                      S{index + 1}: {set.home}–{set.away}
                    </span>
                  ))}
                  {snapshot.sets.length === 0 && (
                    <span className="chip text-[9px]">No completed sets</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
