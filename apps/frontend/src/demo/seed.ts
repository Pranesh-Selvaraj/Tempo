import {
  CAMERA_PRESETS_MAP,
  NET_HEIGHT_MEN,
  SEED_RULES,
  type CourtType,
  type Formation,
  type PlayCategory,
  type Vec3,
} from '@tempo/shared-types';
import {
  QUICK_TIMING,
  autoPose,
  buildKeyframes,
  buildLegs,
  buildTrajectories,
  syncOpponents,
} from '../features/quick/quickPlay';
import { basePlayersFor } from '../stores/playStore';
import {
  DEMO_USER_ID,
  demoIso,
  newId,
  type DemoDb,
  type DemoPlayRow,
} from './db';

interface SeedPlaySpec {
  name: string;
  category: PlayCategory;
  rotation: number;
  formation: Formation;
  libero: boolean;
  courtType: CourtType;
  netHeight: number;
  description: string;
  coachingNotes: string;
  isPublic: boolean;
  serveTarget: Vec3;
  passTarget: Vec3;
  setTarget: Vec3;
  spikeTarget: Vec3;
  blockers: number;
  setHeight: number;
  annotation: string;
  daysAgo: number;
}

const SEED_PLAYS: SeedPlaySpec[] = [
  {
    name: 'Serve receive — 5-1 base',
    category: 'serve_receive',
    rotation: 1,
    formation: '5-1',
    libero: true,
    courtType: 'indoor',
    netHeight: NET_HEIGHT_MEN,
    description: 'Standard 5-1 serve receive: pass to the seam, high ball to the left pin, cross-court swing.',
    coachingNotes:
      'Keep the pass 2 m off the net so the setter can run the full offense. Outside hitter starts the approach as the set leaves the hands.',
    isPublic: true,
    serveTarget: { x: 6.0, y: 0, z: 0.6 },
    passTarget: { x: 1.4, y: 0, z: -1.4 },
    setTarget: { x: 1.6, y: 0, z: 2.6 },
    spikeTarget: { x: -3.4, y: 0, z: -2.4 },
    blockers: 0,
    setHeight: 3.1,
    annotation: 'Cross-court seam',
    daysAgo: 0,
  },
  {
    name: 'Middle quick — rotation 3',
    category: 'attack',
    rotation: 3,
    formation: '5-1',
    libero: true,
    courtType: 'indoor',
    netHeight: NET_HEIGHT_MEN,
    description: 'Middle runs a quick in front of the setter with the left side holding the block.',
    coachingNotes:
      'The middle must leave before the pass arrives. Set the ball tight to the net and let the hitter attack the seam between the blockers.',
    isPublic: true,
    serveTarget: { x: 6.2, y: 0, z: 3.2 },
    passTarget: { x: 1.6, y: 0, z: -0.2 },
    setTarget: { x: 1.9, y: 0, z: 0.4 },
    spikeTarget: { x: -3.0, y: 0, z: 0.8 },
    blockers: 2,
    setHeight: 2.8,
    annotation: 'Quick seam',
    daysAgo: 1,
  },
  {
    name: 'Pipe attack — 6-2 transition',
    category: 'transition',
    rotation: 5,
    formation: '6-2',
    libero: true,
    courtType: 'indoor',
    netHeight: NET_HEIGHT_MEN,
    description: 'Back-row pipe from middle back after a good pass, with a three-person block to read.',
    coachingNotes:
      'The pipe attacker waits behind the attack line and times the jump to arrive as the set peaks. Read the block before choosing the angle.',
    isPublic: false,
    serveTarget: { x: 6.4, y: 0, z: -3.0 },
    passTarget: { x: 1.3, y: 0, z: -1.8 },
    setTarget: { x: 1.7, y: 0, z: 0.0 },
    spikeTarget: { x: -2.6, y: 0, z: 0.2 },
    blockers: 3,
    setHeight: 3.4,
    annotation: 'Pipe lane',
    daysAgo: 3,
  },
];

function seedPlay(spec: SeedPlaySpec, index: number): {
  play: DemoPlayRow;
  children: Pick<
    DemoDb,
    'keyframes' | 'trajectories' | 'cameraPaths' | 'phases' | 'annotations'
  >;
} {
  const id = newId();
  const createdAt = demoIso(new Date(Date.now() - spec.daysAgo * 86_400_000 - index * 3_600_000));
  const play: DemoPlayRow = {
    id,
    userId: DEMO_USER_ID,
    name: spec.name,
    category: spec.category,
    rotation: spec.rotation,
    formation: spec.formation,
    libero: spec.libero,
    courtType: spec.courtType,
    netHeight: spec.netHeight,
    description: spec.description,
    coachingNotes: spec.coachingNotes,
    isPublic: spec.isPublic,
    thumbnailUrl: null,
    createdAt,
    updatedAt: createdAt,
  };

  const receive = basePlayersFor(spec.rotation, spec.formation, spec.libero);
  const withOpponents = syncOpponents(receive, spec.blockers, spec.spikeTarget.z);
  const attack = autoPose(withOpponents, {
    passTarget: spec.serveTarget,
    setTarget: spec.passTarget,
    spikeTarget: spec.spikeTarget,
  });
  const legs = buildLegs([spec.serveTarget, spec.passTarget, spec.setTarget], spec.spikeTarget, spec.setHeight);
  const trajectories = buildTrajectories(id, legs).map((trajectory) => ({
    ...trajectory,
    color: trajectory.color ?? null,
  }));
  const keyframes = buildKeyframes(id, {
    receive,
    attack,
    serveTarget: spec.serveTarget,
    setterSpot: spec.passTarget,
    setTarget: spec.setTarget,
    spikeTarget: spec.spikeTarget,
  }).map((keyframe) => ({
    ...keyframe,
    createdAt: demoIso(new Date(createdAt)),
  }));

  const coach = CAMERA_PRESETS_MAP.coach;
  const cameraPaths = [
    {
      id: newId(),
      playId: id,
      name: 'Broadcast',
      keyframes: [
        {
          timestampMs: 0,
          position: [...coach.position] as [number, number, number],
          target: [...coach.target] as [number, number, number],
          fov: coach.fov,
          easing: 'easeInOut' as const,
        },
        {
          timestampMs: QUICK_TIMING.totalMs,
          position: [8.5, 5.5, 10.5] as [number, number, number],
          target: [0, 1.3, 0] as [number, number, number],
          fov: 46,
          easing: 'easeInOut' as const,
        },
      ],
      isDefault: true,
    },
  ];

  const phases = [
    {
      id: newId(),
      playId: id,
      name: 'Serve',
      startMs: 0,
      endMs: QUICK_TIMING.serve.durationMs,
      coachingNote: 'Base position, read the server, first step after contact.',
    },
    {
      id: newId(),
      playId: id,
      name: 'Pass & set',
      startMs: QUICK_TIMING.pass.startMs,
      endMs: QUICK_TIMING.set.startMs + QUICK_TIMING.set.durationMs,
      coachingNote: 'Pass to target, setter releases early, hitters begin their approach.',
    },
    {
      id: newId(),
      playId: id,
      name: 'Attack',
      startMs: QUICK_TIMING.attack.startMs,
      endMs: QUICK_TIMING.attack.startMs + QUICK_TIMING.attack.durationMs,
      coachingNote: 'High contact, wrist snap, land balanced and transition to defense.',
    },
  ];

  const annotations = [
    {
      id: newId(),
      playId: id,
      text: spec.annotation,
      position: spec.spikeTarget,
      visibleFromMs: QUICK_TIMING.spikeAtMs,
      visibleToMs: null,
      color: '#f87171',
    },
  ];

  return { play, children: { keyframes, trajectories, cameraPaths, phases, annotations } };
}

/** A complete, ready-to-use database with rules, a demo coach and three plays. */
export function createSeedDb(): DemoDb {
  const db: DemoDb = {
    version: 1,
    users: [
      {
        id: DEMO_USER_ID,
        email: 'demo@tempo.app',
        password: 'demo1234',
        name: 'Demo Coach',
        teamName: 'Tempo VC',
        createdAt: demoIso(),
      },
    ],
    plays: [],
    keyframes: [],
    trajectories: [],
    cameraPaths: [],
    phases: [],
    annotations: [],
    recordings: [],
    rules: SEED_RULES.map((rule) => ({
      id: newId(),
      category: rule.category,
      title: rule.title,
      content: rule.content,
      diagramUrl: rule.diagramUrl ?? null,
      orderIndex: rule.orderIndex,
    })),
  };

  SEED_PLAYS.forEach((spec, index) => {
    const { play, children } = seedPlay(spec, index);
    db.plays.push(play);
    db.keyframes.push(...children.keyframes);
    db.trajectories.push(...children.trajectories);
    db.cameraPaths.push(...children.cameraPaths);
    db.phases.push(...children.phases);
    db.annotations.push(...children.annotations);
  });

  return db;
}
