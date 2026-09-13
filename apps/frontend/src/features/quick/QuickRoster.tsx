import { useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { usePlayStore } from '../../stores/playStore';
import { useQuickStore } from '../../stores/quickStore';
import { rosterRows } from './quickPlay';

const TASK_STYLES: Record<string, string> = {
  Spiker: 'border-red-400/40 bg-red-500/15 text-red-100',
  Setter: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  Receiver: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
  Blocker: 'border-orange-400/40 bg-orange-500/15 text-orange-100',
};

export function QuickRoster() {
  const open = useQuickStore((state) => state.rosterOpen);
  const toggle = useQuickStore((state) => state.toggleRoster);
  const rotation = useQuickStore((state) => state.rotation);
  const ballTargets = useQuickStore((state) => state.ballTargets);
  const spikeTarget = useQuickStore((state) => state.spikeTarget);
  const receiveFormation = useQuickStore((state) => state.receiveFormation);
  const players = usePlayStore((state) => state.players);

  const rows = useMemo(
    () =>
      rosterRows(players, {
        serveTarget: ballTargets[0] ?? null,
        setterSpot: ballTargets[1] ?? null,
        setTarget: ballTargets[2] ?? null,
        spikeTarget,
        receiveFormation,
      }),
    [players, ballTargets, spikeTarget, receiveFormation],
  );

  if (!open) return null;

  const home = rows.filter((row) => !row.opponent);
  const opponents = rows.filter((row) => row.opponent);
  const frontRow = home.filter((row) => row.zone >= 2 && row.zone <= 4).length;

  return (
    <aside className="panel pointer-events-auto absolute left-3 top-16 z-20 w-72 p-3">
      <header className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold text-slate-200">Roster · Rotation {rotation}</h2>
        <button
          type="button"
          onClick={toggle}
          className="ml-auto text-slate-400 transition hover:text-slate-200"
          aria-label="Hide roster"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mb-2 flex flex-wrap gap-1">
        <span className="chip">{home.length} on court</span>
        <span className="chip">
          Front {frontRow} · Back {home.length - frontRow}
        </span>
        {opponents.length > 0 && <span className="chip">{opponents.length} blockers</span>}
      </div>

      <ul className="scroll-thin max-h-[52vh] space-y-1 overflow-y-auto pr-1">
        {home.map((row) => (
          <li key={row.playerId} className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
              <span className="w-6 text-right text-xs font-semibold tabular-nums text-slate-100">
                #{row.number}
              </span>
              <span className="truncate text-[11px] text-slate-300">{row.roleLabel}</span>
              {row.task && (
                <span className={cn('chip ml-auto', TASK_STYLES[row.task])}>{row.task}</span>
              )}
            </div>
            <div className="mt-0.5 pl-[18px] text-[10px] text-slate-500">
              {row.zoneLabel}
              {row.runDistance !== null && (
                <span className="text-slate-400"> · runs {row.runDistance.toFixed(1)} m</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {opponents.length > 0 && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Opponent block
          </p>
          <div className="flex flex-wrap gap-1.5">
            {opponents.map((row) => (
              <span key={row.playerId} className="chip">
                <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />#{row.number}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
