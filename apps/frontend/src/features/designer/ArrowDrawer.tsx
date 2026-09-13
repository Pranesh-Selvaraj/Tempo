import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Vec3 } from '@tempo/shared-types';
import { useEditorStore } from '../../stores/editorStore';

/** Draft trajectory while the coach is clicking out control points. */
export function ArrowDrawer() {
  const draftPoints: Vec3[] = useEditorStore((state) => state.draftPoints);
  const tool = useEditorStore((state) => state.tool);
  const brushHeight = useEditorStore((state) => state.brushHeight);

  const linePoints = useMemo(
    () => draftPoints.map((point) => [point.x, point.y, point.z] as [number, number, number]),
    [draftPoints],
  );

  if (tool !== 'draw-trajectory') return null;

  return (
    <group>
      {linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color="#f8fafc"
          lineWidth={2}
          dashed
          dashSize={0.18}
          gapSize={0.12}
          transparent
          opacity={0.9}
        />
      )}
      {draftPoints.map((point, index) => (
        <group key={`${point.x}-${point.z}-${index}`}>
          <mesh position={[point.x, point.y, point.z]} renderOrder={7}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#f8fafc" toneMapped={false} />
          </mesh>
          <mesh position={[point.x, 0.02, point.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.1, 0.16, 20]} />
            <meshBasicMaterial color="#f8fafc" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {draftPoints.length === 0 && (
        <mesh position={[0, brushHeight, 0]} renderOrder={7}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.35} wireframe />
        </mesh>
      )}
    </group>
  );
}
