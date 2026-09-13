import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Timer, Trophy, Undo2, UserPlus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button, Field, Panel, Segmented, TextInput } from '../../components/ui';
import { useScorecardStore } from '../../stores/scorecardStore';
import {
  SET_SUBS,
  SET_TIMEOUTS,
  computeAnalytics,
  currentSetNumber,
  isDecidingSet,
  matchPoint,
  maxSets,
  rotationPositionLabel,
  setTarget,
  setsWon,
  switchSidesAt,
  type TeamSide,
} from './match';

const TEAM_STYLES: Record<TeamSide, { text: string; border: string; button: string; glow: string }> = {
  home: {
    text: 'text-cyan-300',
    border: 'border-cyan-400/40',
    button: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30',
    glow: '0 0 24px rgba(34,211,238,0.45)',
  },
  away: {
    text: 'text-orange-300',
    border: 'border-orange-400/40',
    button: 'border-orange-400/50 bg-orange-500/20 text-orange-50 hover:bg-orange-500/30',
    glow: '0 0 24px rgba(251,146,60,0.45)',
  },
};

function RotationTracker({ rotation }: { rotation: number }) {
  const rows = [
    [4, 3, 2],
    [5, 6, 1],
  ];
  return (
    <div className="flex flex-col items-center gap-1">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((position) => (
            <span
              key={position}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold',
                rotation === position
                  ? 'border-cyan-300 bg-cyan-400/25 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-500',
              )}
              style={rotation === position ? { boxShadow: TEAM_STYLES.home.glow } : undefined}
            >
              {position}
            </span>
          ))}
        </div>
      ))}
      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
        Home rotation {rotation} · {rotationPositionLabel(rotation)}
      </p>
    </div>
  );
}

function TeamPanel({ side }: { side: TeamSide }) {
  const match = useScorecardStore((state) => state.match);
  const addPoint = useScorecardStore((state) => state.addPoint);
  const timeout = useScorecardStore((state) => state.timeout);
  const sub = useScorecardStore((state) => state.sub);
  const name = side === 'home' ? match.config.homeName : match.config.awayName;
  const score = side === 'home' ? match.homeScore : match.awayScore;
  const style = TEAM_STYLES[side];
  const serving = match.serving === side && !match.winner;
  const isMatchPoint = matchPoint(match, side);

  return (
    <div className={cn('panel flex flex-col items-center gap-3 p-4', style.border)}>
      <div className="flex w-full items-center gap-2">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            serving ? (side === 'home' ? 'bg-cyan-300' : 'bg-orange-300') : 'bg-slate-700',
          )}
          style={serving ? { boxShadow: style.glow } : undefined}
          title={serving ? 'Serving' : 'Receiving'}
        />
        <p className={cn('truncate text-sm font-bold', style.text)}>{name}</p>
        <span className="ml-auto chip">{setsWon(match, side)} sets</span>
      </div>

      <p
        className={cn('text-7xl font-black tabular-nums leading-none sm:text-8xl', style.text)}
        style={{ textShadow: style.glow }}
      >
        {score}
      </p>

      {isMatchPoint && (
        <span className="chip border-amber-400/50 bg-amber-500/15 text-amber-100">Match point</span>
      )}

      <button
        type="button"
        onClick={() => addPoint(side)}
        disabled={Boolean(match.winner)}
        className={cn(
          'h-14 w-full rounded-xl border text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40',
          style.button,
        )}
      >
        + Point
      </button>

      <div className="flex w-full items-center gap-2 text-[11px] text-slate-400">
        <Button
          className="flex-1"
          onClick={() => timeout(side)}
          disabled={match.timeouts[side] >= SET_TIMEOUTS}
          title="Take a 30-second timeout"
        >
          <Timer className="h-3.5 w-3.5" />
          Timeout {match.timeouts[side]}/{SET_TIMEOUTS}
        </Button>
        <Button
          className="flex-1"
          onClick={() => sub(side)}
          disabled={match.subs[side] >= SET_SUBS}
          title="Record a substitution"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Sub {match.subs[side]}/{SET_SUBS}
        </Button>
      </div>
    </div>
  );
}

function SetHistory() {
  const match = useScorecardStore((state) => state.match);
  if (match.sets.length === 0) {
    return <p className="text-[11px] text-slate-500">No completed sets yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {match.sets.map((set, index) => {
        const homeWon = set.home > set.away;
        return (
          <span
            key={index}
            className={cn('chip', homeWon ? 'border-cyan-400/40 text-cyan-200' : 'border-orange-400/40 text-orange-200')}
          >
            Set {index + 1} · {set.home}–{set.away}
          </span>
        );
      })}
    </div>
  );
}

function Analytics() {
  const match = useScorecardStore((state) => state.match);
  const analytics = computeAnalytics(match);
  const maxRotationPoints = Math.max(1, ...analytics.pointsByRotation.map((item) => item.points));

  return (
    <Panel title="Match analytics">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Rallies', value: String(analytics.totalRallies) },
            {
              label: `${match.config.homeName} sideout`,
              value: analytics.sideout.home === null ? '—' : `${analytics.sideout.home}%`,
            },
            {
              label: `${match.config.awayName} sideout`,
              value: analytics.sideout.away === null ? '—' : `${analytics.sideout.away}%`,
            },
            {
              label: 'Longest run',
              value: `${analytics.longestRun.home}–${analytics.longestRun.away}`,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="text-lg font-bold tabular-nums text-sky-300">{stat.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Set history
          </p>
          <SetHistory />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {match.config.homeName} points by rotation
          </p>
          <div className="flex items-end gap-2">
            {analytics.pointsByRotation.map((item) => (
              <div key={item.rotation} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-slate-400">{item.points}</span>
                <div
                  className="w-full rounded-t bg-cyan-400/70"
                  style={{ height: `${Math.max(4, (item.points / maxRotationPoints) * 64)}px` }}
                />
                <span className="text-[10px] text-slate-500">{item.rotation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function ScorecardPage() {
  const match = useScorecardStore((state) => state.match);
  const undo = useScorecardStore((state) => state.undo);
  const finishSet = useScorecardStore((state) => state.finishSet);
  const setTeamName = useScorecardStore((state) => state.setTeamName);
  const setBestOf = useScorecardStore((state) => state.setBestOf);
  const reset = useScorecardStore((state) => state.reset);

  const setNumber = currentSetNumber(match);
  const target = setTarget(match);
  const deciding = isDecidingSet(match);
  const switchAt = switchSidesAt(match);
  const shouldSwitch = switchAt !== null && (match.homeScore >= switchAt || match.awayScore >= switchAt);

  return (
    <div className="scroll-thin h-full overflow-y-auto bg-black">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-white/5 bg-black/90 px-5 py-3 backdrop-blur">
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-slate-100">Match scorecard</h1>
          <p className="text-[10px] text-slate-500">
            Rally scoring · rotation tracking · timeouts and substitutions
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={undo} disabled={match.events.length === 0}>
            <Undo2 className="h-3.5 w-3.5" />
            Undo point
          </Button>
          <Button onClick={finishSet} disabled={Boolean(match.winner)}>
            Finish set
          </Button>
          <Button variant="danger" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset match
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-5">
        <Panel title="Match setup">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Home team">
              <TextInput
                value={match.config.homeName}
                onChange={(event) => setTeamName('home', event.target.value)}
              />
            </Field>
            <Field label="Away team">
              <TextInput
                value={match.config.awayName}
                onChange={(event) => setTeamName('away', event.target.value)}
              />
            </Field>
            <Field label="Format">
              <Segmented<string>
                value={String(match.config.bestOf)}
                onChange={(value) => setBestOf(Number(value) as 3 | 5)}
                options={[
                  { value: '3', label: 'Best of 3' },
                  { value: '5', label: 'Best of 5' },
                ]}
              />
            </Field>
          </div>
        </Panel>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <TeamPanel side="home" />

          <div className="panel flex min-w-[220px] flex-col items-center justify-center gap-3 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Set {setNumber} of {maxSets(match.config.bestOf)}
            </p>
            <p className="text-3xl font-black text-slate-100">
              {match.homeScore} : {match.awayScore}
            </p>
            <p className="text-[11px] text-slate-400">
              {deciding ? `Deciding set · to ${target}` : `First to ${target}, win by 2`}
            </p>
            {match.winner && (
              <p className="flex items-center gap-1 text-sm font-bold text-amber-300">
                <Trophy className="h-4 w-4" />
                {match.winner === 'home' ? match.config.homeName : match.config.awayName} win
              </p>
            )}
            {shouldSwitch && !match.winner && (
              <p className="chip border-amber-400/40 text-amber-200">Switch sides at {switchAt}</p>
            )}
            <RotationTracker rotation={match.homeRotation} />
          </div>

          <TeamPanel side="away" />
        </div>

        <Analytics />
      </div>
    </div>
  );
}
