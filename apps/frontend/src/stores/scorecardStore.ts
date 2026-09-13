import { create } from 'zustand';
import {
  addPoint,
  createMatch,
  nextSet,
  undoPoint,
  useSub,
  useTimeout,
  type MatchState,
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
    return { ...base, ...parsed, config: base.config };
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
}));
