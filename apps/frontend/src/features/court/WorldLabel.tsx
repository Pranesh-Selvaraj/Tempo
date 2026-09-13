import { useEffect, useMemo } from 'react';
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three';

interface LabelTextureOptions {
  color?: string;
  background?: string;
  fontSize?: number;
  fontWeight?: number | string;
  padding?: number;
}

function createLabelTexture(text: string, options: LabelTextureOptions): { texture: CanvasTexture; aspect: number } {
  const {
    color = '#ffffff',
    background = 'rgba(2, 6, 23, 0.72)',
    fontSize = 72,
    fontWeight = 700,
    padding = 28,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  const font = `${fontWeight} ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width + padding * 2);
  const height = Math.ceil(fontSize * 1.4 + padding);

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  if (background !== 'transparent') {
    ctx.fillStyle = background;
    const radius = Math.min(18, height / 2);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}

/** Camera-facing label rendered inside WebGL so it shows up in recordings. */
export function WorldLabel({
  text,
  position = [0, 0, 0],
  color = '#ffffff',
  background = 'rgba(2, 6, 23, 0.72)',
  size = 0.4,
  renderOrder = 10,
}: {
  text: string;
  position?: [number, number, number];
  color?: string;
  background?: string;
  size?: number;
  renderOrder?: number;
}) {
  const label = useMemo(
    () => createLabelTexture(text, { color, background }),
    [text, color, background],
  );

  useEffect(() => () => label.texture.dispose(), [label.texture]);

  return (
    <sprite position={position} scale={[size * label.aspect, size, 1]} renderOrder={renderOrder}>
      <spriteMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

/** Flat label lying on the floor (zone numbers, court markings). */
export function FloorLabel({
  text,
  position,
  rotation = 0,
  color = 'rgba(255, 255, 255, 0.45)',
  size = 0.9,
}: {
  text: string;
  position: [number, number, number];
  rotation?: number;
  color?: string;
  size?: number;
}) {
  const label = useMemo(
    () =>
      createLabelTexture(text, {
        color,
        background: 'transparent',
        fontSize: 96,
        fontWeight: 800,
        padding: 8,
      }),
    [text, color],
  );

  useEffect(() => () => label.texture.dispose(), [label.texture]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotation]} renderOrder={2}>
      <planeGeometry args={[size * label.aspect, size]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} side={DoubleSide} toneMapped={false} />
    </mesh>
  );
}
