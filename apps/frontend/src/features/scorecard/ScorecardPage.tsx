import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  Download,
  Pause,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Timer,
  Trash2,
  Trophy,
  Undo2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  FORMATION_INFO,
  FORMATIONS,
  ROLE_COLORS,
  ROLE_LABELS,
  type Formation,
  type PlayerRole,
} from '@tempo/shared-types';
import { MatchReport } from './MatchReport';
import { cn } from '../../lib/cn';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import {
  Button,
  Field,
  Modal,
  NumberInput,
  Panel,
  Segmented,
  Select,
  TextInput,
} from '../../components/ui';
import { useScorecardStore } from '../../stores/scorecardStore';
import {
  COUNTDOWN_PRESETS_MS,
  MATCH_TYPES,
  MATCH_TYPE_INFO,
  SET_SUBS,
  SET_TIMEOUTS,
  STAFF_ROLES,
  TIMEOUT_PRESETS,
  clockElapsedMs,
  countdownRemainingMs,
  computeAnalytics,
  computePlayerStats,
  currentSetNumber,
  expectedRoleAt,
  formatClock,
  isDecidingSet,
  matchPoint,
  maxSets,
  playerAtPosition,
  positionLabel,
  rotationPositionLabel,
  setTarget,
  setsWon,
  substitutionLog,
  switchSidesAt,
  timeoutTimerRemainingMs,
  type MatchType,
  type TeamSide,
} from './match';
import { useTicker } from './useTicker';

const ROLE_SHORT: Record<PlayerRole, string> = {
  setter: 'S',
  outside: 'OH',
  middle: 'MB',
  opposite: 'OPP',
  libero: 'L',
};

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

function RotationTracker({ rotation, label }: { rotation: number; label: string }) {
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
        {label} rotation {rotation} · {rotationPositionLabel(rotation)}
      </p>
    </div>
  );
}

function TeamPanel({ side, onSub }: { side: TeamSide; onSub: (side: TeamSide) => void }) {
  const match = useScorecardStore((state) => state.match);
  const addPoint = useScorecardStore((state) => state.addPoint);
  const timeout = useScorecardStore((state) => state.timeout);
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
        <span className="chip">{(side === 'home') !== match.sidesSwapped ? 'Left court' : 'Right court'}</span>
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
          title={`Start a ${match.config.timeoutSeconds}-second timeout`}
        >
          <Timer className="h-3.5 w-3.5" />
          Timeout {match.timeouts[side]}/{SET_TIMEOUTS}
        </Button>
        <Button
          className="flex-1"
          onClick={() => onSub(side)}
          disabled={match.subs[side] >= SET_SUBS}
          title="Record a substitution"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Sub {match.subs[side]}/{SET_SUBS}
        </Button>
      </div>

      {match.rosters[side].players.length > 0 && (
        <p className="text-[10px] text-slate-500">
          {match.lineups[side].filter(Boolean).length} on court ·{' '}
          {Math.max(
            0,
            match.rosters[side].players.length - match.lineups[side].filter(Boolean).length,
          )}{' '}
          bench · {match.rosters[side].staff.length} staff
        </p>
      )}
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

        <PlayerStatsSection />
        <SubstitutionLogSection />
      </div>
    </Panel>
  );
}

function SubstitutionLogSection() {
  const match = useScorecardStore((state) => state.match);
  const entries = useMemo(() => substitutionLog(match), [match]);
  if (entries.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Substitutions
      </p>
      <div className="space-y-1">
        {entries.map((entry, index) => (
          <p key={index} className="text-[11px] text-slate-400">
            <span className="chip mr-1">Set {entry.setId}</span>
            <span className={entry.side === 'home' ? 'text-cyan-300' : 'text-orange-300'}>
              {entry.side === 'home' ? match.config.homeName : match.config.awayName}
            </span>{' '}
            · {entry.outName} → {entry.inName}
            <span className="ml-1 text-slate-600">
              ({entry.homeScore}–{entry.awayScore})
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function PlayerStatsSection() {
  const match = useScorecardStore((state) => state.match);
  const stats = useMemo(() => computePlayerStats(match), [match]);
  if (stats.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Player stats
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {(['home', 'away'] as TeamSide[]).map((side) => {
          const rows = stats
            .filter((stat) => stat.side === side)
            .sort(
              (a, b) => b.servicePoints - a.servicePoints || b.ralliesOnCourt - a.ralliesOnCourt,
            );
          if (rows.length === 0) return null;
          return (
            <div key={side} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <p
                className={cn(
                  'mb-1 text-[11px] font-semibold',
                  side === 'home' ? 'text-cyan-300' : 'text-orange-300',
                )}
              >
                {side === 'home' ? match.config.homeName : match.config.awayName}
              </p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left font-medium">Player</th>
                    <th className="text-right font-medium">Serve pts</th>
                    <th className="text-right font-medium">Rallies</th>
                    <th className="text-right font-medium">Part</th>
                    <th className="text-right font-medium">Subs in/out</th>
                    <th className="text-right font-medium">Best run</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((stat) => (
                    <tr key={stat.playerId} className="border-t border-white/5">
                      <td className="py-1 text-slate-300">
                        <span
                          className={cn(
                            'mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle',
                            stat.onCourt ? 'bg-emerald-400' : 'bg-slate-700',
                          )}
                          title={stat.onCourt ? 'On court' : 'Bench'}
                        />
                        <span className="mr-1 text-[9px] font-semibold uppercase text-slate-500">
                          {ROLE_SHORT[stat.role]}
                        </span>
                        {stat.number ? `#${stat.number} ` : ''}
                        {stat.name}
                      </td>
                      <td className="text-right tabular-nums text-slate-100">{stat.servicePoints}</td>
                      <td className="text-right tabular-nums text-slate-400">
                        {stat.ralliesOnCourt}
                      </td>
                      <td className="text-right tabular-nums text-slate-400">
                        {stat.participation}%
                      </td>
                      <td className="text-right tabular-nums text-slate-400">
                        {stat.subsIn}/{stat.subsOut}
                      </td>
                      <td className="text-right tabular-nums text-slate-400">
                        {stat.maxServingRun}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PositionForm({
  side,
  position,
  onClose,
}: {
  side: TeamSide;
  position: number;
  onClose: () => void;
}) {
  const match = useScorecardStore((state) => state.match);
  const savePositionPlayer = useScorecardStore((state) => state.savePositionPlayer);
  const assignPosition = useScorecardStore((state) => state.assignPosition);
  const rotation = side === 'home' ? match.homeRotation : match.awayRotation;
  const roster = match.rosters[side];
  const currentId = playerAtPosition(match, side, rotation, position);
  const current = currentId ? roster.players.find((player) => player.id === currentId) : undefined;
  const expected = expectedRoleAt(match, side, position);

  const [name, setName] = useState(current?.name ?? '');
  const [number, setNumber] = useState(current?.number ?? '');
  const [role, setRole] = useState<PlayerRole>(current?.role ?? expected);

  const others = roster.players.filter((player) => player.id !== currentId);

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400">
        Formation <span className="font-semibold text-slate-200">{match.formations[side]}</span>{' '}
        expects a <span className="text-sky-300">{ROLE_LABELS[expected]}</span> in this slot.
      </p>

      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Field label="Jersey">
          <TextInput
            value={number}
            autoFocus
            placeholder="#"
            className="text-center"
            onChange={(event) => setNumber(event.target.value)}
          />
        </Field>
        <Field label="Name">
          <TextInput
            value={name}
            placeholder="Player name"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Player type">
        <Select value={role} onChange={(event) => setRole(event.target.value as PlayerRole)}>
          {(Object.keys(ROLE_LABELS) as PlayerRole[]).map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>

      {others.length > 0 && (
        <div>
          <p className="field-label mb-1">Assign an existing player</p>
          <div className="scroll-thin flex max-h-32 flex-wrap gap-1 overflow-y-auto">
            {others.map((player) => {
              const index = match.lineups[side].indexOf(player.id);
              const chip = index === -1 ? 'Bench' : `P${((index + rotation - 1) % 6) + 1}`;
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    assignPosition(side, position, player.id);
                    onClose();
                  }}
                  className="chip hover:border-sky-400/40 hover:text-sky-100"
                >
                  {player.number ? `#${player.number} ` : ''}
                  {player.name || 'Unnamed'} · {chip}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {current && (
          <Button
            variant="danger"
            onClick={() => {
              assignPosition(side, position, null);
              onClose();
            }}
          >
            Clear position
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            savePositionPlayer(side, position, {
              name: name.trim(),
              number: number.trim(),
              role,
            });
            onClose();
          }}
        >
          Save player
        </Button>
      </div>
    </div>
  );
}

function CourtPositionMap({ side }: { side: TeamSide }) {
  const match = useScorecardStore((state) => state.match);
  const setFormation = useScorecardStore((state) => state.setFormation);
  const [editing, setEditing] = useState<number | null>(null);
  const rotation = side === 'home' ? match.homeRotation : match.awayRotation;
  const roster = match.rosters[side];
  const teamName = side === 'home' ? match.config.homeName : match.config.awayName;
  const serving = match.serving === side && !match.winner;
  const rows = [
    [4, 3, 2],
    [5, 6, 1],
  ];

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            side === 'home' ? 'bg-cyan-300' : 'bg-orange-300',
          )}
          style={serving ? { boxShadow: TEAM_STYLES[side].glow } : undefined}
        />
        <p className={cn('text-xs font-semibold', side === 'home' ? 'text-cyan-300' : 'text-orange-300')}>
          {teamName}
        </p>
        <Select
          value={match.formations[side]}
          title={FORMATION_INFO[match.formations[side]].description}
          aria-label={`${teamName} formation`}
          onChange={(event) => setFormation(side, event.target.value as Formation)}
          className="h-7 w-24 py-0 text-[11px]"
        >
          {FORMATIONS.map((value) => (
            <option key={value} value={value} title={FORMATION_INFO[value].description}>
              {value}
            </option>
          ))}
        </Select>
        <span className="chip">
          Rotation {rotation} · {rotationPositionLabel(rotation)}
        </span>
        <span className="ml-auto text-[10px] text-slate-500">Tap a position to edit</span>
      </div>

      <div className="space-y-1">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-3 gap-1">
            {row.map((position) => {
              const id = playerAtPosition(match, side, rotation, position);
              const player = id ? roster.players.find((item) => item.id === id) : undefined;
              const isServer = serving && position === 1;
              return (
                <button
                  key={position}
                  type="button"
                  onClick={() => setEditing(position)}
                  aria-label={`${teamName} P${position} ${positionLabel(position)}${
                    player ? ` — #${player.number} ${player.name || 'Unnamed'}` : ' — empty'
                  }`}
                  className={cn(
                    'relative rounded-lg border p-1.5 text-center transition',
                    player
                      ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40'
                      : 'border-dashed border-white/15 text-slate-500 hover:border-sky-400/40',
                  )}
                >
                  <span className="absolute left-1 top-1 text-[9px] text-slate-500">P{position}</span>
                  {isServer && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  )}
                  {player ? (
                    <>
                      <p className="text-base font-bold leading-tight tabular-nums text-slate-100">
                        {player.number ? `#${player.number}` : '—'}
                      </p>
                      <p className="truncate text-[10px] text-slate-300">{player.name || 'Unnamed'}</p>
                      <p className="text-[9px] uppercase tracking-wide text-slate-500">
                        {ROLE_SHORT[player.role]} · {positionLabel(position)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold leading-tight">+</p>
                      <p className="text-[9px]">Add player</p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[9px] uppercase tracking-wider text-slate-600">
        Top: front row · Bottom: back row · amber dot = serving
      </p>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`${teamName} · P${editing ?? ''} ${editing ? positionLabel(editing) : ''}`}
      >
        {editing !== null && (
          <PositionForm
            key={`${side}-${editing}`}
            side={side}
            position={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function TeamPlayersList({
  side,
  onManage,
}: {
  side: TeamSide;
  onManage: () => void;
}) {
  const match = useScorecardStore((state) => state.match);
  const [editing, setEditing] = useState<number | null>(null);
  const roster = match.rosters[side];
  const lineup = match.lineups[side];
  const rotation = side === 'home' ? match.homeRotation : match.awayRotation;
  const positionOf = (id: string): number | null => {
    const index = lineup.indexOf(id);
    return index === -1 ? null : ((index + rotation - 1) % 6) + 1;
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Players & starting positions
        </p>
        <span className="chip">{roster.players.length}</span>
        <button
          type="button"
          onClick={onManage}
          className="ml-auto text-[10px] text-sky-300 transition hover:text-sky-200"
        >
          Manage & add
        </button>
      </div>

      {roster.players.length === 0 ? (
        <p className="text-[10px] text-slate-500">
          No players yet — add names, numbers and types, then tap a position on the court map to
          set the starting lineup.
        </p>
      ) : (
        <ul className="space-y-1">
          {roster.players.map((player) => {
            const position = positionOf(player.id);
            return (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => (position ? setEditing(position) : onManage())}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 text-left transition hover:border-sky-400/40"
                  title={position ? 'Edit this starter' : 'Assign a starting position'}
                >
                  <span
                    className={cn(
                      'chip w-10 justify-center',
                      position ? 'border-emerald-400/40 text-emerald-200' : 'text-slate-500',
                    )}
                  >
                    {position ? `P${position}` : 'Bench'}
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: ROLE_COLORS[player.role] }}
                  />
                  <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-200">
                    {player.number ? `#${player.number}` : '—'}
                  </span>
                  <span className="truncate text-xs text-slate-300">
                    {player.name || 'Unnamed'}
                  </span>
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-slate-500">
                    {ROLE_SHORT[player.role]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`${side === 'home' ? match.config.homeName : match.config.awayName} · P${editing ?? ''} ${
          editing ? positionLabel(editing) : ''
        }`}
      >
        {editing !== null && (
          <PositionForm
            key={`${side}-list-${editing}`}
            side={side}
            position={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function BenchStaff({ side }: { side: TeamSide }) {
  const match = useScorecardStore((state) => state.match);
  const roster = match.rosters[side];
  const lineup = match.lineups[side];
  const bench = roster.players.filter((player) => !lineup.includes(player.id));

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Bench & staff
      </p>
      {bench.length > 0 ? (
        <div className="mb-1 flex flex-wrap gap-1">
          {bench.map((player) => (
            <span key={player.id} className="chip">
              {player.number ? `#${player.number} ` : ''}
              {player.name || 'Unnamed'}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-500">
          No bench players — use Lineups &amp; staff to add them.
        </p>
      )}
      {roster.staff.length > 0 && (
        <p className="mt-1 text-[10px] text-slate-500">
          {roster.staff.map((member) => `${member.name || 'Unnamed'} (${member.role})`).join(' · ')}
        </p>
      )}
    </div>
  );
}

function RosterSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [side, setSide] = useState<TeamSide>('home');
  const match = useScorecardStore((state) => state.match);
  const addPlayer = useScorecardStore((state) => state.addPlayer);
  const updatePlayer = useScorecardStore((state) => state.updatePlayer);
  const removePlayer = useScorecardStore((state) => state.removePlayer);
  const toggleStarter = useScorecardStore((state) => state.toggleStarter);
  const quickFill = useScorecardStore((state) => state.quickFill);
  const addStaff = useScorecardStore((state) => state.addStaff);
  const updateStaff = useScorecardStore((state) => state.updateStaff);
  const removeStaff = useScorecardStore((state) => state.removeStaff);

  const roster = match.rosters[side];
  const starters = roster.players.filter((player) => player.starter).length;
  const lineup = match.lineups[side];
  const rotation = side === 'home' ? match.homeRotation : match.awayRotation;
  const positionOf = (id: string): number | null => {
    const index = lineup.indexOf(id);
    return index === -1 ? null : ((index + rotation - 1) % 6) + 1;
  };

  return (
    <Modal open={open} onClose={onClose} title="Lineups & staff" size="lg">
      <Segmented<TeamSide>
        value={side}
        onChange={setSide}
        options={[
          { value: 'home', label: match.config.homeName || 'Home' },
          { value: 'away', label: match.config.awayName || 'Away' },
        ]}
      />

      <div className="mt-4 space-y-5">
        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-slate-200">Players ({roster.players.length})</p>
            <span className="chip">{starters}/6 starters</span>
            <div className="ml-auto flex gap-1">
              <Button onClick={() => quickFill(side)} title="Create players #1–#9 with the first six as starters">
                Quick fill 1–9
              </Button>
              <Button variant="primary" onClick={() => addPlayer(side)}>
                <Plus className="h-3.5 w-3.5" />
                Add player
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            {roster.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-2"
              >
                <span className="w-5 text-right text-[10px] tabular-nums text-slate-500">
                  {index + 1}
                </span>
                <TextInput
                  value={player.number}
                  placeholder="#"
                  className="w-14 text-center"
                  onChange={(event) => updatePlayer(side, player.id, { number: event.target.value })}
                />
                <TextInput
                  value={player.name}
                  placeholder="Player name"
                  className="flex-1"
                  onChange={(event) => updatePlayer(side, player.id, { name: event.target.value })}
                />
                <Select
                  value={player.role}
                  className="w-28"
                  title="Player type"
                  onChange={(event) =>
                    updatePlayer(side, player.id, { role: event.target.value as PlayerRole })
                  }
                >
                  {(Object.keys(ROLE_LABELS) as PlayerRole[]).map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </option>
                  ))}
                </Select>
                <span
                  className={cn(
                    'chip w-9 justify-center',
                    positionOf(player.id) ? 'text-slate-200' : 'text-slate-600',
                  )}
                  title="Current court position"
                >
                  {positionOf(player.id) ? `P${positionOf(player.id)}` : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStarter(side, player.id)}
                  title="The first six starters are on court"
                  className={cn(
                    'chip',
                    player.starter
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                      : 'text-slate-500',
                  )}
                >
                  {player.starter ? 'Starter' : 'Bench'}
                </button>
                <button
                  type="button"
                  onClick={() => removePlayer(side, player.id)}
                  className="text-slate-500 transition hover:text-red-300"
                  aria-label="Remove player"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {roster.players.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Optional — add names and numbers to track substitutions and per-player analytics, or
                just use the scoreboard.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-200">Staff ({roster.staff.length})</p>
            <Button className="ml-auto" onClick={() => addStaff(side)}>
              <Plus className="h-3.5 w-3.5" />
              Add staff
            </Button>
          </div>
          <div className="space-y-1">
            {roster.staff.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-2"
              >
                <TextInput
                  value={member.name}
                  placeholder="Name"
                  className="flex-1"
                  onChange={(event) => updateStaff(side, member.id, { name: event.target.value })}
                />
                <Select
                  value={member.role}
                  className="w-44"
                  onChange={(event) => updateStaff(side, member.id, { role: event.target.value })}
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => removeStaff(side, member.id)}
                  className="text-slate-500 transition hover:text-red-300"
                  aria-label="Remove staff member"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {roster.staff.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Add coaches and support staff so everyone at the gym knows the names.
              </p>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function SubstitutionModal({ side, onClose }: { side: TeamSide | null; onClose: () => void }) {
  const match = useScorecardStore((state) => state.match);
  const substitute = useScorecardStore((state) => state.substitute);
  const createBenchPlayer = useScorecardStore((state) => state.createBenchPlayer);
  const [outId, setOutId] = useState<string | null>(null);
  const [inId, setInId] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<PlayerRole>('outside');

  const close = () => {
    setOutId(null);
    setInId(null);
    setNewNumber('');
    setNewName('');
    onClose();
  };

  if (!side) return null;

  const roster = match.rosters[side];
  const lineup = match.lineups[side];
  const rotation = side === 'home' ? match.homeRotation : match.awayRotation;
  const onCourt = lineup.map((id, index) => ({
    id,
    player: roster.players.find((player) => player.id === id),
    position: ((index + rotation - 1) % 6) + 1,
  }));
  const bench = roster.players.filter((player) => !lineup.includes(player.id));
  const subsLeft = SET_SUBS - match.subs[side];
  const canSubstitute = Boolean(outId && inId) && subsLeft > 0;

  const rowClass = (selected: boolean) =>
    cn(
      'mb-1 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition',
      selected
        ? 'border-sky-400/50 bg-sky-500/15'
        : 'border-white/5 bg-white/[0.03] hover:border-white/15',
    );

  return (
    <Modal
      open={side !== null}
      onClose={close}
      title={`Substitution — ${side === 'home' ? match.config.homeName : match.config.awayName}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="field-label mb-1">On court</p>
          {onCourt.map(({ id, player, position }) => (
            <button
              key={id}
              type="button"
              onClick={() => setOutId(id)}
              className={rowClass(outId === id)}
            >
              <span className="chip w-8 justify-center">P{position}</span>
              <span className="truncate text-xs text-slate-200">
                {player?.number ? `#${player.number} ` : ''}
                {player?.name || 'Unnamed'}
              </span>
            </button>
          ))}
        </div>
        <div>
          <p className="field-label mb-1">Bench</p>
          {bench.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => setInId(player.id)}
              className={rowClass(inId === player.id)}
            >
              <span className="truncate text-xs text-slate-200">
                {player.number ? `#${player.number} ` : ''}
                {player.name || 'Unnamed'}
              </span>
            </button>
          ))}
          {bench.length === 0 && (
            <p className="text-[11px] text-slate-500">No bench players available.</p>
          )}

          <div className="mt-2 space-y-1.5 rounded-lg border border-dashed border-white/15 p-2">
            <p className="field-label">Add substitute</p>
            <div className="flex items-center gap-1">
              <TextInput
                value={newNumber}
                placeholder="#"
                className="w-12 text-center"
                onChange={(event) => setNewNumber(event.target.value)}
              />
              <TextInput
                value={newName}
                placeholder="Name"
                className="flex-1"
                onChange={(event) => setNewName(event.target.value)}
              />
              <Select
                value={newRole}
                className="w-24"
                onChange={(event) => setNewRole(event.target.value as PlayerRole)}
              >
                {(Object.keys(ROLE_LABELS) as PlayerRole[]).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const id = createBenchPlayer(side, {
                  name: newName.trim(),
                  number: newNumber.trim(),
                  role: newRole,
                });
                setInId(id);
                setNewName('');
                setNewNumber('');
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add to bench &amp; select
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="mr-auto text-[10px] text-slate-500">{subsLeft} substitutions left this set</span>
        <Button onClick={close}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!canSubstitute}
          onClick={() => {
            if (outId && inId) substitute(side, outId, inId);
            close();
          }}
        >
          Confirm substitution
        </Button>
      </div>
    </Modal>
  );
}

export function ScorecardPage() {
  const match = useScorecardStore((state) => state.match);
  const undo = useScorecardStore((state) => state.undo);
  const finishSet = useScorecardStore((state) => state.finishSet);
  const setTeamName = useScorecardStore((state) => state.setTeamName);
  const setMatchType = useScorecardStore((state) => state.setMatchType);
  const reset = useScorecardStore((state) => state.reset);
  const toggleClock = useScorecardStore((state) => state.toggleClock);
  const resetClock = useScorecardStore((state) => state.resetClock);
  const clearTimeoutTimer = useScorecardStore((state) => state.clearTimeoutTimer);
  const setTimeoutSeconds = useScorecardStore((state) => state.setTimeoutSeconds);
  const setCountdownDuration = useScorecardStore((state) => state.setCountdownDuration);
  const toggleCountdown = useScorecardStore((state) => state.toggleCountdown);
  const resetCountdown = useScorecardStore((state) => state.resetCountdown);
  const swapSides = useScorecardStore((state) => state.swapSides);
  const sub = useScorecardStore((state) => state.sub);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [subSide, setSubSide] = useState<TeamSide | null>(null);

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

  const handleSub = (side: TeamSide) => {
    if (match.rosters[side].players.length >= 6) setSubSide(side);
    else sub(side);
  };

  const exportJson = () => {
    const payload = {
      app: 'Tempo',
      exportedAt: new Date().toISOString(),
      match,
      analytics: computeAnalytics(match),
      playerStats: computePlayerStats(match),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tempo-match-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const setNumber = currentSetNumber(match);
  const target = setTarget(match);
  const deciding = isDecidingSet(match);
  const switchAt = switchSidesAt(match);
  const sidesNote =
    switchAt === null
      ? null
      : match.deciderSwapped
        ? 'Sides switched at 8'
        : `Switch sides at ${switchAt}`;
  const leftSide: TeamSide = match.sidesSwapped ? 'away' : 'home';
  const rightSide: TeamSide = match.sidesSwapped ? 'home' : 'away';
  const timerMinutes = Math.floor(match.countdown.durationMs / 60_000);
  const timerSeconds = Math.floor((match.countdown.durationMs % 60_000) / 1000);
  const setTimerParts = (minutes: number, seconds: number) =>
    setCountdownDuration(Math.max(5, Math.max(0, minutes) * 60 + Math.min(59, Math.max(0, seconds))) * 1000);

  return (
    <div className="scroll-thin h-full overflow-y-auto bg-panel-950">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-white/5 bg-panel-900/90 px-5 py-3 backdrop-blur">
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
          <Button onClick={() => window.print()} title="Print or save as PDF">
            <Printer className="h-3.5 w-3.5" />
            Print / PDF
          </Button>
          <Button onClick={exportJson} title="Download the match data as JSON">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button onClick={() => setRosterOpen(true)}>
            <Users className="h-3.5 w-3.5" />
            Lineups &amp; staff
          </Button>
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
          <ThemeSwitcher compact />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-5">
        {match.timeoutTimer.side && timeoutRemaining > 0 && (
          <div className="panel flex items-center gap-3 border-amber-400/40 p-4">
            <Timer className="h-6 w-6 text-amber-300" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-200">Timeout</p>
              <p className="text-sm font-semibold text-slate-100">
                {match.timeoutTimer.side === 'home' ? match.config.homeName : match.config.awayName}
              </p>
            </div>
            <p className="ml-auto font-mono text-4xl font-black tabular-nums text-amber-300">
              {Math.ceil(timeoutRemaining / 1000)}
            </p>
            <Button onClick={clearTimeoutTimer}>End</Button>
          </div>
        )}

        <Panel title="Match setup">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <Field label="Match type" hint={MATCH_TYPE_INFO[match.config.type].short}>
              <Select
                value={match.config.type}
                onChange={(event) => setMatchType(event.target.value as MatchType)}
              >
                {MATCH_TYPES.map((value) => (
                  <option key={value} value={value} title={MATCH_TYPE_INFO[value].description}>
                    {MATCH_TYPE_INFO[value].label} — {MATCH_TYPE_INFO[value].short}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Timeout length" hint="seconds, used by the timeout countdown">
              <div className="flex items-center gap-1">
                <NumberInput
                  min={5}
                  max={600}
                  value={match.config.timeoutSeconds}
                  onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
                  className="w-16"
                />
                <div className="flex flex-wrap gap-1">
                  {TIMEOUT_PRESETS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setTimeoutSeconds(seconds)}
                      className={cn(
                        'chip',
                        match.config.timeoutSeconds === seconds &&
                          'border-sky-400/50 bg-sky-500/15 text-sky-100',
                      )}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          </div>
        </Panel>

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <TeamPanel side={leftSide} onSub={handleSub} />
            <CourtPositionMap side={leftSide} />
            <RotationTracker
              rotation={leftSide === 'home' ? match.homeRotation : match.awayRotation}
              label={leftSide === 'home' ? match.config.homeName : match.config.awayName}
            />
            <TeamPlayersList side={leftSide} onManage={() => setRosterOpen(true)} />
            <BenchStaff side={leftSide} />
          </div>

          <div className="panel flex min-w-0 flex-col items-center justify-center gap-3 p-4">
            <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Set {setNumber} of {Math.min(maxSets(match.config), 99)} ·{' '}
              {MATCH_TYPE_INFO[match.config.type].label}
            </p>
            <p className="text-3xl font-black text-slate-100">
              {match.homeScore} : {match.awayScore}
            </p>
            <p className="text-center text-[11px] text-slate-400">
              {deciding ? `Deciding set · to ${target}` : `First to ${target}, win by 2`}
            </p>
            {match.winner && (
              <p className="flex items-center gap-1 text-sm font-bold text-amber-300">
                <Trophy className="h-4 w-4" />
                {match.winner === 'home' ? match.config.homeName : match.config.awayName} win
              </p>
            )}
            {sidesNote && !match.winner && (
              <p className="chip border-amber-400/40 text-amber-200">{sidesNote}</p>
            )}

            <Button onClick={swapSides} title="Swap the teams left and right">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap sides
            </Button>

            <div className="w-full border-t border-white/5 pt-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Match clock
              </p>
              <p className="my-1 font-mono text-3xl font-black tabular-nums text-slate-100">
                {formatClock(elapsedMs)}
              </p>
              <div className="flex justify-center gap-1">
                <Button onClick={toggleClock}>
                  {match.clock.running ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {match.clock.running ? 'Pause' : 'Start'}
                </Button>
                <Button onClick={resetClock} title="Reset clock">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="w-full border-t border-white/5 pt-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Timer
              </p>
              <p className="my-1 font-mono text-3xl font-black tabular-nums text-slate-100">
                {formatClock(countdownRemaining)}
              </p>
              <div className="flex justify-center gap-1">
                <Button onClick={toggleCountdown}>
                  {match.countdown.running ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {match.countdown.running ? 'Pause' : 'Start'}
                </Button>
                <Button onClick={resetCountdown} title="Reset timer">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                {COUNTDOWN_PRESETS_MS.map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setCountdownDuration(ms)}
                    className={cn(
                      'chip',
                      match.countdown.durationMs === ms &&
                        'border-sky-400/50 bg-sky-500/15 text-sky-100',
                    )}
                  >
                    {ms / 60_000}m
                  </button>
                ))}
                <label className="flex items-center gap-1 text-[10px] text-slate-500">
                  custom
                  <NumberInput
                    min={0}
                    max={120}
                    value={timerMinutes}
                    onChange={(event) => setTimerParts(Number(event.target.value), timerSeconds)}
                    className="h-6 w-12 py-0 text-[10px]"
                  />
                  min
                  <NumberInput
                    min={0}
                    max={59}
                    value={timerSeconds}
                    onChange={(event) => setTimerParts(timerMinutes, Number(event.target.value))}
                    className="h-6 w-12 py-0 text-[10px]"
                  />
                  s
                </label>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <TeamPanel side={rightSide} onSub={handleSub} />
            <CourtPositionMap side={rightSide} />
            <RotationTracker
              rotation={rightSide === 'home' ? match.homeRotation : match.awayRotation}
              label={rightSide === 'home' ? match.config.homeName : match.config.awayName}
            />
            <TeamPlayersList side={rightSide} onManage={() => setRosterOpen(true)} />
            <BenchStaff side={rightSide} />
          </div>
        </div>

        <Analytics />
      </div>

      <RosterSetupModal open={rosterOpen} onClose={() => setRosterOpen(false)} />
      <SubstitutionModal side={subSide} onClose={() => setSubSide(null)} />
      <MatchReport match={match} />
    </div>
  );
}
