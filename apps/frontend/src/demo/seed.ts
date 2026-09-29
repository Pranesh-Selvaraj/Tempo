import { SEED_RULES } from '@tempo/shared-types';
import { PLAY_TEMPLATES, buildTemplateDetail } from '../lib/playTemplates';
import {
  DEMO_USER_ID,
  demoIso,
  newId,
  type DemoAnnotationRow,
  type DemoDb,
  type DemoKeyframeRow,
  type DemoPhaseRow,
  type DemoPlayRow,
  type DemoTrajectoryRow,
} from './db';

interface DemoPlaySeed {
  plays: DemoPlayRow[];
  keyframes: DemoKeyframeRow[];
  trajectories: DemoTrajectoryRow[];
  phases: DemoPhaseRow[];
  annotations: DemoAnnotationRow[];
}

/**
 * Starter plays for the private preview so visitors can click straight into
 * the viewer, presentation, drill and export flows.
 */
function seedPlays(): DemoPlaySeed {
  const seed: DemoPlaySeed = {
    plays: [],
    keyframes: [],
    trajectories: [],
    phases: [],
    annotations: [],
  };

  for (const template of PLAY_TEMPLATES) {
    const playId = newId();
    const timestamp = demoIso();
    const detail = buildTemplateDetail(template);

    seed.plays.push({
      id: playId,
      userId: DEMO_USER_ID,
      name: template.name,
      category: template.category,
      rotation: template.rotation,
      formation: template.formation,
      libero: template.libero,
      courtType: template.courtType,
      netHeight: template.netHeight,
      description: template.description,
      coachingNotes: null,
      // Sample plays ship public so viewer links work for demo visitors.
      isPublic: true,
      thumbnailUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    seed.trajectories.push(
      ...detail.trajectories.map((trajectory) => ({
        id: newId(),
        playId,
        ...trajectory,
      })),
    );
    seed.keyframes.push(
      ...detail.keyframes.map((keyframe) => ({
        id: newId(),
        playId,
        timestampMs: keyframe.timestampMs,
        playerStates: keyframe.playerStates,
        ballState: keyframe.ballState,
        cameraState: null,
        createdAt: timestamp,
      })),
    );
    seed.phases.push(
      ...detail.phases.map((phase) => ({
        id: newId(),
        playId,
        ...phase,
      })),
    );
    if (detail.annotation) {
      seed.annotations.push({
        id: newId(),
        playId,
        ...detail.annotation,
      });
    }
  }

  return seed;
}

/**
 * The preview workspace: three example plays plus the built-in rules
 * reference. No accounts — the master gate grants access.
 */
export function createSeedDb(): DemoDb {
  const plays = seedPlays();
  return {
    version: 3,
    users: [],
    plays: plays.plays,
    keyframes: plays.keyframes,
    trajectories: plays.trajectories,
    cameraPaths: [],
    phases: plays.phases,
    annotations: plays.annotations,
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
}
