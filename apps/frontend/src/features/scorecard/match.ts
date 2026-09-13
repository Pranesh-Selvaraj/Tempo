import {
  ROTATION_POSITIONS,
  getFormationRoster,
  nextRotation,
  type Formation,
  type PlayerRole,
} from '@tempo/shared-types';

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

export interface TeamPlayer {
  id: string;
  name: string;
  number: string;
  starter: boolean;
  role: PlayerRole;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface TeamRoster {
  players: TeamPlayer[];
  staff: StaffMember[];
}

export interface SubEvent {
  setIndex: number;
  side: TeamSide;
  outId: string;
  inId: string;
  /** Number of points played when the substitution happened. */
  eventIndex: number;
}

export const STAFF_ROLES = [
  'Head Coach',
  'Assistant Coach',
  'Trainer',
  'Team Manager',
  'Statistician',
  'Physio',
] as const;

export interface MatchState {
  config: MatchConfig;
  formation: Formation;
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
  rosters: { home: TeamRoster; away: TeamRoster };
  lineups: { home: (string | null)[]; away: (string | null)[] };
  subEvents: SubEvent[];
}

export const SET_TIMEOUTS = 2;
export const SET_SUBS = 6;

export function emptyRoster(): TeamRoster {
  return { players: [], staff: [] };
}

export function emptyLineup(): (string | null)[] {
  return Array.from({ length: 6 }, () => null);
}

export function createPlayer(
  name: string,
  number: string,
  starter: boolean,
  role: PlayerRole = 'outside',
): TeamPlayer {
  return { id: crypto.randomUUID(), name, number, starter, role };
}

export function createStaff(name: string, role: string): StaffMember {
  return { id: crypto.randomUUID(), name, role };
}

export function positionLabel(position: number): string {
  return ROTATION_POSITIONS.find((spot) => spot.position === position)?.label ?? `Position ${position}`;
}

export function lineupIndexForPosition(rotation: number, position: number): number {
  return (((position - rotation) % 6) + 6) % 6;
}

export function formationRoles(formation: Formation): PlayerRole[] {
  return getFormationRoster(formation, false).map((player) => player.role);
}

/** Role the formation assigns to a position slot for the current rotation. */
export function expectedRoleAt(state: MatchState, side: TeamSide, position: number): PlayerRole {
  const rotation = side === 'home' ? state.homeRotation : state.awayRotation;
  const index = lineupIndexForPosition(rotation, position);
  return formationRoles(state.formation)[index] ?? 'outside';
}

/** Keep each starter flag in sync with the six players who are actually on court. */
export function syncStarters(state: MatchState, side: TeamSide): MatchState {
  const lineup = state.lineups[side];
  const roster = state.rosters[side];
  return {
    ...state,
    rosters: {
      ...state.rosters,
      [side]: {
        ...roster,
        players: roster.players.map((player) => ({
          ...player,
          starter: lineup.includes(player.id),
        })),
      },
    },
  };
}

/** Place a player into a court position, swapping if they already occupy another slot. */
export function assignPosition(
  state: MatchState,
  side: TeamSide,
  position: number,
  playerId: string | null,
): MatchState {
  const rotation = side === 'home' ? state.homeRotation : state.awayRotation;
  const index = lineupIndexForPosition(rotation, position);
  const lineup = [...state.lineups[side]];
  while (lineup.length < 6) lineup.push(null);

  if (playerId === null) {
    lineup[index] = null;
  } else {
    const existing = lineup.indexOf(playerId);
    if (existing !== -1 && existing !== index) {
      lineup[existing] = lineup[index] ?? null;
      lineup[index] = playerId;
    } else {
      lineup[index] = playerId;
    }
  }

  return syncStarters({ ...state, lineups: { ...state.lineups, [side]: lineup } }, side);
}

/** Apply a formation's role pattern to the six on-court players, by rotation order. */
export function applyFormation(state: MatchState, formation: Formation): MatchState {
  const roles = formationRoles(formation);
  const rosters = { ...state.rosters };
  for (const side of ['home', 'away'] as TeamSide[]) {
    const lineup = state.lineups[side];
    rosters[side] = {
      ...state.rosters[side],
      players: state.rosters[side].players.map((player) => {
        const index = lineup.indexOf(player.id);
        if (index === -1) return player;
        return { ...player, role: roles[index] ?? player.role };
      }),
    };
  }
  return { ...state, formation, rosters };
}

/** The on-court six, in rotation order (index 0 starts at position 1). */
export function buildLineup(roster: TeamRoster): (string | null)[] {
  const starters = roster.players.filter((player) => player.starter).slice(0, 6);
  const lineup: (string | null)[] = starters.map((player) => player.id);
  while (lineup.length < 6) lineup.push(null);
  return lineup;
}

export function createMatch(config: Partial<MatchConfig> = {}): MatchState {
  return {
    config: {
      homeName: config.homeName ?? 'Home',
      awayName: config.awayName ?? 'Away',
      bestOf: config.bestOf ?? 5,
    },
    formation: '5-1',
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
    rosters: { home: emptyRoster(), away: emptyRoster() },
    lineups: { home: emptyLineup(), away: emptyLineup() },
    subEvents: [],
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

/** Swap an on-court player with a bench player, keeping their rotation slot. */
export function substitute(
  state: MatchState,
  side: TeamSide,
  outId: string,
  inId: string,
): MatchState {
  if (state.subs[side] >= SET_SUBS) return state;
  const lineup = state.lineups[side];
  const index = lineup.indexOf(outId);
  if (index === -1 || lineup.includes(inId)) return state;
  const next = [...lineup];
  next[index] = inId;
  return {
    ...state,
    lineups: { ...state.lineups, [side]: next },
    subs: { ...state.subs, [side]: state.subs[side] + 1 },
    subEvents: [
      ...state.subEvents,
      { setIndex: state.sets.length, side, outId, inId, eventIndex: state.events.length },
    ],
  };
}

/** Player id occupying a 1–6 rotation position, or null when no lineup is set. */
export function playerAtPosition(
  state: MatchState,
  side: TeamSide,
  rotation: number,
  position: number,
): string | null {
  const lineup = state.lineups[side];
  if (lineup.length < 6) return null;
  const index = (((position - rotation) % 6) + 6) % 6;
  return lineup[index] ?? null;
}

export interface PlayerStat {
  playerId: string;
  side: TeamSide;
  name: string;
  number: string;
  role: PlayerRole;
  servicePoints: number;
  ralliesOnCourt: number;
  subsIn: number;
  maxServingRun: number;
}

export function computePlayerStats(state: MatchState): PlayerStat[] {
  const stats = new Map<string, PlayerStat>();
  for (const side of ['home', 'away'] as TeamSide[]) {
    for (const player of state.rosters[side].players) {
      stats.set(player.id, {
        playerId: player.id,
        side,
        name: player.name || `#${player.number}`,
        number: player.number,
        role: player.role,
        servicePoints: 0,
        ralliesOnCourt: 0,
        subsIn: 0,
        maxServingRun: 0,
      });
    }
  }

  const lineups: { home: (string | null)[]; away: (string | null)[] } = {
    home: [...state.lineups.home],
    away: [...state.lineups.away],
  };
  for (const sub of [...state.subEvents].reverse()) {
    const lineup = lineups[sub.side];
    const index = lineup.indexOf(sub.inId);
    if (index !== -1) lineup[index] = sub.outId;
  }

  const substitutions = [...state.subEvents].sort((a, b) => a.eventIndex - b.eventIndex);
  let subPointer = 0;
  const idAt = (side: TeamSide, rotation: number, position: number): string | null => {
    const lineup = lineups[side];
    if (lineup.length < 6) return null;
    const index = (((position - rotation) % 6) + 6) % 6;
    return lineup[index] ?? null;
  };

  const currentRun = new Map<string, number>();
  for (let eventIndex = 0; eventIndex < state.events.length; eventIndex += 1) {
    const event = state.events[eventIndex]!;
    while (subPointer < substitutions.length && substitutions[subPointer]!.eventIndex <= eventIndex) {
      const sub = substitutions[subPointer]!;
      const lineup = lineups[sub.side];
      const index = lineup.indexOf(sub.outId);
      if (index !== -1) lineup[index] = sub.inId;
      subPointer += 1;
    }

    for (const side of ['home', 'away'] as TeamSide[]) {
      const rotation = side === 'home' ? event.homeRotationBefore : event.awayRotationBefore;
      for (let position = 1; position <= 6; position += 1) {
        const id = idAt(side, rotation, position);
        const stat = id ? stats.get(id) : undefined;
        if (stat) stat.ralliesOnCourt += 1;
      }
    }

    if (event.scoring === event.servingBefore) {
      const rotation =
        event.scoring === 'home' ? event.homeRotationBefore : event.awayRotationBefore;
      const serverId = idAt(event.scoring, rotation, 1);
      const stat = serverId ? stats.get(serverId) : undefined;
      if (stat) {
        stat.servicePoints += 1;
        const run = (currentRun.get(stat.playerId) ?? 0) + 1;
        currentRun.set(stat.playerId, run);
        stat.maxServingRun = Math.max(stat.maxServingRun, run);
      }
    } else {
      currentRun.clear();
    }
  }

  for (const event of state.subEvents) {
    const stat = stats.get(event.inId);
    if (stat) stat.subsIn += 1;
  }

  return [...stats.values()];
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
