import { create } from 'zustand';
import { asFormation, type PlayerRole } from '@tempo/shared-types';
import type { MatchType } from '../features/scorecard/match';
import {
  STAFF_ROLES,
  addPoint,
  applyFormation,
  assignPosition,
  createMatch,
  createPlayer,
  createStaff,
  formationRoles,
  nextSet,
  resetClock,
  resetCountdown,
  setCountdownDuration,
  substitute,
  swapSides,
  toggleCountdown,
  toggleClock,
  undoPoint,
  useSub,
  useTimeout,
  type MatchState,
  type TeamPlayer,
  type TeamSide,
} from '../features/scorecard/match';

const STORAGE_KEY = 'tempo.scorecard.v1';
const HISTORY_KEY = 'tempo.matchHistory.v1';

export interface ArchivedMatch {
  id: string;
  savedAt: number;
  snapshot: MatchState;
}

function readHistory(): ArchivedMatch[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchivedMatch[];
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

function writeHistory(history: ArchivedMatch[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  } catch {
    /* storage unavailable */
  }
}

function load(): MatchState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createMatch();
    const parsed = JSON.parse(raw) as Partial<MatchState> & {
      formation?: string;
      config?: Partial<MatchState['config']> & { bestOf?: 3 | 5 };
    };
    const legacy = parsed.config;
    const base = createMatch({
      homeName: legacy?.homeName,
      awayName: legacy?.awayName,
      type: legacy?.type ?? (legacy?.bestOf === 3 ? 'best_of_3' : 'best_of_5'),
      timeoutSeconds: legacy?.timeoutSeconds,
    });
    if (typeof parsed.homeScore !== 'number' || !Array.isArray(parsed.events)) return base;
    return {
      ...base,
      ...parsed,
      id: parsed.id ?? base.id,
      config: base.config,
      formations: {
        home: asFormation(parsed.formations?.home ?? parsed.formation),
        away: asFormation(parsed.formations?.away ?? parsed.formation),
      },
      rosters: {
        home: parsed.rosters?.home ?? base.rosters.home,
        away: parsed.rosters?.away ?? base.rosters.away,
      },
      lineups: {
        home: parsed.lineups?.home ?? base.lineups.home,
        away: parsed.lineups?.away ?? base.lineups.away,
      },
      events: (parsed.events ?? []).map((event) => ({
        ...event,
        sidesSwappedBefore: event.sidesSwappedBefore ?? false,
        deciderSwappedBefore: event.deciderSwappedBefore ?? false,
      })),
      sidesSwapped: parsed.sidesSwapped ?? false,
      deciderSwapped: parsed.deciderSwapped ?? false,
      subEvents: (parsed.subEvents ?? []).map((sub, index) => ({
        ...sub,
        eventIndex: sub.eventIndex ?? index,
      })),
    };
  } catch {
    return createMatch();
  }
}

function persist(state: MatchState): MatchState {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — keep the in-memory match */
  }
  return state;
}

function withLineup(
  state: MatchState,
  side: TeamSide,
  updater: (lineup: (string | null)[]) => (string | null)[],
): MatchState {
  const lineup = updater([...state.lineups[side]]);
  return {
    ...state,
    lineups: { ...state.lineups, [side]: lineup },
    rosters: {
      ...state.rosters,
      [side]: {
        ...state.rosters[side],
        players: state.rosters[side].players.map((player) => ({
          ...player,
          starter: lineup.includes(player.id),
        })),
      },
    },
  };
}

interface ScorecardStore {
  match: MatchState;
  addPoint: (side: TeamSide) => void;
  undo: () => void;
  timeout: (side: TeamSide) => void;
  clearTimeoutTimer: () => void;
  setTimeoutSeconds: (seconds: number) => void;
  toggleClock: () => void;
  resetClock: () => void;
  setCountdownDuration: (durationMs: number) => void;
  toggleCountdown: () => void;
  resetCountdown: () => void;
  swapSides: () => void;
  sub: (side: TeamSide) => void;
  finishSet: () => void;
  setTeamName: (side: TeamSide, name: string) => void;
  setMatchType: (type: MatchType) => void;
  setFormation: (side: TeamSide, formation: MatchState['formations']['home']) => void;
  reset: () => void;
  addPlayer: (side: TeamSide, role?: PlayerRole) => void;
  createBenchPlayer: (
    side: TeamSide,
    data: { name: string; number: string; role: PlayerRole },
  ) => string;
  updatePlayer: (side: TeamSide, id: string, patch: Partial<TeamPlayer>) => void;
  removePlayer: (side: TeamSide, id: string) => void;
  toggleStarter: (side: TeamSide, id: string) => void;
  quickFill: (side: TeamSide) => void;
  assignPosition: (side: TeamSide, position: number, playerId: string | null) => void;
  savePositionPlayer: (
    side: TeamSide,
    position: number,
    data: { name: string; number: string; role: PlayerRole },
  ) => void;
  addStaff: (side: TeamSide) => void;
  updateStaff: (side: TeamSide, id: string, patch: { name?: string; role?: string }) => void;
  removeStaff: (side: TeamSide, id: string) => void;
  substitute: (side: TeamSide, outId: string, inId: string) => void;
  history: ArchivedMatch[];
  archiveMatch: () => void;
  restoreMatch: (id: string) => void;
  deleteArchived: (id: string) => void;
  clearHistory: () => void;
}

export const useScorecardStore = create<ScorecardStore>((set, get) => ({
  match: load(),
  history: readHistory(),

  archiveMatch: () =>
    set((state) => {
      const entry: ArchivedMatch = {
        id: state.match.id,
        savedAt: Date.now(),
        snapshot: state.match,
      };
      const history = [entry, ...state.history.filter((item) => item.id !== entry.id)].slice(0, 30);
      writeHistory(history);
      return { history };
    }),

  restoreMatch: (id) =>
    set((state) => {
      const entry = state.history.find((item) => item.id === id);
      if (!entry) return {};
      return { match: persist(entry.snapshot) };
    }),

  deleteArchived: (id) =>
    set((state) => {
      const history = state.history.filter((item) => item.id !== id);
      writeHistory(history);
      return { history };
    }),

  clearHistory: () => {
    writeHistory([]);
    set({ history: [] });
  },

  addPoint: (side) =>
    set((state) => {
      const next = addPoint(state.match, side);
      if (next.winner && !state.history.some((item) => item.id === next.id)) {
        const entry: ArchivedMatch = { id: next.id, savedAt: Date.now(), snapshot: next };
        const history = [entry, ...state.history.filter((item) => item.id !== next.id)].slice(0, 30);
        writeHistory(history);
        return { match: persist(next), history };
      }
      return { match: persist(next) };
    }),
  undo: () => set((state) => ({ match: persist(undoPoint(state.match)) })),
  timeout: (side) =>
    set((state) => {
      const next = useTimeout(state.match, side);
      if (next === state.match) return {};
      return {
        match: persist({
          ...next,
          timeoutTimer: {
            side,
            endsAt: Date.now() + state.match.config.timeoutSeconds * 1000,
          },
        }),
      };
    }),
  clearTimeoutTimer: () =>
    set((state) => ({
      match: persist({ ...state.match, timeoutTimer: { side: null, endsAt: null } }),
    })),
  setTimeoutSeconds: (seconds) =>
    set((state) => ({
      match: persist({
        ...state.match,
        config: {
          ...state.match.config,
          timeoutSeconds: Math.min(600, Math.max(5, Math.round(seconds))),
        },
      }),
    })),
  toggleClock: () => set((state) => ({ match: persist(toggleClock(state.match)) })),
  resetClock: () => set((state) => ({ match: persist(resetClock(state.match)) })),
  setCountdownDuration: (durationMs) =>
    set((state) => ({ match: persist(setCountdownDuration(state.match, durationMs)) })),
  toggleCountdown: () => set((state) => ({ match: persist(toggleCountdown(state.match)) })),
  resetCountdown: () => set((state) => ({ match: persist(resetCountdown(state.match)) })),
  swapSides: () => set((state) => ({ match: persist(swapSides(state.match)) })),
  sub: (side) => set((state) => ({ match: persist(useSub(state.match, side)) })),
  finishSet: () =>
    set((state) => {
      const next = nextSet(state.match);
      if (next.winner && !state.history.some((item) => item.id === next.id)) {
        const entry: ArchivedMatch = { id: next.id, savedAt: Date.now(), snapshot: next };
        const history = [entry, ...state.history.filter((item) => item.id !== next.id)].slice(0, 30);
        writeHistory(history);
        return { match: persist(next), history };
      }
      return { match: persist(next) };
    }),

  setTeamName: (side, name) =>
    set((state) => ({
      match: persist({
        ...state.match,
        config: {
          ...state.match.config,
          [side === 'home' ? 'homeName' : 'awayName']: name,
        },
      }),
    })),

  setMatchType: (type) =>
    set(() => ({ match: persist(createMatch({ ...get().match.config, type })) })),

  setFormation: (side, formation) =>
    set((state) => ({
      match: persist(applyFormation(state.match, side, formation)),
    })),

  reset: () =>
    set(() => {
      const current = get().match;
      let next = createMatch(current.config);
      next = applyFormation(next, 'home', current.formations.home);
      next = applyFormation(next, 'away', current.formations.away);
      return { match: persist(next) };
    }),

  addPlayer: (side, role) =>
    set((state) => {
      const roster = state.match.rosters[side];
      const lineup = state.match.lineups[side];
      const emptyIndex = lineup.indexOf(null);
      const resolvedRole =
        role ?? (emptyIndex !== -1 ? formationRoles(state.match.formations[side])[emptyIndex] : 'outside');
      const player = createPlayer(
        '',
        String(roster.players.length + 1),
        emptyIndex !== -1,
        resolvedRole ?? 'outside',
      );
      const nextRoster = { ...roster, players: [...roster.players, player] };
      const nextLineup = [...lineup];
      if (emptyIndex !== -1) nextLineup[emptyIndex] = player.id;
      return {
        match: persist({
          ...state.match,
          rosters: { ...state.match.rosters, [side]: nextRoster },
          lineups: { ...state.match.lineups, [side]: nextLineup },
        }),
      };
    }),

  createBenchPlayer: (side, data) => {
    const player = createPlayer(data.name, data.number, false, data.role);
    set((state) => ({
      match: persist({
        ...state.match,
        rosters: {
          ...state.match.rosters,
          [side]: {
            ...state.match.rosters[side],
            players: [...state.match.rosters[side].players, player],
          },
        },
      }),
    }));
    return player.id;
  },

  updatePlayer: (side, id, patch) =>
    set((state) => ({
      match: persist({
        ...state.match,
        rosters: {
          ...state.match.rosters,
          [side]: {
            ...state.match.rosters[side],
            players: state.match.rosters[side].players.map((player) =>
              player.id === id ? { ...player, ...patch } : player,
            ),
          },
        },
      }),
    })),

  removePlayer: (side, id) =>
    set((state) => {
      const roster = {
        ...state.match.rosters[side],
        players: state.match.rosters[side].players.filter((player) => player.id !== id),
      };
      const next = withLineup(state.match, side, (lineup) =>
        lineup.map((entry) => (entry === id ? null : entry)),
      );
      return {
        match: persist({
          ...next,
          rosters: { ...next.rosters, [side]: roster },
        }),
      };
    }),

  toggleStarter: (side, id) =>
    set((state) => {
      const lineup = state.match.lineups[side];
      if (lineup.includes(id)) {
        return { match: persist(withLineup(state.match, side, (l) => l.map((e) => (e === id ? null : e)))) };
      }
      const emptyIndex = lineup.indexOf(null);
      if (emptyIndex === -1) return {};
      return {
        match: persist(
          withLineup(state.match, side, (l) => {
            const next = [...l];
            next[emptyIndex] = id;
            return next;
          }),
        ),
      };
    }),

  quickFill: (side) =>
    set((state) => {
      const roles = formationRoles(state.match.formations[side]);
      const players = Array.from({ length: 9 }, (_, index) =>
        createPlayer('', String(index + 1), index < 6, roles[index] ?? 'outside'),
      );
      return {
        match: persist({
          ...state.match,
          rosters: { ...state.match.rosters, [side]: { players, staff: state.match.rosters[side].staff } },
          lineups: {
            ...state.match.lineups,
            [side]: players.slice(0, 6).map((player) => player.id),
          },
        }),
      };
    }),

  assignPosition: (side, position, playerId) =>
    set((state) => ({
      match: persist(assignPosition(state.match, side, position, playerId)),
    })),

  savePositionPlayer: (side, position, data) =>
    set((state) => {
      const roster = state.match.rosters[side];
      const rotation = side === 'home' ? state.match.homeRotation : state.match.awayRotation;
      const index = (((position - rotation) % 6) + 6) % 6;
      const existingId = state.match.lineups[side][index] ?? null;
      const existing = existingId
        ? roster.players.find((player) => player.id === existingId)
        : undefined;

      if (existing) {
        const updated = { ...existing, ...data };
        const next = {
          ...state.match,
          rosters: {
            ...state.match.rosters,
            [side]: {
              ...roster,
              players: roster.players.map((player) => (player.id === existing.id ? updated : player)),
            },
          },
        };
        return { match: persist(next) };
      }

      const player = createPlayer(data.name, data.number, true, data.role);
      const next = {
        ...state.match,
        rosters: { ...state.match.rosters, [side]: { ...roster, players: [...roster.players, player] } },
      };
      return { match: persist(assignPosition(next, side, position, player.id)) };
    }),

  addStaff: (side) =>
    set((state) => ({
      match: persist({
        ...state.match,
        rosters: {
          ...state.match.rosters,
          [side]: {
            ...state.match.rosters[side],
            staff: [...state.match.rosters[side].staff, createStaff('', STAFF_ROLES[0])],
          },
        },
      }),
    })),

  updateStaff: (side, id, patch) =>
    set((state) => ({
      match: persist({
        ...state.match,
        rosters: {
          ...state.match.rosters,
          [side]: {
            ...state.match.rosters[side],
            staff: state.match.rosters[side].staff.map((member) =>
              member.id === id ? { ...member, ...patch } : member,
            ),
          },
        },
      }),
    })),

  removeStaff: (side, id) =>
    set((state) => ({
      match: persist({
        ...state.match,
        rosters: {
          ...state.match.rosters,
          [side]: {
            ...state.match.rosters[side],
            staff: state.match.rosters[side].staff.filter((member) => member.id !== id),
          },
        },
      }),
    })),

  substitute: (side, outId, inId) =>
    set((state) => ({ match: persist(substitute(state.match, side, outId, inId)) })),
}));
