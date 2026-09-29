import {
  NET_HEIGHT_MEN,
  type CourtType,
  type Formation,
  type PlayCategory,
  type PlayerState,
  type TrajectoryType,
  type Vec3,
} from '@tempo/shared-types';
import { basePlayersFor } from '../stores/playStore';
import {
  QUICK_TIMING,
  autoPose,
  buildKeyframes,
  buildLegs,
} from '../features/quick/quickPlay';

export interface TemplatePhase {
  name: string;
  startMs: number;
  endMs: number;
  coachingNote: string | null;
}

export interface TemplateTrajectory {
  type: TrajectoryType;
  controlPoints: Vec3[];
  startMs: number;
  durationMs: number;
  color: string;
  visible: boolean;
}

export interface TemplateKeyframe {
  timestampMs: number;
  playerStates: PlayerState[];
  ballState: Vec3 | null;
}

export interface TemplateAnnotation {
  text: string;
  position: Vec3;
  visibleFromMs: number;
  visibleToMs: number;
  color: string;
}

export interface TemplateDetail {
  trajectories: TemplateTrajectory[];
  keyframes: TemplateKeyframe[];
  phases: TemplatePhase[];
  annotation: TemplateAnnotation | null;
}

export interface PlayTemplate {
  id: string;
  name: string;
  description: string;
  category: PlayCategory;
  rotation: number;
  formation: Formation;
  courtType: CourtType;
  libero: boolean;
  netHeight: number;
  setHeight: number;
  /** [serve lands, pass / setter target, set target] on the home court. */
  targets: [Vec3, Vec3, Vec3];
  spike: Vec3;
  notes: [string, string, string, string];
}

type LegName = 'serve' | 'pass' | 'set' | 'attack';

const QUICK_PHASES: [LegName, LegName][] = [
  ['serve', 'pass'],
  ['pass', 'set'],
  ['set', 'attack'],
  ['attack', 'attack'],
];

const PHASE_NAMES = ['Serve', 'Pass', 'Set', 'Attack'];

export const PLAY_TEMPLATES: PlayTemplate[] = [
  {
    id: 'serve-receive-51',
    name: '5-1 Serve Receive',
    description:
      'Rotation 1 base: pass to the setter at the right front, set the left pin and attack down the line.',
    category: 'serve_receive',
    rotation: 1,
    formation: '5-1',
    courtType: 'indoor',
    libero: true,
    netHeight: NET_HEIGHT_MEN,
    setHeight: 3.1,
    targets: [
      { x: 5.2, y: 0, z: 2.4 },
      { x: 2.8, y: 0, z: -3.2 },
      { x: 2.6, y: 0, z: 3.0 },
    ],
    spike: { x: -3.4, y: 0, z: 2.6 },
    notes: [
      'Opponent serves into the left-back seam (zone 5).',
      'Pass to the setter target at the right front.',
      'Setter releases and delivers to the left pin.',
      'Outside hitter attacks down the line past the block.',
    ],
  },
  {
    id: 'middle-quick',
    name: 'Middle Quick Attack',
    description:
      'Rotation 3: pass to the middle of the court, quick set at the net and a fast middle attack.',
    category: 'attack',
    rotation: 3,
    formation: '5-1',
    courtType: 'indoor',
    libero: true,
    netHeight: NET_HEIGHT_MEN,
    setHeight: 3.35,
    targets: [
      { x: 5.0, y: 0, z: -2.6 },
      { x: 2.6, y: 0, z: -1.2 },
      { x: 2.2, y: 0, z: 0 },
    ],
    spike: { x: -3.8, y: 0, z: 0 },
    notes: [
      'Serve taken by the right-back passer (zone 1).',
      'Pass stays tight to the middle of the net.',
      'Setter runs a quick one at the net.',
      'Middle attacks straight ahead between the blockers.',
    ],
  },
  {
    id: 'back-row-pipe',
    name: 'Back-Row Pipe',
    description:
      'Rotation 6: pass to the setter, set a back-row pipe and attack from behind the attack line.',
    category: 'transition',
    rotation: 6,
    formation: '5-1',
    courtType: 'indoor',
    libero: true,
    netHeight: NET_HEIGHT_MEN,
    setHeight: 3.2,
    targets: [
      { x: 5.4, y: 0, z: -0.6 },
      { x: 2.7, y: 0, z: 0.8 },
      { x: 1.8, y: 0, z: 0 },
    ],
    spike: { x: -3.6, y: 0, z: -0.6 },
    notes: [
      'Serve received in the middle back (zone 6).',
      'Pass to the setter spot in the right half.',
      'Setter runs the pipe from the back row.',
      'Back-row hitter takes off behind the attack line.',
    ],
  },
];

/** Full, id-less play data for a template, ready to persist. */
export function buildTemplateDetail(template: PlayTemplate): TemplateDetail {
  const receive = basePlayersFor(template.rotation, template.formation, template.libero);
  const attack = autoPose(receive, {
    passTarget: template.targets[0],
    setTarget: template.targets[1],
    spikeTarget: template.spike,
  });

  const legs = buildLegs(template.targets, template.spike, template.setHeight);
  const trajectories: TemplateTrajectory[] = legs.map((leg) => ({
    type: leg.type,
    controlPoints: leg.controlPoints,
    startMs: leg.startMs,
    durationMs: leg.durationMs,
    color: leg.type === 'serve' ? '#f59e0b' : leg.type === 'pass' ? '#38bdf8' : leg.type === 'set' ? '#4ade80' : '#f87171',
    visible: true,
  }));

  const keyframes: TemplateKeyframe[] = buildKeyframes('template', {
    receive,
    attack,
    serveTarget: template.targets[0],
    setterSpot: template.targets[1],
    setTarget: template.targets[2],
    spikeTarget: template.spike,
  }).map((keyframe) => ({
    timestampMs: keyframe.timestampMs,
    playerStates: keyframe.playerStates,
    ballState: keyframe.ballState,
  }));

  const phases: TemplatePhase[] = QUICK_PHASES.map(([start, end], index) => ({
    name: PHASE_NAMES[index]!,
    startMs: QUICK_TIMING[start].startMs,
    endMs: QUICK_TIMING[end].startMs + QUICK_TIMING[end].durationMs,
    coachingNote: template.notes[index] ?? null,
  }));

  return {
    trajectories,
    keyframes,
    phases,
    annotation: {
      text: 'Spike lands',
      position: template.spike,
      visibleFromMs: QUICK_TIMING.spikeAtMs,
      visibleToMs: QUICK_TIMING.totalMs,
      color: '#f87171',
    },
  };
}
