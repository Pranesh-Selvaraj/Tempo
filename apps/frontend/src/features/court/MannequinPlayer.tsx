import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { ROLE_COLORS, type PlayerState, type Pose } from '@tempo/shared-types';
import { useEditorStore } from '../../stores/editorStore';

const D = Math.PI / 180;

type Joint = [number, number, number];

interface PoseTarget {
  hipHeight: number;
  hipPitch: number;
  torsoPitch: number;
  shoulderL: Joint;
  shoulderR: Joint;
  elbowL: Joint;
  elbowR: Joint;
  thighL: number;
  thighR: number;
  kneeL: number;
  kneeR: number;
}

const POSES: Record<Pose, PoseTarget> = {
  idle: {
    hipHeight: 0.94,
    hipPitch: 0,
    torsoPitch: 2 * D,
    shoulderL: [8 * D, 0, -10 * D],
    shoulderR: [8 * D, 0, 10 * D],
    elbowL: [-14 * D, 0, 0],
    elbowR: [-14 * D, 0, 0],
    thighL: 8 * D,
    thighR: 8 * D,
    kneeL: -16 * D,
    kneeR: -16 * D,
  },
  ready: {
    hipHeight: 0.88,
    hipPitch: 6 * D,
    torsoPitch: 14 * D,
    shoulderL: [48 * D, 0, -14 * D],
    shoulderR: [48 * D, 0, 14 * D],
    elbowL: [-58 * D, 0, 0],
    elbowR: [-58 * D, 0, 0],
    thighL: 22 * D,
    thighR: 22 * D,
    kneeL: -44 * D,
    kneeR: -44 * D,
  },
  pass: {
    hipHeight: 0.84,
    hipPitch: 10 * D,
    torsoPitch: 18 * D,
    shoulderL: [74 * D, 0, -6 * D],
    shoulderR: [74 * D, 0, 6 * D],
    elbowL: [-10 * D, 0, 0],
    elbowR: [-10 * D, 0, 0],
    thighL: 28 * D,
    thighR: 28 * D,
    kneeL: -56 * D,
    kneeR: -56 * D,
  },
  set: {
    hipHeight: 0.94,
    hipPitch: 0,
    torsoPitch: 6 * D,
    shoulderL: [150 * D, 0, -20 * D],
    shoulderR: [150 * D, 0, 20 * D],
    elbowL: [-50 * D, 0, 0],
    elbowR: [-50 * D, 0, 0],
    thighL: 10 * D,
    thighR: 10 * D,
    kneeL: -20 * D,
    kneeR: -20 * D,
  },
  serve: {
    hipHeight: 0.93,
    hipPitch: 2 * D,
    torsoPitch: 10 * D,
    shoulderL: [60 * D, 0, -14 * D],
    shoulderR: [158 * D, 0, 12 * D],
    elbowL: [-30 * D, 0, 0],
    elbowR: [-24 * D, 0, 0],
    thighL: 12 * D,
    thighR: 12 * D,
    kneeL: -24 * D,
    kneeR: -24 * D,
  },
  approach_1: {
    hipHeight: 0.92,
    hipPitch: 10 * D,
    torsoPitch: 26 * D,
    shoulderL: [-32 * D, 0, -10 * D],
    shoulderR: [-36 * D, 0, 10 * D],
    elbowL: [-20 * D, 0, 0],
    elbowR: [-20 * D, 0, 0],
    thighL: 18 * D,
    thighR: 18 * D,
    kneeL: -34 * D,
    kneeR: -34 * D,
  },
  approach_2: {
    hipHeight: 0.83,
    hipPitch: 14 * D,
    torsoPitch: 18 * D,
    shoulderL: [30 * D, 0, -16 * D],
    shoulderR: [-10 * D, 0, 16 * D],
    elbowL: [-40 * D, 0, 0],
    elbowR: [-50 * D, 0, 0],
    thighL: 30 * D,
    thighR: 30 * D,
    kneeL: -60 * D,
    kneeR: -60 * D,
  },
  jump: {
    hipHeight: 1.12,
    hipPitch: -4 * D,
    torsoPitch: -6 * D,
    shoulderL: [120 * D, 0, -18 * D],
    shoulderR: [168 * D, 0, 18 * D],
    elbowL: [-30 * D, 0, 0],
    elbowR: [-10 * D, 0, 0],
    thighL: -6 * D,
    thighR: -6 * D,
    kneeL: -10 * D,
    kneeR: -10 * D,
  },
  spike: {
    hipHeight: 1.14,
    hipPitch: 4 * D,
    torsoPitch: 16 * D,
    shoulderL: [70 * D, 0, -24 * D],
    shoulderR: [104 * D, 0, 10 * D],
    elbowL: [-40 * D, 0, 0],
    elbowR: [0, 0, 0],
    thighL: 6 * D,
    thighR: -10 * D,
    kneeL: -30 * D,
    kneeR: -20 * D,
  },
  block: {
    hipHeight: 1.06,
    hipPitch: 0,
    torsoPitch: -2 * D,
    shoulderL: [174 * D, 0, -18 * D],
    shoulderR: [174 * D, 0, 18 * D],
    elbowL: [0, 0, 0],
    elbowR: [0, 0, 0],
    thighL: -4 * D,
    thighR: -4 * D,
    kneeL: -8 * D,
    kneeR: -8 * D,
  },
  dive: {
    hipHeight: 0.62,
    hipPitch: 62 * D,
    torsoPitch: 8 * D,
    shoulderL: [86 * D, 0, -12 * D],
    shoulderR: [86 * D, 0, 12 * D],
    elbowL: [-14 * D, 0, 0],
    elbowR: [-14 * D, 0, 0],
    thighL: 26 * D,
    thighR: 12 * D,
    kneeL: -40 * D,
    kneeR: -20 * D,
  },
  celebrate: {
    hipHeight: 0.98,
    hipPitch: -4 * D,
    torsoPitch: -8 * D,
    shoulderL: [168 * D, 0, -22 * D],
    shoulderR: [168 * D, 0, 22 * D],
    elbowL: [-20 * D, 0, 0],
    elbowR: [-20 * D, 0, 0],
    thighL: 2 * D,
    thighR: 2 * D,
    kneeL: -12 * D,
    kneeR: -12 * D,
  },
};

/**
 * Procedural mannequin with damped joint transitions between the 12 poses.
 * Used as-is for quick authoring and as the fallback whenever no GLB model is
 * configured (or it fails to load).
 */
export function MannequinPlayer({ state }: { state: PlayerState }) {
  const hips = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const shoulderL = useRef<Group>(null);
  const shoulderR = useRef<Group>(null);
  const elbowL = useRef<Group>(null);
  const elbowR = useRef<Group>(null);
  const thighL = useRef<Group>(null);
  const thighR = useRef<Group>(null);
  const kneeL = useRef<Group>(null);
  const kneeR = useRef<Group>(null);

  useFrame((frame, delta) => {
    const target = POSES[state.pose] ?? POSES.idle;
    // Deterministic renders snap straight to the target pose and drop the idle sway.
    const renderJob = useEditorStore.getState().renderJobActive;
    const lambda = renderJob ? 1_000_000 : 14;
    const dt = renderJob ? 1 : Math.min(delta, 0.05);
    const sway =
      !renderJob && (state.pose === 'idle' || state.pose === 'ready')
        ? Math.sin(frame.clock.elapsedTime * 2 + state.playerId.length) * 2.5 * D
        : 0;

    if (hips.current) {
      hips.current.position.y = MathUtils.damp(hips.current.position.y, target.hipHeight, lambda, dt);
      hips.current.rotation.x = MathUtils.damp(hips.current.rotation.x, target.hipPitch, lambda, dt);
    }
    if (torso.current) {
      torso.current.rotation.x = MathUtils.damp(torso.current.rotation.x, target.torsoPitch + sway, lambda, dt);
    }
    if (shoulderL.current) {
      shoulderL.current.rotation.set(
        MathUtils.damp(shoulderL.current.rotation.x, target.shoulderL[0], lambda, dt),
        MathUtils.damp(shoulderL.current.rotation.y, target.shoulderL[1], lambda, dt),
        MathUtils.damp(shoulderL.current.rotation.z, target.shoulderL[2] - sway, lambda, dt),
      );
    }
    if (shoulderR.current) {
      shoulderR.current.rotation.set(
        MathUtils.damp(shoulderR.current.rotation.x, target.shoulderR[0], lambda, dt),
        MathUtils.damp(shoulderR.current.rotation.y, target.shoulderR[1], lambda, dt),
        MathUtils.damp(shoulderR.current.rotation.z, target.shoulderR[2] + sway, lambda, dt),
      );
    }
    if (elbowL.current) {
      elbowL.current.rotation.x = MathUtils.damp(elbowL.current.rotation.x, target.elbowL[0], lambda, dt);
    }
    if (elbowR.current) {
      elbowR.current.rotation.x = MathUtils.damp(elbowR.current.rotation.x, target.elbowR[0], lambda, dt);
    }
    if (thighL.current) {
      thighL.current.rotation.x = MathUtils.damp(thighL.current.rotation.x, target.thighL, lambda, dt);
    }
    if (thighR.current) {
      thighR.current.rotation.x = MathUtils.damp(thighR.current.rotation.x, target.thighR, lambda, dt);
    }
    if (kneeL.current) {
      kneeL.current.rotation.x = MathUtils.damp(kneeL.current.rotation.x, target.kneeL, lambda, dt);
    }
    if (kneeR.current) {
      kneeR.current.rotation.x = MathUtils.damp(kneeR.current.rotation.x, target.kneeR, lambda, dt);
    }
  });

  const jersey = state.playerId.startsWith('opp') ? '#f97316' : ROLE_COLORS[state.role];
  const shorts = '#1e293b';
  const skin = '#f0c8a0';

  return (
    <group>
      <group ref={hips} position={[0, 0.94, 0]}>
        {/* Legs */}
        {(
          [
            { side: -1, thigh: thighL, knee: kneeL },
            { side: 1, thigh: thighR, knee: kneeR },
          ] as const
        ).map((leg) => (
          <group key={leg.side} ref={leg.thigh} position={[leg.side * 0.11, 0, 0]}>
            <mesh position={[0, -0.23, 0]} castShadow>
              <capsuleGeometry args={[0.09, 0.28, 4, 10]} />
              <meshStandardMaterial color={shorts} roughness={0.8} />
            </mesh>
            <group ref={leg.knee} position={[0, -0.46, 0]}>
              <mesh position={[0, -0.22, 0]} castShadow>
                <capsuleGeometry args={[0.072, 0.3, 4, 10]} />
                <meshStandardMaterial color={skin} roughness={0.6} />
              </mesh>
            </group>
          </group>
        ))}

        {/* Hip block */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.1, 4, 12]} />
          <meshStandardMaterial color={shorts} roughness={0.8} />
        </mesh>

        <group ref={torso} position={[0, 0.05, 0]}>
          {/* Torso / jersey */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <capsuleGeometry args={[0.2, 0.36, 4, 14]} />
            <meshStandardMaterial color={jersey} roughness={0.65} />
          </mesh>
          {/* Head + neck */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.1, 10]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow>
            <sphereGeometry args={[0.12, 18, 18]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>

          {/* Arms */}
          {(
            [
              { side: -1, shoulder: shoulderL, elbow: elbowL },
              { side: 1, shoulder: shoulderR, elbow: elbowR },
            ] as const
          ).map((arm) => (
            <group key={arm.side} ref={arm.shoulder} position={[arm.side * 0.23, 0.5, 0]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.18, 4, 10]} />
                <meshStandardMaterial color={skin} roughness={0.6} />
              </mesh>
              <group ref={arm.elbow} position={[0, -0.3, 0]}>
                <mesh position={[0, -0.15, 0]} castShadow>
                  <capsuleGeometry args={[0.048, 0.18, 4, 10]} />
                  <meshStandardMaterial color={skin} roughness={0.6} />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
