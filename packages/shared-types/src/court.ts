import { z } from 'zod';
import type { Vec3 } from './geometry';

/**
 * Court geometry. Units are ALWAYS meters.
 * Origin: center of the net, on the floor. Net runs along the Z axis at x=0.
 * The home team attacks toward -X, the away team toward +X.
 */
export const COURT_LENGTH = 18; // along X
export const COURT_WIDTH = 9; // along Z
export const COURT_HALF_LENGTH = COURT_LENGTH / 2; // 9
export const COURT_HALF_WIDTH = COURT_WIDTH / 2; // 4.5
export const ATTACK_LINE_X = 3;
export const NET_X = 0;
export const NET_HEIGHT_MEN = 2.43;
export const NET_HEIGHT_WOMEN = 2.24;
export const NET_HALF_WIDTH = 4.5;
export const ANTENNA_HEIGHT_ABOVE_NET = 0.8;
export const BALL_RADIUS = 0.105;
export const PLAYER_HEIGHT = 1.9;
export const FREE_ZONE = 3;

export const PLAYER_ROLES = ['setter', 'outside', 'middle', 'opposite', 'libero'] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];
export const PlayerRoleSchema = z.enum(PLAYER_ROLES);

export const ROLE_LABELS: Record<PlayerRole, string> = {
  setter: 'Setter',
  outside: 'Outside Hitter',
  middle: 'Middle Blocker',
  opposite: 'Opposite',
  libero: 'Libero',
};

export const ROLE_COLORS: Record<PlayerRole, string> = {
  setter: '#3b82f6',
  outside: '#ef4444',
  middle: '#22c55e',
  opposite: '#eab308',
  libero: '#a855f7',
};

export const POSES = [
  'idle',
  'ready',
  'pass',
  'set',
  'serve',
  'approach_1',
  'approach_2',
  'jump',
  'spike',
  'block',
  'dive',
  'celebrate',
] as const;
export type Pose = (typeof POSES)[number];
export const PoseSchema = z.enum(POSES);
export const POSE_LABELS: Record<Pose, string> = {
  idle: 'Idle',
  ready: 'Ready',
  pass: 'Pass',
  set: 'Set',
  serve: 'Serve',
  approach_1: 'Approach 1',
  approach_2: 'Approach 2',
  jump: 'Jump',
  spike: 'Spike',
  block: 'Block',
  dive: 'Dive',
  celebrate: 'Celebrate',
};

/** Standard rotation positions, viewed from above with the home team on +X. */
export interface RotationPosition {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  x: number;
  z: number;
}

export const ROTATION_POSITIONS: RotationPosition[] = [
  { position: 1, label: 'Right Back', x: 6.5, z: -3 },
  { position: 2, label: 'Right Front', x: 3, z: -3 },
  { position: 3, label: 'Middle Front', x: 3, z: 0 },
  { position: 4, label: 'Left Front', x: 3, z: 3 },
  { position: 5, label: 'Left Back', x: 6.5, z: 3 },
  { position: 6, label: 'Middle Back', x: 6.5, z: 0 },
];

export interface RosterPlayer {
  playerId: string;
  number: number;
  role: PlayerRole;
}

/** Default 6-player indoor roster, in rotation-1 order (player 1 starts in position 1). */
export const DEFAULT_ROSTER: RosterPlayer[] = [
  { playerId: 'p1', number: 1, role: 'setter' },
  { playerId: 'p2', number: 2, role: 'outside' },
  { playerId: 'p3', number: 3, role: 'middle' },
  { playerId: 'p4', number: 4, role: 'opposite' },
  { playerId: 'p5', number: 5, role: 'outside' },
  { playerId: 'p6', number: 6, role: 'libero' },
];

export interface BasePlayer {
  playerId: string;
  number: number;
  role: PlayerRole;
  position: Vec3;
  rotationY: number;
}

/**
 * Base serve-receive positions for a given rotation.
 * Rotation N means the default roster is shifted so that roster player N starts in position 1.
 * `fromIndex` shifts the roster so coaches can model any 6-2 / 5-1 lineup.
 */
export function getBasePositions(rotation: number, fromIndex = 0): BasePlayer[] {
  const rot = ((Math.round(rotation) - 1) % 6 + 6) % 6;
  return DEFAULT_ROSTER.map((player, index) => {
    const shifted = (index + fromIndex) % 6;
    const positionIndex = (shifted + rot) % 6;
    const spot = ROTATION_POSITIONS[positionIndex]!;
    const base: BasePlayer = {
      playerId: player.playerId,
      number: player.number,
      role: player.role,
      position: { x: spot.x, y: 0, z: spot.z },
      rotationY: 90,
    };
    if (base.role === 'libero') {
      // Liberos are usually the one digging middle-back in serve receive.
      base.position = { x: 6.5, y: 0, z: 0 };
    }
    return base;
  });
}

export const HOME_SIDE = 1; // home team occupies x > 0
