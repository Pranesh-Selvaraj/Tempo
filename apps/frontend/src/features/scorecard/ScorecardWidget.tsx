import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Pause, Play, Plus, RotateCcw, Timer } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui';
import { useScorecardStore } from '../../stores/scorecardStore';
import {
  MATCH_TYPE_INFO,
  SET_TIMEOUTS,
  clockElapsedMs,
  countdownRemainingMs,
  currentSetNumber,
  formatClock,
  maxSets,
  setsWon,
  timeoutTimerRemainingMs,
  type TeamSide,
} from './match';
import { useTicker } from './useTicker';



export function ScorecardWidget() {
  const match = useScorecardStore((state) => state.match);
  const addPoint = useScorecardStore((state) => state.addPoint);
  const timeout = useScorecardStore((state) => state.timeout);
  const clearTimeoutTimer = useScorecardStore((state) => state.clearTimeoutTimer);
  const toggleClock = useScorecardStore((state) => state.toggleClock);
  const resetClock = useScorecardStore((state) => state.resetClock);
  const toggleCountdown = useScorecardStore((state) => state.toggleCountdown);
  const resetCountdown = useScorecardStore((state) => state.resetCountdown);

  const orderedSides: TeamSide[] = match.sidesSwapped ? ['away', 'home'] : ['home', 'away'];

  const now = useTicker(
    match.clock.running || match.timeoutTimer.endsAt !== null || match.countdown.running,
  );
  const elapsedMs = clockElapsedMs(match, now);
  const timeoutRemaining = timeoutTimerRemainingMs(match, now);
  const countdownRemaining = countdownRemainingMs(match, now);

  useEffect(() => {
    if (match.timeoutTimer.endsAt !== null && timeoutRemaining <= 0) clearTimeoutTimer();
  }, [match.timeoutTimer.endsAt, timeoutRemaining, clearTimeoutTimer]);

  useEffect(() => {
    if (match.countdown.running && countdownRemaining <= 0) toggleCountdown();
  }, [match.countdown.running, countdownRemaining, toggleCountdown]);

  return (
    <section className="panel p-4" aria-label="Live scoreboard">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <ClipboardList className="h-4 w-4 text-sky-300" />
        <h2 className="text-sm font-semibold text-slate-100">Live scoreboard</h2>
        <span className="chip">
          Set {currentSetNumber(match)} of {Math.min(maxSets(match.config), 99)}
        </span>
        <span className="chip">{MATCH_TYPE_INFO[match.config.type].label}</span>
        <span className="chip">
          {match.formations.home} vs {match.formations.away}
        </span>
        {match.winner && (
          <span className="chip border-amber-400/40 text-amber-200">
            {match.winner === 'home' ? match.config.homeName : match.config.awayName} won
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button onClick={toggleClock} title="Match clock">
            {match.clock.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {match.clock.running ? 'Pause' : 'Start'}
          </Button>
          <Button onClick={resetClock} title="Reset clock">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Link to="/scorecard" className="btn">
            Open scorecard
          </Link>
        </div>
      </header>

      {match.timeoutTimer.side && timeoutRemaining > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2">
          <Timer className="h-4 w-4 text-amber-300" />
          <span className="text-xs text-amber-100">
            Timeout —{' '}
            {match.timeoutTimer.side === 'home' ? match.config.homeName : match.config.awayName}
          </span>
          <span className="ml-auto font-mono text-xl font-black tabular-nums text-amber-300">
            {Math.ceil(timeoutRemaining / 1000)}
          </span>
          <Button onClick={clearTimeoutTimer}>End</Button>
        </div>
      )}

      {(match.countdown.running || match.countdown.accumulatedMs > 0) && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2">
          <Timer className="h-4 w-4 text-sky-300" />
          <span className="text-xs text-sky-100">Timer</span>
          <span className="ml-auto font-mono text-xl font-black tabular-nums text-sky-200">
            {formatClock(countdownRemaining)}
          </span>
          <Button onClick={toggleCountdown}>
            {match.countdown.running ? 'Pause' : 'Start'}
          </Button>
          <Button onClick={resetCountdown} title="Reset timer">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {orderedSides.map((side) => {
          const name = side === 'home' ? match.config.homeName : match.config.awayName;
          const score = side === 'home' ? match.homeScore : match.awayScore;
          const serving = match.serving === side && !match.winner;
          const accent = side === 'home' ? 'text-cyan-300' : 'text-orange-300';
          return (
            <div
              key={side}
              className={cn(
                'rounded-xl border p-3',
                side === 'home' ? 'border-cyan-400/25' : 'border-orange-400/25',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    serving ? (side === 'home' ? 'bg-cyan-300' : 'bg-orange-300') : 'bg-slate-700',
                  )}
                  title={serving ? 'Serving' : 'Receiving'}
                />
                <p className={cn('truncate text-sm font-bold', accent)}>{name}</p>
                <span className="chip">{(side === 'home') !== match.sidesSwapped ? 'Left' : 'Right'}</span>
                <span className="chip ml-auto">{setsWon(match, side)} sets</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className={cn('text-4xl font-black tabular-nums leading-none', accent)}>{score}</p>
                <div className="flex items-center gap-0.5" title={`${setsWon(match, side)} sets won`}>
                  {Array.from({ length: Math.min(Math.ceil(maxSets(match.config) / 2), 3) }, (_, index) => (
                    <span
                      key={index}
                      className={cn(
                        'h-2 w-2 rounded-full',
                        index < setsWon(match, side)
                          ? side === 'home'
                            ? 'bg-cyan-300'
                            : 'bg-orange-300'
                          : 'bg-slate-700',
                      )}
                    />
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    onClick={() => addPoint(side)}
                    disabled={Boolean(match.winner)}
                    title="Add a point"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Point
                  </Button>
                  <Button
                    onClick={() => timeout(side)}
                    disabled={Boolean(match.winner) || match.timeouts[side] >= SET_TIMEOUTS}
                    title={`Start a ${match.config.timeoutSeconds}-second timeout`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {SET_TIMEOUTS - match.timeouts[side]}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {match.sets.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {match.sets.map((set, index) => (
            <span key={index} className="chip text-[9px]">
              S{index + 1}: {set.home}–{set.away}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-center font-mono text-sm tabular-nums text-slate-400">
        Match clock {formatClock(elapsedMs)}
        {match.clock.running ? ' · running' : ''}
      </p>
    </section>
  );
}
