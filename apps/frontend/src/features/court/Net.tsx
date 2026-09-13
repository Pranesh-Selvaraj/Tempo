import { useEffect, useMemo } from 'react';
import { CanvasTexture, DoubleSide, RepeatWrapping, SRGBColorSpace } from 'three';
import { COURT_WIDTH, NET_HALF_WIDTH } from '@tempo/shared-types';
import { usePlayStore } from '../../stores/playStore';
import { WorldLabel } from './WorldLabel';

function makeNetTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // One mesh square ≈ 12.5 cm — the standard 10 cm indoor net mesh.
  texture.repeat.set(COURT_WIDTH / 0.125, 1);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function Net() {
  const netHeight = usePlayStore((state) => state.play?.netHeight ?? 2.43);
  const netTexture = useMemo(() => makeNetTexture(), []);

  useEffect(() => {
    netTexture.repeat.set(COURT_WIDTH / 0.125, netHeight / 0.125);
    netTexture.needsUpdate = true;
  }, [netTexture, netHeight]);

  useEffect(() => () => netTexture.dispose(), [netTexture]);

  const postHeight = netHeight + 0.5;

  return (
    <group>
      {/* Net mesh */}
      <mesh position={[0, netHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={3}>
        <planeGeometry args={[COURT_WIDTH, netHeight]} />
        <meshStandardMaterial
          map={netTexture}
          transparent
          opacity={0.55}
          side={DoubleSide}
          roughness={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* Top and bottom bands */}
      <mesh position={[0, netHeight - 0.025, 0]}>
        <boxGeometry args={[0.02, 0.07, COURT_WIDTH]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.02, 0.08, COURT_WIDTH]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
      </mesh>

      {/* Posts */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, postHeight / 2 - 0.1, side * (NET_HALF_WIDTH + 0.15)]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, postHeight, 12]} />
            <meshStandardMaterial color="#262626" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh
            position={[0, netHeight, side * (NET_HALF_WIDTH + 0.075)]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Antennas: 0.8 m above the net, marking the legal crossing corridor */}
      {[-1, 1].map((side) => (
        <mesh position={[0, netHeight + 0.4, side * NET_HALF_WIDTH]}>
          <cylinderGeometry args={[0.012, 0.012, 0.8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.4} />
        </mesh>
      ))}

      <WorldLabel
        text={`${netHeight.toFixed(2)} m`}
        position={[0.55, netHeight + 0.22, NET_HALF_WIDTH + 0.35]}
        size={0.24}
      />
    </group>
  );
}
