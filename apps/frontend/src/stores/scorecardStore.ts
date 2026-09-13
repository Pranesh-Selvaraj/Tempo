import { create } from 'zustand';
import type { PlayerRole } from '@tempo/shared-types';
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
  substitute,
  undoPoint,
  useSub,
  useTimeout,
  type MatchState,
  type TeamPlayer,
  type TeamSide,
} from '../features/scorecard/match';

const STORAGE_KEY = 'tempo.scorecard.v1';

function load(): MatchState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createMatch();
    const parsed = JSON.parse(raw) as Partial<MatchState>;
    const base = createMatch(parsed.config);
    if (typeof parsed.homeScore !== 'number' || !Array.isArray(parsed.events)) return base;
    return {
      ...base,
      ...parsed,
      config: base.config,
      formation: parsed.formation ?? '5-1',
      rosters: {
        home: parsed.rosters?.home ?? base.rosters.home,
        away: parsed.rosters?.away ?? base.rosters.away,
      },
      lineups: {
        home: parsed.lineups?.home ?? base.lineups.home,
        away: parsed.lineups?.away ?? base.lineups.away,
      },
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
  sub: (side: TeamSide) => void;
  finishSet: () => void;
  setTeamName: (side: TeamSide, name: string) => void;
  setBestOf: (bestOf: 3 | 5) => void;
  setFormation: (formation: MatchState['formation']) => void;
  reset: () => void;
  addPlayer: (side: TeamSide, role?: PlayerRole) => void;
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
}

export const useScorecardStore = create<ScorecardStore>((set, get) => ({
  match: load(),

  addPoint: (side) => set((state) => ({ match: persist(addPoint(state.match, side)) })),
  undo: () => set((state) => ({ match: persist(undoPoint(state.match)) })),
  timeout: (side) => set((state) => ({ match: persist(useTimeout(state.match, side)) })),
  sub: (side) => set((state) => ({ match: persist(useSub(state.match, side)) })),
  finishSet: () => set((state) => ({ match: persist(nextSet(state.match)) })),

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

  setBestOf: (bestOf) =>
    set(() => ({ match: persist(createMatch({ ...get().match.config, bestOf })) })),

  setFormation: (formation) =>
    set((state) => ({ match: persist(applyFormation(state.match, formation)) })),

  reset: () =>
    set(() => {
      const current = get().match;
      const next = createMatch(current.config);
      return { match: persist(applyFormation(next, current.formation)) };
    }),

  addPlayer: (side, role = 'outside') =>
    set((state) => {
      const roster = state.match.rosters[side];
      const lineup = state.match.lineups[side];
      const emptyIndex = lineup.indexOf(null);
      const player = createPlayer(
        '',
        String(roster.players.length + 1),
        emptyIndex !== -1,
        role,
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
      const roles = formationRoles(state.match.formation);
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
