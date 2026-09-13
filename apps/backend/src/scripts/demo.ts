import 'dotenv/config';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { appRouter } from '../routers/_app';
import { closeDb, db } from '../db';
import { plays, users } from '../db/schema';
import type { PlayerState, Pose, PlayerRole } from '@tempo/shared-types';

const DEMO_EMAIL = 'demo@tempo.app';
const DEMO_PASSWORD = 'volleyball123';
const DEMO_NAME = 'Demo Coach';
const PLAY_NAME = 'Rotation 3 — Stack Slide';

function player(
  playerId: string,
  role: PlayerRole,
  x: number,
  z: number,
  pose: Pose,
  rotationY = 90,
): PlayerState {
  return {
    playerId,
    role,
    position: { x, y: 0, z },
    rotationY,
    pose,
    animationTime: 0,
  };
}

/**
 * Seeds a rich, teaching-ready play so a fresh install has something to open:
 * authored ball paths, four keyframes, phases, 3D notes and two camera paths.
 *
 *   pnpm demo        # then log in with demo@tempo.app / volleyball123
 */
async function main(): Promise<void> {
  const publicCaller = appRouter.createCaller({ db, userId: null });

  let auth: Awaited<ReturnType<typeof publicCaller.auth.register>>;
  try {
    auth = await publicCaller.auth.register({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: DEMO_NAME,
    });
    console.log('✓ created demo account');
  } catch (error) {
    if (!(error instanceof TRPCError) || error.code !== 'CONFLICT') throw error;
    auth = await publicCaller.auth.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    console.log('✓ demo account already exists');
  }

  const [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (!user) throw new Error('Demo user missing after auth');
  console.log(`✓ signed in as ${auth.user.email}`);
  const caller = appRouter.createCaller({ db, userId: user.id });

  // Idempotent: remove a previous copy of the demo play (cascades to children).
  const existing = await db
    .select()
    .from(plays)
    .where(and(eq(plays.userId, user.id), eq(plays.name, PLAY_NAME)));
  for (const row of existing) {
    await caller.play.delete({ id: row.id });
  }

  const play = await caller.play.create({
    name: PLAY_NAME,
    category: 'attack',
    rotation: 3,
    courtType: 'indoor',
    netHeight: 2.43,
    description:
      'Serve receive to a 4-ball for the left-side attacker, with full floor coverage and a transition reset.',
    coachingNotes:
      'Priority: pass to the setter target (1.5 m off the net, right of the pin). Middle holds the block until the set is released. Everyone covers the attacker; libero owns the seam.',
    isPublic: true,
  });
  console.log(`✓ play: ${play.name}`);

  const trajectories: {
    type: 'serve' | 'pass' | 'set' | 'attack' | 'dig';
    startMs: number;
    durationMs: number;
    points: { x: number; y: number; z: number }[];
  }[] = [
    {
      type: 'serve',
      startMs: 0,
      durationMs: 1200,
      points: [
        { x: -10.5, y: 1.6, z: 1.5 },
        { x: -5.5, y: 3.0, z: 1.2 },
        { x: 0.2, y: 2.6, z: 0.9 },
        { x: 4.2, y: 2.1, z: 2.2 },
        { x: 6.1, y: 1.5, z: 3.2 },
      ],
    },
    {
      type: 'pass',
      startMs: 1200,
      durationMs: 1100,
      points: [
        { x: 6.1, y: 1.5, z: 3.2 },
        { x: 4.8, y: 2.9, z: 2.7 },
        { x: 3.0, y: 3.0, z: 1.7 },
        { x: 1.9, y: 2.7, z: 1.0 },
      ],
    },
    {
      type: 'set',
      startMs: 2400,
      durationMs: 900,
      points: [
        { x: 1.9, y: 2.7, z: 1.0 },
        { x: 1.3, y: 3.3, z: 1.9 },
        { x: 0.8, y: 3.1, z: 2.7 },
        { x: 0.6, y: 2.9, z: 3.2 },
      ],
    },
    {
      type: 'attack',
      startMs: 3400,
      durationMs: 700,
      points: [
        { x: 0.6, y: 2.9, z: 3.2 },
        { x: -0.2, y: 2.3, z: 3.0 },
        { x: -2.6, y: 1.8, z: 1.2 },
        { x: -5.6, y: 1.3, z: -1.2 },
        { x: -7.6, y: 0.7, z: -2.6 },
      ],
    },
    {
      type: 'dig',
      startMs: 4200,
      durationMs: 900,
      points: [
        { x: -7.6, y: 0.7, z: -2.6 },
        { x: -6.2, y: 1.7, z: -3.2 },
        { x: -4.6, y: 2.0, z: -3.8 },
      ],
    },
  ];
  for (const trajectory of trajectories) {
    await caller.trajectory.create({
      playId: play.id,
      type: trajectory.type,
      controlPoints: trajectory.points,
      startMs: trajectory.startMs,
      durationMs: trajectory.durationMs,
    });
  }
  console.log(`✓ ${trajectories.length} ball paths`);

  const keyframes: { timestampMs: number; playerStates: PlayerState[] }[] = [
    {
      timestampMs: 0,
      playerStates: [
        player('p1', 'setter', 1.6, 0.5, 'ready'),
        player('p2', 'outside', 6.1, 3.2, 'pass'),
        player('p5', 'outside', 6.2, -3.4, 'pass'),
        player('p6', 'libero', 7.0, 0, 'pass'),
        player('p3', 'middle', 3.0, -1.6, 'ready'),
        player('p4', 'opposite', 3.0, 1.6, 'ready'),
      ],
    },
    {
      timestampMs: 1250,
      playerStates: [
        player('p1', 'setter', 1.7, 0.8, 'set'),
        player('p2', 'outside', 6.1, 3.2, 'pass'),
        player('p5', 'outside', 6.4, -3.4, 'ready'),
        player('p6', 'libero', 7.0, 0.1, 'ready'),
        player('p3', 'middle', 3.6, -2.0, 'approach_1'),
        player('p4', 'opposite', 3.8, 2.2, 'ready'),
      ],
    },
    {
      timestampMs: 2500,
      playerStates: [
        player('p1', 'setter', 2.1, 0.9, 'set'),
        player('p2', 'outside', 6.6, 3.4, 'ready'),
        player('p5', 'outside', 6.6, -3.2, 'ready'),
        player('p6', 'libero', 7.0, 0.2, 'ready'),
        player('p3', 'middle', 4.6, -2.6, 'approach_2'),
        player('p4', 'opposite', 5.0, 3.0, 'approach_2'),
      ],
    },
    {
      timestampMs: 3400,
      playerStates: [
        player('p1', 'setter', 2.4, 0.8, 'ready'),
        player('p2', 'outside', 5.6, 3.6, 'ready'),
        player('p5', 'outside', 5.6, -3.4, 'ready'),
        player('p6', 'libero', 6.8, 0, 'ready'),
        player('p3', 'middle', 4.2, -1.4, 'ready'),
        player('p4', 'opposite', 1.7, 3.0, 'spike'),
      ],
    },
    {
      timestampMs: 4300,
      playerStates: [
        player('p1', 'setter', 1.9, 0.6, 'set'),
        player('p2', 'outside', 5.0, 3.0, 'ready'),
        player('p5', 'outside', 5.0, -3.0, 'ready'),
        player('p6', 'libero', 6.0, 0, 'ready'),
        player('p3', 'middle', 3.2, -1.0, 'ready'),
        player('p4', 'opposite', 2.3, 3.0, 'ready'),
      ],
    },
  ];
  for (const keyframe of keyframes) {
    await caller.keyframe.upsert({
      playId: play.id,
      timestampMs: keyframe.timestampMs,
      playerStates: keyframe.playerStates,
      ballState: null,
    });
  }
  console.log(`✓ ${keyframes.length} keyframes`);

  const phases: { name: string; startMs: number; endMs: number; coachingNote: string }[] = [
    {
      name: 'Serve',
      startMs: 0,
      endMs: 1200,
      coachingNote: 'Opponent serves deep to zone 5 — P2 takes it, everyone else releases to base.',
    },
    {
      name: 'Pass',
      startMs: 1200,
      endMs: 2400,
      coachingNote: 'Pass to the setter target: 1.5 m off the net, right of the pin.',
    },
    {
      name: 'Set',
      startMs: 2400,
      endMs: 3400,
      coachingNote: '4-ball to the antenna. Middle holds the block until the set is released.',
    },
    {
      name: 'Attack',
      startMs: 3400,
      endMs: 4300,
      coachingNote: 'P4 attacks the seam between 1 and 6. Cross-court is the priority shot.',
    },
    {
      name: 'Transition',
      startMs: 4300,
      endMs: 5300,
      coachingNote: 'Snap back to base and reload — dig, set, swing again.',
    },
  ];
  for (const phase of phases) {
    await caller.phase.create({ playId: play.id, ...phase });
  }
  console.log(`✓ ${phases.length} phases`);

  const annotations: {
    text: string;
    x: number;
    y: number;
    z: number;
    from: number;
    to: number;
    color: string;
  }[] = [
    {
      text: 'P2 owns the pass — call it early',
      x: 5.5,
      y: 2.2,
      z: 3.2,
      from: 0,
      to: 2200,
      color: '#4ade80',
    },
    {
      text: "Setter's target zone",
      x: 1.6,
      y: 2.8,
      z: 1.0,
      from: 900,
      to: 3300,
      color: '#60a5fa',
    },
    {
      text: 'Attack the seam between 1 and 6',
      x: -3.5,
      y: 2.4,
      z: 0,
      from: 3000,
      to: 5200,
      color: '#facc15',
    },
  ];
  for (const annotation of annotations) {
    await caller.annotation.create({
      playId: play.id,
      text: annotation.text,
      position: { x: annotation.x, y: annotation.y, z: annotation.z },
      visibleFromMs: annotation.from,
      visibleToMs: annotation.to,
      color: annotation.color,
    });
  }
  console.log(`✓ ${annotations.length} 3D notes`);

  await caller.camera.createPath({
    playId: play.id,
    name: 'Coaching view',
    isDefault: true,
    keyframes: [
      { timestampMs: 0, position: [12, 8, 12], target: [0, 1.5, 0], fov: 50, easing: 'easeInOut' },
      { timestampMs: 2400, position: [7, 4.5, 7.5], target: [0.5, 2, 1], fov: 45, easing: 'easeInOut' },
      { timestampMs: 3400, position: [4.2, 3, 5.2], target: [0.2, 2.2, 3.2], fov: 40, easing: 'easeOut' },
      { timestampMs: 5300, position: [6, 3.2, 7], target: [0, 1.6, 0.5], fov: 45, easing: 'easeInOut' },
    ],
  });
  await caller.camera.createPath({
    playId: play.id,
    name: 'Attacker POV',
    keyframes: [
      { timestampMs: 0, position: [7.2, 2.1, 2.6], target: [-1, 1.6, -0.4], fov: 60, easing: 'linear' },
      { timestampMs: 3400, position: [3.4, 2.4, 3.2], target: [0, 2.4, 3.4], fov: 65, easing: 'easeIn' },
      { timestampMs: 4300, position: [1.6, 2.2, 3.2], target: [-6, 1.2, -2], fov: 62, easing: 'linear' },
    ],
  });
  console.log('✓ 2 camera paths');

  console.log('\nDemo ready. Sign in at http://localhost:5173');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(`  play:     http://localhost:5173/play/${play.id}`);
  console.log(`  present:  http://localhost:5173/present/${play.id}`);
}

main()
  .then(async () => {
    await closeDb();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Demo seed failed:', error);
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
