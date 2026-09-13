import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  AnimationMixer,
  Box3,
  LoopRepeat,
  type AnimationAction,
  type Bone,
  type Mesh,
  type Object3D,
} from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PlayerState } from '@tempo/shared-types';
import { resolveClip } from '../../lib/playerModel';
import { useModelStore } from '../../stores/modelStore';
import { useTimelineStore } from '../../stores/timelineStore';

const D = Math.PI / 180;

/**
 * GLB player driven by the timeline: the mixer time is a pure function of
 * `currentMs` (+ per-player offset), so playback, recording and deterministic
 * studio renders all show exactly the same animation frame.
 */
export function PlayerGLB({ state, url }: { state: PlayerState; url: string }) {
  const { scene, animations } = useGLTF(url);
  const clips = useMemo(() => animations.map((clip) => clip.name), [animations]);
  const setAvailableClips = useModelStore((store) => store.setAvailableClips);
  const yawOffsetDeg = useModelStore((store) => store.yawOffsetDeg);
  const scaleMultiplier = useModelStore((store) => store.scale);
  const autoScale = useModelStore((store) => store.autoScale);

  useEffect(() => {
    setAvailableClips(clips);
  }, [clips, setAvailableClips]);

  const cloned = useMemo(() => {
    const copy = cloneSkeleton(scene);
    copy.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });
    return copy;
  }, [scene]);

  // Normalise cm/m differences and scale to a 1.85 m player.
  const baseScale = useMemo(() => {
    if (!autoScale) return 1;
    const box = new Box3().setFromObject(cloned);
    const height = box.max.y - box.min.y;
    if (!Number.isFinite(height) || height <= 0.05) return 1;
    return 1.85 / height;
  }, [cloned, autoScale]);

  useEffect(() => {
    cloned.scale.setScalar(baseScale * scaleMultiplier);
  }, [cloned, baseScale, scaleMultiplier]);

  const mixer = useMemo(() => new AnimationMixer(cloned), [cloned]);
  const actions = useMemo(() => {
    const map: Record<string, AnimationAction> = {};
    for (const clip of animations) {
      const action = mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      map[clip.name] = action;
    }
    return map;
  }, [animations, mixer]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
    },
    [mixer],
  );

  const currentRef = useRef<{ name: string; action: AnimationAction } | null>(null);
  const hipsRef = useRef<Object3D | null>(null);

  useEffect(() => {
    let hips: Object3D | null = null;
    cloned.traverse((object) => {
      const bone = object as Bone;
      if (!hips && bone.isBone && /hips|pelvis|root/i.test(bone.name)) hips = bone;
    });
    if (!hips) {
      cloned.traverse((object) => {
        const bone = object as Bone;
        if (!hips && bone.isBone) hips = bone;
      });
    }
    hipsRef.current = hips;
  }, [cloned]);

  useFrame(() => {
    const model = useModelStore.getState();
    const desired = resolveClip(state.pose, clips, model.clipMap);

    if (desired && actions[desired] && currentRef.current?.name !== desired) {
      const next = actions[desired];
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.play();
      const playing = useTimelineStore.getState().playing;
      if (playing) {
        next.fadeIn(0.25);
        currentRef.current?.action.fadeOut(0.25);
      } else {
        // Paused: mixer time is frozen, so crossfades would never finish — snap.
        currentRef.current?.action.stop();
      }
      currentRef.current = { name: desired, action: next };
    }

    const timeline = useTimelineStore.getState();
    mixer.setTime((timeline.currentMs / 1000 + state.animationTime) * model.timeScale);

    // Strip horizontal root motion so players stay where the coach placed them.
    const hips = hipsRef.current;
    if (hips) {
      hips.position.x = 0;
      hips.position.z = 0;
    }
  });

  return <primitive object={cloned} rotation={[0, yawOffsetDeg * D, 0]} />;
}
