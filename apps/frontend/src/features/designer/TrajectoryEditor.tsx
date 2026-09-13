import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Vec3 } from '@tempo/shared-types';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useScreenDrag } from './DragControls';

function ControlPointHandle({
  trajectoryId,
  index,
  point,
  color,
  onCommit,
}: {
  trajectoryId: string;
  index: number;
  point: Vec3;
  color: string;
  onCommit: () => void;
}) {
  const selected =
    useEditorStore((store) => store.selectedTrajectoryId === trajectoryId) &&
    useEditorStore((store) => store.selectedPointIndex === index);

  const { onPointerDown } = useScreenDrag({
    canStart: () =>
      useEditorStore.getState().tool === 'select' &&
      !useEditorStore.getState().recordingFrame.active,
    getPlaneY: () => point.y,
    onStart: () => {
      useEditorStore.getState().selectPoint(index);
    },
    onMove: (intersection) => {
      const trajectory = usePlayStore
        .getState()
        .trajectories.find((item) => item.id === trajectoryId);
      if (!trajectory) return;
      const points = [...trajectory.controlPoints];
      points[index] = { x: intersection.x, y: point.y, z: intersection.z };
      usePlayStore.getState().updateTrajectory(trajectoryId, { controlPoints: points });
    },
    onEnd: onCommit,
  });

  return (
    <mesh position={[point.x, point.y, point.z]} onPointerDown={onPointerDown} renderOrder={8}>
      <sphereGeometry args={[selected ? 0.12 : 0.085, 16, 16]} />
      <meshBasicMaterial color={selected ? '#f8fafc' : color} toneMapped={false} />
    </mesh>
  );
}

/** Control handles for the selected trajectory; drag to reshape the flight path. */
export function TrajectoryEditor() {
  const trajectories = usePlayStore((state) => state.trajectories);
  const selectedTrajectoryId = useEditorStore((store) => store.selectedTrajectoryId);
  const selectedPointIndex = useEditorStore((store) => store.selectedPointIndex);
  const updateMutation = trpc.trajectory.update.useMutation();

  const selected = useMemo(
    () => trajectories.find((trajectory) => trajectory.id === selectedTrajectoryId) ?? null,
    [trajectories, selectedTrajectoryId],
  );

  if (!selected) return null;

  const polygon: [number, number, number][] = selected.controlPoints.map((point) => [
    point.x,
    point.y,
    point.z,
  ]);

  const commit = () => {
    const trajectory = usePlayStore
      .getState()
      .trajectories.find((item) => item.id === selectedTrajectoryId);
    if (!trajectory) return;
    updateMutation.mutate({ id: trajectory.id, controlPoints: trajectory.controlPoints });
  };

  const focus = selected.controlPoints[selectedPointIndex ?? -1];

  return (
    <group>
      {polygon.length >= 2 && (
        <Line
          points={polygon}
          color={selected.color ?? '#f8fafc'}
          lineWidth={1}
          dashed
          dashSize={0.1}
          gapSize={0.1}
          transparent
          opacity={0.5}
        />
      )}
      {selected.controlPoints.map((point, index) => (
        <ControlPointHandle
          key={`${selected.id}-${index}`}
          trajectoryId={selected.id}
          index={index}
          point={point}
          color={selected.color ?? '#f8fafc'}
          onCommit={commit}
        />
      ))}
      {focus && (
        <mesh position={[focus.x, 0.02, focus.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.1, 0.18, 24]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
