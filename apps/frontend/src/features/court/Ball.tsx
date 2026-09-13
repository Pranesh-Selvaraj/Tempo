import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, Vector3 } from 'three';
import { BALL_RADIUS, clamp } from '@tempo/shared-types';
import { ballPositionAt } from '../../lib/ballPosition';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';

function makeBallTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2563eb';
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, size / 2 + i * 88);
    ctx.bezierCurveTo(size * 0.35, size / 2 + i * 88 - 46, size * 0.65, size / 2 + i * 88 + 46, size, size / 2 + i * 88);
    ctx.stroke();
  }
  ctx.strokeStyle = '#facc15';
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(size / 2 + i * 88, 0);
    ctx.bezierCurveTo(size / 2 + i * 88 - 46, size * 0.35, size / 2 + i * 88 + 46, size * 0.65, size / 2 + i * 88, size);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function Ball() {
  const trajectories = usePlayStore((state) => state.trajectories);
  const keyframes = usePlayStore((state) => state.keyframes);
  const currentMs = useTimelineStore((state) => state.currentMs);
  const texture = useMemo(makeBallTexture, []);

  useEffect(() => () => texture.dispose(), [texture]);

  const position = useMemo(() => {
    const point = ballPositionAt(trajectories, keyframes, currentMs);
    return point ? new Vector3(point.x, point.y, point.z) : null;
  }, [trajectories, keyframes, currentMs]);

  if (!position) return null;

  return (
    <group>
      <mesh position={position} castShadow renderOrder={6}>
        <sphereGeometry args={[BALL_RADIUS, 24, 24]} />
        <meshStandardMaterial map={texture} roughness={0.4} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position.x, 0.02, position.z]} renderOrder={2}>
        <circleGeometry args={[0.24, 24]} />
        <meshBasicMaterial
          color="#020617"
          transparent
          opacity={clamp(0.42 - position.y * 0.06, 0.05, 0.42)}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
