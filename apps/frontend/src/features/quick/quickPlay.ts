import {
  ATTACK_LINE_X,
  ROLE_COLORS,
  ROLE_LABELS,
  TRAJECTORY_COLORS,
  clamp,
  type PlayerRole,
  type PlayerState,
  type TrajectoryType,
  type Vec3,
} from '@tempo/shared-types';
import type { Keyframe, Trajectory } from '../../lib/trpc';

export const QUICK_STEPS = ['receive', 'ball', 'attack', 'play'] as const;
export type QuickStep = (typeof QUICK_STEPS)[number];

export const QUICK_STEP_LABELS: Record<QuickStep, string> = {
  receive: '1 · Receive',
  ball: '2 · Ball path',
  attack: '3 · Attack',
  play: '4 · Watch',
};

export const QUICK_TIMING = {
  serve: { startMs: 0, durationMs: 1300 },
  pass: { startMs: 1400, durationMs: 1100 },
  set: { startMs: 2600, durationMs: 900 },
  attack: { startMs: 3600, durationMs: 750 },
  passContactMs: 2500,
  spikeAtMs: 3700,
  totalMs: 4800,
} as const;

export const QUICK_SET_HEIGHT_DEFAULT = 3.1;
export const QUICK_SET_HEIGHT_MIN = 2;
export const QUICK_SET_HEIGHT_MAX = 3.9;

const OPPONENT_PREFIX = 'opp';
const SERVE_FROM_X = -8.6;
const SERVE_FROM_Y = 1.35;
const BALL_CONTACT_Y = 1.35;

export interface QuickLeg {
  type: TrajectoryType;
  label: string;
  startMs: number;
  durationMs: number;
  controlPoints: Vec3[];
}

export function isOpponent(playerId: string): boolean {
  return playerId.startsWith(OPPONENT_PREFIX);
}

export function opponentIds(): string[] {
  return [`${OPPONENT_PREFIX}91`, `${OPPONENT_PREFIX}92`, `${OPPONENT_PREFIX}93`];
}

export function homePlayers(players: PlayerState[]): PlayerState[] {
  return players.filter((player) => !isOpponent(player.playerId));
}

function arc(from: Vec3, to: Vec3, apexY: number): Vec3[] {
  return [from, { x: (from.x + to.x) / 2, y: apexY, z: (from.z + to.z) / 2 }, to];
}

export function buildLegs(
  targets: Vec3[],
  spikeTarget: Vec3 | null,
  setHeight: number,
): QuickLeg[] {
  const legs: QuickLeg[] = [];
  const serveLand = targets[0];
  const passTarget = targets[1];
  const setTarget = targets[2];
  const setY = clamp(setHeight, QUICK_SET_HEIGHT_MIN, QUICK_SET_HEIGHT_MAX);

  if (serveLand) {
    const serveFrom: Vec3 = {
      x: SERVE_FROM_X,
      y: SERVE_FROM_Y,
      z: serveLand.z >= 0 ? -2.8 : 2.8,
    };
    legs.push({
      type: 'serve',
      label: 'Serve',
      ...QUICK_TIMING.serve,
      controlPoints: arc(serveFrom, { x: serveLand.x, y: 0.15, z: serveLand.z }, 3.5),
    });
  }

  if (serveLand && passTarget) {
    legs.push({
      type: 'pass',
      label: 'Pass',
      ...QUICK_TIMING.pass,
      controlPoints: arc(
        { x: serveLand.x, y: 0.7, z: serveLand.z },
        { x: passTarget.x, y: BALL_CONTACT_Y, z: passTarget.z },
        2.3,
      ),
    });
  }

  if (passTarget && setTarget) {
    legs.push({
      type: 'set',
      label: 'Set',
      ...QUICK_TIMING.set,
      controlPoints: arc(
        { x: passTarget.x, y: BALL_CONTACT_Y, z: passTarget.z },
        { x: setTarget.x, y: setY, z: setTarget.z },
        setY + 0.35,
      ),
    });
  }

  if (setTarget && spikeTarget) {
    const netX = clamp((setTarget.x + spikeTarget.x) / 2, -2.2, 2.2);
    legs.push({
      type: 'attack',
      label: 'Spike',
      ...QUICK_TIMING.attack,
      controlPoints: [
        { x: setTarget.x, y: setY, z: setTarget.z },
        { x: netX, y: setY + 0.15, z: (setTarget.z + spikeTarget.z) / 2 },
        { x: spikeTarget.x, y: 0.15, z: spikeTarget.z },
      ],
    });
  }

  return legs;
}

export function buildOpponents(count: number, anchorZ: number): PlayerState[] {
  const zones: Record<number, number[]> = { 1: [0], 2: [-0.95, 0.95], 3: [-1.9, 0, 1.9] };
  const offsets = zones[clamp(Math.round(count), 0, 3)] ?? [];
  return offsets.map((offset, index) => ({
    playerId: opponentIds()[index]!,
    role: 'middle' as const,
    position: { x: -0.42, y: 0, z: clamp(anchorZ + offset, -5.4, 5.4) },
    rotationY: -90,
    pose: 'ready' as const,
    animationTime: 0,
  }));
}

export function syncOpponents(players: PlayerState[], count: number, anchorZ: number): PlayerState[] {
  return [...homePlayers(players), ...buildOpponents(count, anchorZ)];
}

function distance2D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function nearestTo(
  players: PlayerState[],
  target: Vec3 | null,
  exclude: string[] = [],
): PlayerState | null {
  if (!target) return null;
  let best: PlayerState | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const player of players) {
    if (exclude.includes(player.playerId)) continue;
    const distance = distance2D(player.position, target);
    if (distance < bestDistance) {
      best = player;
      bestDistance = distance;
    }
  }
  return best;
}

export function receiverFor(players: PlayerState[], serveTarget: Vec3 | null): PlayerState | null {
  return nearestTo(homePlayers(players), serveTarget);
}

export function setterFor(players: PlayerState[], setTarget: Vec3 | null): PlayerState | null {
  return nearestTo(homePlayers(players), setTarget);
}

export function spikerFor(
  players: PlayerState[],
  setTarget: Vec3 | null,
  spikeTarget: Vec3 | null,
): PlayerState | null {
  const setter = setterFor(players, setTarget);
  const home = homePlayers(players);
  return (
    nearestTo(home, spikeTarget, setter ? [setter.playerId] : []) ??
    nearestTo(home, setTarget, setter ? [setter.playerId] : [])
  );
}

export function autoPose(
  players: PlayerState[],
  opts: { passTarget?: Vec3 | null; setTarget?: Vec3 | null; spikeTarget?: Vec3 | null },
): PlayerState[] {
  const home = homePlayers(players);
  const receiver = opts.passTarget ? receiverFor(home, opts.passTarget) : null;
  const setter = setterFor(home, opts.setTarget ?? null);
  const spiker = spikerFor(home, opts.setTarget ?? null, opts.spikeTarget ?? null);
  return players.map((player) => {
    if (isOpponent(player.playerId)) return { ...player, pose: 'block' as const };
    if (player.playerId === spiker?.playerId) return { ...player, pose: 'spike' as const };
    if (player.playerId === setter?.playerId) return { ...player, pose: 'set' as const };
    if (player.playerId === receiver?.playerId && opts.passTarget) {
      return { ...player, pose: 'pass' as const };
    }
    return { ...player, pose: 'ready' as const };
  });
}

export function buildTrajectories(playId: string, legs: QuickLeg[]): Trajectory[] {
  return legs.map((leg) => ({
    id: crypto.randomUUID(),
    playId,
    type: leg.type,
    controlPoints: leg.controlPoints,
    startMs: leg.startMs,
    durationMs: leg.durationMs,
    color: TRAJECTORY_COLORS[leg.type],
    visible: true,
  }));
}

export function buildKeyframes(
  playId: string,
  args: {
    receive: PlayerState[];
    attack: PlayerState[];
    serveTarget: Vec3 | null;
    setterSpot: Vec3 | null;
    setTarget: Vec3 | null;
    spikeTarget: Vec3 | null;
  },
): Keyframe[] {
  const receiver = receiverFor(args.receive, args.serveTarget);
  const received = args.receive.map((player) => ({ ...player, pose: 'ready' as const }));
  const passed = args.receive.map((player) => ({
    ...player,
    pose: player.playerId === receiver?.playerId ? ('pass' as const) : ('ready' as const),
  }));
  const attacked = autoPose(args.attack, {
    passTarget: args.serveTarget,
    setTarget: args.setterSpot,
    spikeTarget: args.spikeTarget,
  });

  const make = (timestampMs: number, playerStates: PlayerState[]): Keyframe => ({
    id: crypto.randomUUID(),
    playId,
    timestampMs,
    playerStates,
    ballState: null,
    cameraState: null,
    createdAt: new Date(),
  });

  return [
    make(0, received),
    make(QUICK_TIMING.passContactMs, passed),
    make(QUICK_TIMING.spikeAtMs, attacked),
  ];
}

export function zoneForPosition(position: Vec3): { zone: number; label: string } {
  const front = position.x < ATTACK_LINE_X + 0.05;
  const left = position.z > 0.75;
  const right = position.z < -0.75;
  if (front) {
    if (left) return { zone: 4, label: 'Zone 4 · Left Front' };
    if (right) return { zone: 2, label: 'Zone 2 · Right Front' };
    return { zone: 3, label: 'Zone 3 · Middle Front' };
  }
  if (left) return { zone: 5, label: 'Zone 5 · Left Back' };
  if (right) return { zone: 1, label: 'Zone 1 · Right Back' };
  return { zone: 6, label: 'Zone 6 · Middle Back' };
}

export interface QuickRosterRow {
  playerId: string;
  number: string;
  role: PlayerRole;
  roleLabel: string;
  color: string;
  zone: number;
  zoneLabel: string;
  task: string | null;
  runDistance: number | null;
  opponent: boolean;
}

export function rosterRows(
  players: PlayerState[],
  opts: {
    serveTarget: Vec3 | null;
    setterSpot: Vec3 | null;
    setTarget: Vec3 | null;
    spikeTarget: Vec3 | null;
    receiveFormation: PlayerState[] | null;
  },
): QuickRosterRow[] {
  const home = homePlayers(players);
  const receiver = receiverFor(home, opts.serveTarget);
  const setter = setterFor(home, opts.setterSpot);
  const spiker = spikerFor(home, opts.setTarget, opts.spikeTarget);
  const origin = opts.receiveFormation
    ? new Map(opts.receiveFormation.map((player) => [player.playerId, player]))
    : null;

  return players
    .map((player) => {
      const { zone, label } = zoneForPosition(player.position);
      const from = origin?.get(player.playerId);
      const runDistance = from ? distance2D(from.position, player.position) : null;
      let task: string | null = null;
      if (isOpponent(player.playerId)) task = 'Blocker';
      else if (player.playerId === spiker?.playerId) task = 'Spiker';
      else if (player.playerId === setter?.playerId) task = 'Setter';
      else if (player.playerId === receiver?.playerId) task = 'Receiver';

      return {
        playerId: player.playerId,
        number: player.playerId.replace(/\D/g, '') || player.playerId,
        role: player.role,
        roleLabel: ROLE_LABELS[player.role],
        color: isOpponent(player.playerId) ? '#f97316' : ROLE_COLORS[player.role],
        zone: zone,
        zoneLabel: label,
        task,
        runDistance: runDistance !== null && runDistance > 0.15 ? runDistance : null,
        opponent: isOpponent(player.playerId),
      };
    })
    .sort((a, b) =>
      a.opponent === b.opponent
        ? Number(a.number) - Number(b.number)
        : a.opponent
          ? 1
          : -1,
    );
}
