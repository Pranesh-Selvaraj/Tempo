import { router } from '../trpc';
import { annotationRouter } from './annotation.router';
import { authRouter } from './auth.router';
import { cameraRouter } from './camera.router';
import { keyframeRouter } from './keyframe.router';
import { phaseRouter } from './phase.router';
import { playRouter } from './play.router';
import { recordingRouter } from './recording.router';
import { rulesRouter } from './rules.router';
import { trajectoryRouter } from './trajectory.router';

export const appRouter = router({
  auth: authRouter,
  play: playRouter,
  keyframe: keyframeRouter,
  trajectory: trajectoryRouter,
  camera: cameraRouter,
  phase: phaseRouter,
  annotation: annotationRouter,
  rules: rulesRouter,
  recording: recordingRouter,
});

export type AppRouter = typeof appRouter;
