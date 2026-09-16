import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@tempo/backend/src/routers/_app';

export type { AppRouter };

export const trpc = createTRPCReact<AppRouter>();

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export type Play = RouterOutputs['play']['create'];
export type PlayDetail = RouterOutputs['play']['get'];
export type Keyframe = PlayDetail['keyframes'][number];
export type Trajectory = PlayDetail['trajectories'][number];
export type Phase = PlayDetail['phases'][number];
export type Annotation = PlayDetail['annotations'][number];
export type CameraPath = PlayDetail['cameraPaths'][number];
export type Rule = RouterOutputs['rules']['list'][number];
export type Recording = RouterOutputs['recording']['list'][number];
export type AuthUser = RouterOutputs['auth']['login']['user'];

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
export const TRPC_URL = `${API_URL}/api/trpc`;
