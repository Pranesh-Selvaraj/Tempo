import { useEffect, useMemo } from 'react';
import { TubeGeometry } from 'three';
import type { Trajectory } from '@tempo/shared-types';
import { curveFor, landingPoint } from '../../lib/curves';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { WorldLabel } from './WorldLabel';

function TrajectoryTube({ trajectory, selected }: { trajectory: Trajectory; selected: boolean }) {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        curveFor(trajectory.controlPoints),
        Math.max(32, trajectory.controlPoints.length * 24),
        selected ? 0.035 : 0.024,
        10,
        false,
      ),
    [trajectory.controlPoints, selected],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const color = trajectory.color ?? '#f8fafc';
  const selectTrajectory = useEditorStore((store) => store.selectTrajectory);

  return (
    <group>
      <mesh
        geometry={geometry}
        renderOrder={5}
        onClick={(event) => {
          event.stopPropagation();
          selectTrajectory(trajectory.id);
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.85 : 0.35}
          transparent
          opacity={0.92}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>

      {selected && <TrajectoryMarkers trajectory={trajectory} />}
    </group>
  );
}

function TrajectoryMarkers({ trajectory }: { trajectory: Trajectory }) {
  const curve = curveFor(trajectory.controlPoints);
  const start = curve.getPointAt(0);
  const landing = landingPoint(trajectory.controlPoints);

  return (
    <group>
      <mesh position={[start.x, 0.03, start.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[0.16, 0.22, 24]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <WorldLabel text="start" position={[start.x, start.y + 0.35, start.z]} size={0.22} color="#bbf7d0" />

      {landing && (
        <>
          <mesh position={[landing.x, 0.035, landing.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.22, 0.3, 32]} />
            <meshBasicMaterial color="#f87171" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <mesh position={[landing.x, 0.035, landing.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <planeGeometry args={[0.8, 0.03]} />
            <meshBasicMaterial color="#f87171" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <mesh position={[landing.x, 0.035, landing.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <planeGeometry args={[0.03, 0.8]} />
            <meshBasicMaterial color="#f87171" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <WorldLabel
            text="land"
            position={[landing.x, 0.45, landing.z]}
            size={0.2}
            color="#fecaca"
          />
        </>
      )}
    </group>
  );
}

export function TrajectoryTubes() {
  const trajectories = usePlayStore((state) => state.trajectories);
  const showTrajectories = useEditorStore((state) => state.showTrajectories);
  const selectedTrajectoryId = useEditorStore((state) => state.selectedTrajectoryId);

  if (!showTrajectories) return null;

  return (
    <>
      {trajectories
        .filter((trajectory) => trajectory.visible)
        .map((trajectory) => (
          <TrajectoryTube
            key={trajectory.id}
            trajectory={trajectory}
            selected={trajectory.id === selectedTrajectoryId}
          />
        ))}
    </>
  );
}

