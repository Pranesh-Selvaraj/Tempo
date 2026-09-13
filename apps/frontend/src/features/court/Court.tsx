import {
  ATTACK_LINE_X,
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH,
  COURT_LENGTH,
  COURT_WIDTH,
} from '@tempo/shared-types';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { FloorLabel } from './WorldLabel';

const LINE_Y = 0.014;

function LineMark({
  position,
  size,
  color = '#f8fafc',
}: {
  position: [number, number, number];
  size: [number, number];
  color?: string;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function ZoneBand({
  x,
  width,
  z,
  color,
  opacity,
}: {
  x: number;
  width: number;
  z: number;
  color: string;
  opacity: number;
}) {
  return (
    <mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
      <planeGeometry args={[width, 3]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function ZoneOverlay() {
  const columns = [
    { z: -3, front: '2', back: '1' },
    { z: 0, front: '3', back: '6' },
    { z: 3, front: '4', back: '5' },
  ];
  return (
    <group>
      {columns.map((column) => (
        <group key={column.z}>
          {/* Home side (x > 0) */}
          <ZoneBand x={1.5} width={3} z={column.z} color="#38bdf8" opacity={0.13} />
          <ZoneBand x={6} width={6} z={column.z} color="#38bdf8" opacity={0.08} />
          <FloorLabel text={column.front} position={[1.5, 0.03, column.z]} size={1.1} color="rgba(224, 242, 254, 0.65)" />
          <FloorLabel text={column.back} position={[6, 0.03, column.z]} size={1.1} color="rgba(224, 242, 254, 0.5)" />
          {/* Away side */}
          <ZoneBand x={-1.5} width={3} z={-column.z} color="#f87171" opacity={0.1} />
          <FloorLabel text={column.front} position={[-1.5, 0.03, -column.z]} size={1.1} color="rgba(254, 226, 226, 0.4)" />
        </group>
      ))}
    </group>
  );
}

export function Court() {
  const courtType = usePlayStore((state) => state.play?.courtType ?? 'indoor');
  const showZones = useEditorStore((state) => state.showZones);
  const beach = courtType === 'beach';

  const floorColor = beach ? '#e2bd85' : '#c98b4b';
  const surroundColor = beach ? '#c9a066' : '#0f2f4f';

  return (
    <group>
      {/* Free zone / gym floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[COURT_LENGTH + 10, COURT_WIDTH + 10]} />
        <meshStandardMaterial color={surroundColor} roughness={1} />
      </mesh>

      {/* Playing surface: 18 m along X, 9 m along Z */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>

      {/* End lines */}
      <LineMark position={[COURT_HALF_LENGTH, LINE_Y, 0]} size={[0.05, COURT_WIDTH]} />
      <LineMark position={[-COURT_HALF_LENGTH, LINE_Y, 0]} size={[0.05, COURT_WIDTH]} />
      {/* Sidelines */}
      <LineMark position={[0, LINE_Y, COURT_HALF_WIDTH]} size={[COURT_LENGTH, 0.05]} />
      <LineMark position={[0, LINE_Y, -COURT_HALF_WIDTH]} size={[COURT_LENGTH, 0.05]} />
      {/* Center line */}
      <LineMark position={[0, LINE_Y, 0]} size={[0.05, COURT_WIDTH]} />

      {/* Attack lines (3 m from the net, indoor only) */}
      {!beach && (
        <>
          <LineMark position={[ATTACK_LINE_X, LINE_Y, 0]} size={[0.05, COURT_WIDTH]} />
          <LineMark position={[-ATTACK_LINE_X, LINE_Y, 0]} size={[0.05, COURT_WIDTH]} />
          <FloorLabel text="3 m" position={[ATTACK_LINE_X, 0.03, COURT_HALF_WIDTH - 0.6]} size={0.5} color="rgba(255,255,255,0.35)" />
        </>
      )}

      {showZones && <ZoneOverlay />}
    </group>
  );
}
