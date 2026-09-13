import { create } from 'zustand';
import {
  STAFF_ROLES,
  addPoint,
  buildLineup,
  createMatch,
  createPlayer,
  createStaff,
  nextSet,
  substitute,
  undoPoint,
  useSub,
  useTimeout,
  type MatchState,
  type TeamPlayer,
  type TeamRoster,
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

function withRoster(
  state: MatchState,
  side: TeamSide,
  updater: (roster: TeamRoster) => TeamRoster,
): MatchState {
  const roster = updater(state.rosters[side]);
  return {
    ...state,
    rosters: { ...state.rosters, [side]: roster },
    lineups: { ...state.lineups, [side]: buildLineup(roster) },
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
  reset: () => void;
  addPlayer: (side: TeamSide) => void;
  updatePlayer: (side: TeamSide, id: string, patch: Partial<TeamPlayer>) => void;
  removePlayer: (side: TeamSide, id: string) => void;
  toggleStarter: (side: TeamSide, id: string) => void;
  quickFill: (side: TeamSide) => void;
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

  reset: () => set(() => ({ match: persist(createMatch(get().match.config)) })),

  addPlayer: (side) =>
    set((state) => {
      const roster = state.match.rosters[side];
      const player = createPlayer('', String(roster.players.length + 1), roster.players.length < 6);
      return {
        match: persist(
          withRoster(state.match, side, (current) => ({
            ...current,
            players: [...current.players, player],
          })),
        ),
      };
    }),

  updatePlayer: (side, id, patch) =>
    set((state) => ({
      match: persist(
        withRoster(state.match, side, (current) => ({
          ...current,
          players: current.players.map((player) =>
            player.id === id ? { ...player, ...patch } : player,
          ),
        })),
      ),
    })),

  removePlayer: (side, id) =>
    set((state) => ({
      match: persist(
        withRoster(state.match, side, (current) => ({
          ...current,
          players: current.players.filter((player) => player.id !== id),
        })),
      ),
    })),

  toggleStarter: (side, id) =>
    set((state) => {
      const roster = state.match.rosters[side];
      const target = roster.players.find((player) => player.id === id);
      if (!target) return {};
      const starters = roster.players.filter((player) => player.starter).length;
      if (!target.starter && starters >= 6) return {};
      return {
        match: persist(
          withRoster(state.match, side, (current) => ({
            ...current,
            players: current.players.map((player) =>
              player.id === id ? { ...player, starter: !player.starter } : player,
            ),
          })),
        ),
      };
    }),

  quickFill: (side) =>
    set((state) => ({
      match: persist(
        withRoster(state.match, side, (current) => ({
          ...current,
          players: Array.from({ length: 9 }, (_, index) =>
            createPlayer('', String(index + 1), index < 6),
          ),
        })),
      ),
    })),

  addStaff: (side) =>
    set((state) => ({
      match: persist(
        withRoster(state.match, side, (current) => ({
          ...current,
          staff: [...current.staff, createStaff('', STAFF_ROLES[0])],
        })),
      ),
    })),

  updateStaff: (side, id, patch) =>
    set((state) => ({
      match: persist(
        withRoster(state.match, side, (current) => ({
          ...current,
          staff: current.staff.map((member) =>
            member.id === id ? { ...member, ...patch } : member,
          ),
        })),
      ),
    })),

  removeStaff: (side, id) =>
    set((state) => ({
      match: persist(
        withRoster(state.match, side, (current) => ({
          ...current,
          staff: current.staff.filter((member) => member.id !== id),
        })),
      ),
    })),

  substitute: (side, outId, inId) =>
    set((state) => ({ match: persist(substitute(state.match, side, outId, inId)) })),
}));
