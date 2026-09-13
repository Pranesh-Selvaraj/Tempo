import { nextRotation } from '@tempo/shared-types';

export type TeamSide = 'home' | 'away';

export interface SetScore {
  home: number;
  away: number;
}

export interface MatchEvent {
  setIndex: number;
  scoring: TeamSide;
  servingBefore: TeamSide;
  firstServeBefore: TeamSide;
  homeRotationBefore: number;
  awayRotationBefore: number;
  homeScoreBefore: number;
  awayScoreBefore: number;
  timeoutsBefore: { home: number; away: number };
  subsBefore: { home: number; away: number };
  setCompleted: boolean;
}

export interface MatchConfig {
  homeName: string;
  awayName: string;
  bestOf: 3 | 5;
}

export interface MatchState {
  config: MatchConfig;
  homeScore: number;
  awayScore: number;
  sets: SetScore[];
  serving: TeamSide;
  firstServe: TeamSide;
  homeRotation: number;
  awayRotation: number;
  timeouts: { home: number; away: number };
  subs: { home: number; away: number };
  events: MatchEvent[];
  winner: TeamSide | null;
}

export const SET_TIMEOUTS = 2;
export const SET_SUBS = 6;

export function createMatch(config: Partial<MatchConfig> = {}): MatchState {
  return {
    config: {
      homeName: config.homeName ?? 'Home',
      awayName: config.awayName ?? 'Away',
      bestOf: config.bestOf ?? 5,
    },
    homeScore: 0,
    awayScore: 0,
    sets: [],
    serving: 'home',
    firstServe: 'home',
    homeRotation: 1,
    awayRotation: 1,
    timeouts: { home: 0, away: 0 },
    subs: { home: 0, away: 0 },
    events: [],
    winner: null,
  };
}

export function maxSets(bestOf: 3 | 5): number {
  return bestOf === 5 ? 5 : 3;
}

export function currentSetNumber(state: MatchState): number {
  return state.sets.length + 1;
}

export function setTarget(state: MatchState): number {
  return currentSetNumber(state) === maxSets(state.config.bestOf) ? 15 : 25;
}

export function setsWon(state: MatchState, side: TeamSide): number {
  return state.sets.filter((set) =>
    side === 'home' ? set.home > set.away : set.away > set.home,
  ).length;
}

export function matchPoint(state: MatchState, side: TeamSide): boolean {
  if (state.winner) return false;
  const target = setTarget(state);
  const own = side === 'home' ? state.homeScore : state.awayScore;
  const other = side === 'home' ? state.awayScore : state.homeScore;
  const needed = Math.ceil(maxSets(state.config.bestOf) / 2);
  return own >= target - 1 && own - other >= 1 && setsWon(state, side) === needed - 1;
}

export function isDecidingSet(state: MatchState): boolean {
  return currentSetNumber(state) === maxSets(state.config.bestOf);
}

export function switchSidesAt(state: MatchState): number | null {
  return isDecidingSet(state) ? 8 : null;
}

export function addPoint(state: MatchState, scoring: TeamSide): MatchState {
  if (state.winner) return state;

  const event: MatchEvent = {
    setIndex: state.sets.length,
    scoring,
    servingBefore: state.serving,
    firstServeBefore: state.firstServe,
    homeRotationBefore: state.homeRotation,
    awayRotationBefore: state.awayRotation,
    homeScoreBefore: state.homeScore,
    awayScoreBefore: state.awayScore,
    timeoutsBefore: { ...state.timeouts },
    subsBefore: { ...state.subs },
    setCompleted: false,
  };

  let homeScore = state.homeScore + (scoring === 'home' ? 1 : 0);
  let awayScore = state.awayScore + (scoring === 'away' ? 1 : 0);
  let serving = state.serving;
  let firstServe = state.firstServe;
  let homeRotation = state.homeRotation;
  let awayRotation = state.awayRotation;
  let timeouts = state.timeouts;
  let subs = state.subs;
  let sets = state.sets;
  let winner: TeamSide | null = null;

  if (scoring !== serving) {
    serving = scoring;
    if (scoring === 'home') homeRotation = nextRotation(homeRotation);
    else awayRotation = nextRotation(awayRotation);
  }

  const target = setTarget(state);
  const won = (homeScore >= target || awayScore >= target) && Math.abs(homeScore - awayScore) >= 2;
  if (won) {
    event.setCompleted = true;
    sets = [...sets, { home: homeScore, away: awayScore }];
    homeScore = 0;
    awayScore = 0;
    timeouts = { home: 0, away: 0 };
    subs = { home: 0, away: 0 };
    const needed = Math.ceil(maxSets(state.config.bestOf) / 2);
    if (setsWon({ ...state, sets }, 'home') >= needed) winner = 'home';
    else if (setsWon({ ...state, sets }, 'away') >= needed) winner = 'away';
    serving = firstServe === 'home' ? 'away' : 'home';
    firstServe = serving;
  }

  return {
    ...state,
    homeScore,
    awayScore,
    serving,
    firstServe,
    homeRotation,
    awayRotation,
    timeouts,
    subs,
    sets,
    events: [...state.events, event],
    winner,
  };
}

export function undoPoint(state: MatchState): MatchState {
  const event = state.events.at(-1);
  if (!event) return state;
  return {
    ...state,
    homeScore: event.homeScoreBefore,
    awayScore: event.awayScoreBefore,
    serving: event.servingBefore,
    firstServe: event.firstServeBefore,
    homeRotation: event.homeRotationBefore,
    awayRotation: event.awayRotationBefore,
    timeouts: { ...event.timeoutsBefore },
    subs: { ...event.subsBefore },
    sets: event.setCompleted ? state.sets.slice(0, -1) : state.sets,
    events: state.events.slice(0, -1),
    winner: null,
  };
}

export function nextSet(state: MatchState): MatchState {
  if (state.winner || state.sets.length >= maxSets(state.config.bestOf) - 1) return state;
  const completed: SetScore = { home: state.homeScore, away: state.awayScore };
  const sets = [...state.sets, completed];
  const needed = Math.ceil(maxSets(state.config.bestOf) / 2);
  const homeSets = sets.filter((set) => set.home > set.away).length;
  const awaySets = sets.filter((set) => set.away > set.home).length;
  const winner: TeamSide | null =
    homeSets >= needed ? 'home' : awaySets >= needed ? 'away' : null;
  const serving = state.firstServe === 'home' ? 'away' : 'home';
  return {
    ...state,
    homeScore: 0,
    awayScore: 0,
    sets,
    serving,
    firstServe: serving,
    timeouts: { home: 0, away: 0 },
    subs: { home: 0, away: 0 },
    winner,
  };
}

export function useTimeout(state: MatchState, side: TeamSide): MatchState {
  if (state.timeouts[side] >= SET_TIMEOUTS) return state;
  return { ...state, timeouts: { ...state.timeouts, [side]: state.timeouts[side] + 1 } };
}

export function useSub(state: MatchState, side: TeamSide): MatchState {
  if (state.subs[side] >= SET_SUBS) return state;
  return { ...state, subs: { ...state.subs, [side]: state.subs[side] + 1 } };
}

export interface MatchAnalytics {
  totalRallies: number;
  sideout: { home: number | null; away: number | null };
  pointsByRotation: { rotation: number; points: number }[];
  longestRun: { home: number; away: number };
  receptionCounts: { home: number; away: number };
}

export function computeAnalytics(state: MatchState): MatchAnalytics {
  const events = state.events;
  const reception = (side: TeamSide) => events.filter((event) => event.servingBefore !== side).length;
  const sideoutPoints = (side: TeamSide) =>
    events.filter((event) => event.servingBefore !== side && event.scoring === side).length;
  const rate = (side: TeamSide) => {
    const total = reception(side);
    return total === 0 ? null : Math.round((sideoutPoints(side) / total) * 100);
  };

  let bestHome = 0;
  let bestAway = 0;
  let runHome = 0;
  let runAway = 0;
  for (const event of events) {
    if (event.scoring === 'home') {
      runHome += 1;
      runAway = 0;
    } else {
      runAway += 1;
      runHome = 0;
    }
    bestHome = Math.max(bestHome, runHome);
    bestAway = Math.max(bestAway, runAway);
  }

  return {
    totalRallies: events.length,
    sideout: { home: rate('home'), away: rate('away') },
    pointsByRotation: [1, 2, 3, 4, 5, 6].map((rotation) => ({
      rotation,
      points: events.filter(
        (event) => event.scoring === 'home' && event.homeRotationBefore === rotation,
      ).length,
    })),
    longestRun: { home: bestHome, away: bestAway },
    receptionCounts: { home: reception('home'), away: reception('away') },
  };
}

export function rotationPositionLabel(rotation: number): string {
  const labels: Record<number, string> = {
    1: 'Right Back',
    2: 'Right Front',
    3: 'Middle Front',
    4: 'Left Front',
    5: 'Left Back',
    6: 'Middle Back',
  };
  return labels[rotation] ?? 'Right Back';
}
