import { Line } from '@react-three/drei';
import { useCameraStore } from '../../stores/cameraStore';
import { usePlayStore } from '../../stores/playStore';

/** Visualizes the camera path being previewed: positions, look-at rays, and the dolly line. */
export function CameraPathEditor() {
  const cameraPaths = usePlayStore((state) => state.cameraPaths);
  const previewPathId = useCameraStore((state) => state.previewPathId);
  const path = cameraPaths.find((item) => item.id === previewPathId) ?? null;

  if (!path || path.keyframes.length === 0) return null;

  const points = path.keyframes.map(
    (keyframe) => keyframe.position as [number, number, number],
  );

  return (
    <group>
      {points.length >= 2 && (
        <Line
          points={points}
          color="#c084fc"
          lineWidth={2}
          dashed
          dashSize={0.28}
          gapSize={0.18}
          transparent
          opacity={0.9}
        />
      )}
      {path.keyframes.map((keyframe, index) => (
        <group key={`${path.id}-${index}`} position={keyframe.position}>
          <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={8}>
            <coneGeometry args={[0.14, 0.3, 4]} />
            <meshBasicMaterial color="#c084fc" toneMapped={false} />
          </mesh>
          <Line
            points={[keyframe.position, keyframe.target]}
            color="#c084fc"
            lineWidth={1}
            transparent
            opacity={0.45}
          />
        </group>
      ))}
    </group>
  );
}
