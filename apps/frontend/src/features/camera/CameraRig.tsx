import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3, type Camera, type PerspectiveCamera } from 'three';
import {
  CAMERA_PRESETS_MAP,
  clamp,
  interpolateCameraPath,
  type CameraSample,
} from '@tempo/shared-types';
import { bridge } from '../../lib/bridge';
import { useCameraStore } from '../../stores/cameraStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';

interface OrbitLike {
  enabled: boolean;
  target: Vector3;
  update?: () => void;
}

interface Transition {
  from: Vector3;
  to: Vector3;
  targetFrom: Vector3;
  targetTo: Vector3;
  fovFrom: number;
  fovTo: number;
  start: number;
}

function applySample(camera: Camera, controls: OrbitLike | null, sample: CameraSample) {
  camera.position.set(sample.position[0], sample.position[1], sample.position[2]);
  const perspective = camera as PerspectiveCamera;
  perspective.fov = sample.fov;
  perspective.updateProjectionMatrix();
  if (controls) {
    controls.target.set(sample.target[0], sample.target[1], sample.target[2]);
    controls.update?.();
  } else {
    camera.lookAt(sample.target[0], sample.target[1], sample.target[2]);
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Static camera presets with smooth transitions, plus camera path playback
 * when a path is being previewed.
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitLike | null;
  const presetId = useCameraStore((state) => state.presetId);
  const previewPathId = useCameraStore((state) => state.previewPathId);
  const transitionRef = useRef<Transition | null>(null);

  useEffect(() => {
    const preset = CAMERA_PRESETS_MAP[presetId];
    const target = controls?.target ?? new Vector3(0, 1.5, 0);
    transitionRef.current = {
      from: camera.position.clone(),
      to: new Vector3(preset.position[0], preset.position[1], preset.position[2]),
      targetFrom: target.clone(),
      targetTo: new Vector3(preset.target[0], preset.target[1], preset.target[2]),
      fovFrom: (camera as PerspectiveCamera).fov,
      fovTo: preset.fov,
      start: performance.now(),
    };
  }, [presetId, camera, controls]);

  useEffect(() => {
    bridge.captureCamera = () => {
      const viewCamera = bridge.camera ?? camera;
      const currentFov = (viewCamera as PerspectiveCamera).fov;
      return {
        position: [round(viewCamera.position.x), round(viewCamera.position.y), round(viewCamera.position.z)],
        target: [round(controls?.target.x ?? 0), round(controls?.target.y ?? 1.5), round(controls?.target.z ?? 0)],
        fov: round(currentFov),
      };
    };
    return () => {
      bridge.captureCamera = null;
    };
  }, [camera, controls]);

  useFrame(() => {
    const pathMode = previewPathId !== null;
    if (controls) controls.enabled = !pathMode;

    if (pathMode) {
      const path = usePlayStore
        .getState()
        .cameraPaths.find((item) => item.id === previewPathId);
      if (path) {
        const sample = interpolateCameraPath(path.keyframes, useTimelineStore.getState().currentMs);
        if (sample) applySample(camera, controls, sample);
      }
      transitionRef.current = null;
      return;
    }

    const transition = transitionRef.current;
    if (!transition) return;
    const t = clamp((performance.now() - transition.start) / 650, 0, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

    camera.position.lerpVectors(transition.from, transition.to, eased);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.lerp(transition.fovFrom, transition.fovTo, eased);
    perspective.updateProjectionMatrix();
    if (controls) {
      controls.target.lerpVectors(transition.targetFrom, transition.targetTo, eased);
      controls.update?.();
    }
    if (t >= 1) transitionRef.current = null;
  });

  return null;
}
