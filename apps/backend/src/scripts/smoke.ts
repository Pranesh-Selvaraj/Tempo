import 'dotenv/config';
import { appRouter } from '../routers/_app';
import { closeDb, db } from '../db';

/**
 * End-to-end API smoke test. Runs the tRPC router directly against the
 * configured database (Postgres or PGlite) — useful in CI and after seeding.
 *
 *   pnpm --filter @tempo/backend smoke
 */
async function main(): Promise<void> {
  const suffix = Date.now();
  const publicCaller = appRouter.createCaller({ db, userId: null });

  const email = `smoke.${suffix}@tempo.test`;
  const registered = await publicCaller.auth.register({
    email,
    password: 'volleyball123',
    name: 'Smoke Coach',
  });
  console.log('✓ registered', registered.user.email);

  const authed = appRouter.createCaller({ db, userId: registered.user.id });

  const play = await authed.play.create({
    name: 'Rotation 3 — Stack Slide',
    category: 'serve_receive',
    rotation: 3,
    courtType: 'indoor',
    netHeight: 2.43,
    description: 'Smoke test play',
    isPublic: true,
  });
  console.log('✓ created play', play.name);

  await authed.trajectory.create({
    playId: play.id,
    type: 'serve',
    controlPoints: [
      { x: 11, y: 1.2, z: -3 },
      { x: 6, y: 3.1, z: -1.5 },
      { x: 2.4, y: 1.9, z: 0.6 },
    ],
    startMs: 0,
    durationMs: 1100,
  });
  await authed.trajectory.create({
    playId: play.id,
    type: 'set',
    controlPoints: [
      { x: 2.4, y: 1.9, z: 0.6 },
      { x: 1.2, y: 3.4, z: 1.8 },
      { x: 0.7, y: 2.9, z: -0.4 },
    ],
    startMs: 1400,
    durationMs: 900,
  });
  console.log('✓ created trajectories');

  const keyframe = await authed.keyframe.upsert({
    playId: play.id,
    timestampMs: 1200,
    playerStates: [
      {
        playerId: 'p1',
        role: 'setter',
        position: { x: 2.4, y: 0, z: 0.6 },
        rotationY: 90,
        pose: 'set',
        animationTime: 0.4,
      },
    ],
    ballState: { x: 2.4, y: 2.3, z: 0.6 },
  });
  console.log('✓ upserted keyframe at', keyframe.timestampMs);

  const retimed = await authed.keyframe.upsert({
    playId: play.id,
    timestampMs: 1200,
    playerStates: keyframe.playerStates,
  });
  if (retimed.id !== keyframe.id) throw new Error('keyframe upsert did not replace in place');
  console.log('✓ keyframe upsert is idempotent');

  await authed.phase.create({
    playId: play.id,
    name: 'Serve',
    startMs: 0,
    endMs: 1200,
    coachingNote: 'Serve deep to zone 5',
  });
  await authed.camera.createPath({
    playId: play.id,
    name: 'Coaching view',
    isDefault: true,
    keyframes: [
      { timestampMs: 0, position: [12, 8, 12], target: [0, 1.5, 0], fov: 50, easing: 'easeInOut' },
      { timestampMs: 2000, position: [4, 3, 6], target: [0, 2, 0], fov: 45, easing: 'easeInOut' },
    ],
  });
  await authed.annotation.create({
    playId: play.id,
    text: 'Setter releases to the net',
    position: { x: 2.4, y: 2.4, z: 0.6 },
    visibleFromMs: 0,
    visibleToMs: 3000,
    color: '#facc15',
  });
  console.log('✓ created phase, camera path, annotation');

  const detail = await authed.play.get({ id: play.id });
  if (
    detail.keyframes.length !== 1 ||
    detail.trajectories.length !== 2 ||
    detail.phases.length !== 1 ||
    detail.annotations.length !== 1 ||
    detail.cameraPaths.length !== 1
  ) {
    throw new Error('play detail did not include all authored content');
  }
  console.log('✓ play.get returned the full play graph');

  const publicDetail = await publicCaller.play.getPublic({ id: play.id });
  if (publicDetail.play.id !== play.id) throw new Error('public fetch mismatch');
  console.log('✓ public share endpoint works');

  const duplicate = await authed.play.duplicate({ id: play.id });
  const duplicateDetail = await authed.play.get({ id: duplicate.id });
  if (duplicateDetail.keyframes.length !== 1 || duplicateDetail.trajectories.length !== 2) {
    throw new Error('duplicate did not deep-copy children');
  }
  console.log('✓ deep duplicate works');

  const rules = await publicCaller.rules.list({ category: 'Scoring' });
  if (rules.length === 0) throw new Error('rules table is empty — run pnpm db:seed');
  const search = await publicCaller.rules.search({ query: 'libero' });
  if (search.length === 0) throw new Error('rules search returned nothing');
  console.log(`✓ rules seeded and searchable (${rules.length} scoring rules)`);

  await authed.play.delete({ id: play.id });
  await authed.play.delete({ id: duplicate.id });
  console.log('✓ cleanup complete');
  console.log('\nAll smoke checks passed.');
}

main()
  .then(async () => {
    await closeDb();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Smoke test failed:', error);
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
