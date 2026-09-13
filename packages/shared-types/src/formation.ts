import { z } from 'zod';
import { ROTATION_POSITIONS, type BasePlayer, type RosterPlayer } from './court';

export const FORMATIONS = ['5-1', '6-2', '4-2', '6-6'] as const;
export type Formation = (typeof FORMATIONS)[number];
export const FormationSchema = z.enum(FORMATIONS);

export interface FormationInfo {
  label: string;
  short: string;
  description: string;
  setters: number;
}

export const FORMATION_INFO: Record<Formation, FormationInfo> = {
  '5-1': {
    label: '5-1',
    short: 'One setter · five hitters',
    description:
      'A single setter runs every rotation with two outsides, two middles and an opposite. The standard high-level system.',
    setters: 1,
  },
  '6-2': {
    label: '6-2',
    short: 'Two setters · six hitters',
    description:
      'Two setters opposite each other. The back-row setter runs the offense so all three front-row players can attack.',
    setters: 2,
  },
  '4-2': {
    label: '4-2',
    short: 'Two setters · front-row setting',
    description:
      'Two setters who set from the front row with two hitters beside them. Rotation-friendly and simple for beginners.',
    setters: 2,
  },
  '6-6': {
    label: '6-6',
    short: 'Everyone sets',
    description: 'Recreational and development system — every player sets and hits from any position.',
    setters: 6,
  },
};

const LIBERO_PLAYER: RosterPlayer = { playerId: 'p7', number: 7, role: 'libero' };

const FORMATION_ROSTERS: Record<Formation, RosterPlayer[]> = {
  '5-1': [
    { playerId: 'p1', number: 1, role: 'setter' },
    { playerId: 'p2', number: 2, role: 'outside' },
    { playerId: 'p3', number: 3, role: 'middle' },
    { playerId: 'p4', number: 4, role: 'opposite' },
    { playerId: 'p5', number: 5, role: 'outside' },
    { playerId: 'p6', number: 6, role: 'middle' },
  ],
  '6-2': [
    { playerId: 'p1', number: 1, role: 'setter' },
    { playerId: 'p2', number: 2, role: 'outside' },
    { playerId: 'p3', number: 3, role: 'middle' },
    { playerId: 'p4', number: 4, role: 'setter' },
    { playerId: 'p5', number: 5, role: 'outside' },
    { playerId: 'p6', number: 6, role: 'middle' },
  ],
  '4-2': [
    { playerId: 'p1', number: 1, role: 'setter' },
    { playerId: 'p2', number: 2, role: 'outside' },
    { playerId: 'p3', number: 3, role: 'middle' },
    { playerId: 'p4', number: 4, role: 'setter' },
    { playerId: 'p5', number: 5, role: 'outside' },
    { playerId: 'p6', number: 6, role: 'middle' },
  ],
  '6-6': [
    { playerId: 'p1', number: 1, role: 'setter' },
    { playerId: 'p2', number: 2, role: 'outside' },
    { playerId: 'p3', number: 3, role: 'setter' },
    { playerId: 'p4', number: 4, role: 'outside' },
    { playerId: 'p5', number: 5, role: 'setter' },
    { playerId: 'p6', number: 6, role: 'outside' },
  ],
};

/** Indexes into ROTATION_POSITIONS that belong to the back row (1, 5, 6). */
const BACK_ROW_POSITION_INDEXES = new Set([0, 4, 5]);

export function getFormationRoster(formation: Formation, withLibero: boolean): RosterPlayer[] {
  const roster = FORMATION_ROSTERS[formation].map((player) => ({ ...player }));
  if (withLibero) roster.push({ ...LIBERO_PLAYER });
  return roster;
}

/** Serve-receive base positions for a formation at a given rotation. */
export function getFormationPositions(
  formation: Formation,
  rotation: number,
  withLibero = true,
): BasePlayer[] {
  const rot = (((Math.round(rotation) - 1) % 6) + 6) % 6;
  const placed: BasePlayer[] = FORMATION_ROSTERS[formation].map((player, index) => {
    const positionIndex = (index + rot) % 6;
    const spot = ROTATION_POSITIONS[positionIndex]!;
    return {
      ...player,
      position: { x: spot.x, y: 0, z: spot.z },
      rotationY: 90,
    };
  });

  if (!withLibero) return placed;

  let swapIndex = placed.findIndex(
    (player, index) =>
      player.role === 'middle' && BACK_ROW_POSITION_INDEXES.has((index + rot) % 6),
  );
  if (swapIndex === -1) {
    swapIndex = placed.findIndex((_, index) => BACK_ROW_POSITION_INDEXES.has((index + rot) % 6));
  }
  const replaced = placed[swapIndex];
  if (replaced) {
    placed[swapIndex] = { ...LIBERO_PLAYER, position: { ...replaced.position }, rotationY: 90 };
  }
  return placed;
}

export function nextRotation(rotation: number): number {
  return (rotation % 6) + 1;
}

/** Coerce a database string into a known formation, defaulting to 5-1. */
export function asFormation(value: string | null | undefined): Formation {
  return FORMATIONS.includes(value as Formation) ? (value as Formation) : '5-1';
}

export function rotationZoneLabel(rotation: number): string {
  const rot = (((Math.round(rotation) - 1) % 6) + 6) % 6;
  const spot = ROTATION_POSITIONS[rot]!;
  return `${spot.label} · position ${spot.position}`;
}
