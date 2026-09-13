import type { Camera, Scene, WebGLRenderer } from 'three';

export interface CapturedCameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/**
 * The subset of the R3F root state the deterministic (studio) renderer needs.
 * Captured from `onCreated` so frame-by-frame rendering can drive R3F directly.
 */
export interface RenderRoot {
  gl: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  size: { width: number; height: number };
  viewport: { dpr: number };
  setSize: (width: number, height: number, updateStyle?: boolean) => void;
  setDpr: (dpr: number) => void;
  advance: (timestamp: number, runGlobalEffects?: boolean) => void;
}

/**
 * Imperative bridge between the DOM UI and the R3F canvas. Components inside
 * <Canvas> register capabilities here; toolbar buttons call them.
 */
export const bridge: {
  canvas: HTMLCanvasElement | null;
  renderer: WebGLRenderer | null;
  scene: Scene | null;
  camera: Camera | null;
  root: RenderRoot | null;
  captureCamera: (() => CapturedCameraState | null) | null;
} = {
  canvas: null,
  renderer: null,
  scene: null,
  camera: null,
  root: null,
  captureCamera: null,
};
