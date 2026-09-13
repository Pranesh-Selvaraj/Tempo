import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Plane, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { ROLE_COLORS, TRAJECTORY_COLORS, clamp, type Vec3 } from '@tempo/shared-types';
import { curveFor } from '../../lib/curves';
import { usePlayStore } from '../../stores/playStore';
import { useQuickStore } from '../../stores/quickStore';
import { WorldLabel } from '../court/WorldLabel';
import { useScreenDrag } from '../designer/DragControls';
import { buildLegs, homePlayers, spikerFor } from './quickPlay';

const noRaycast = () => undefined;
const TARGET_LABELS = ['Serve lands', 'Pass goes', 'Set goes', 'Spike lands'];

function TargetMarker({ point, index }: { point: Vec3; index: number }) {
  const selected = useQuickStore((state) => state.selectedTarget === index);
  const { onPointerDown } = useScreenDrag({
    canStart: () => {
      const quick = useQuickStore.getState();
      return quick.active && (quick.step === 'ball' || quick.step === 'attack');
    },
    getPlaneY: () => 0,
    onStart: () => {
      const quick = useQuickStore.getState();
      quick.beginHistory(`target:${index}`);
      quick.selectTarget(index);
    },
    onMove: (intersection) => {
      useQuickStore.getState().updateBallTarget(index, {
        x: clamp(intersection.x, -12, 12),
        y: 0,
        z: clamp(intersection.z, -7, 7),
      });
    },
  });

  const color = selected ? '#38bdf8' : '#f8fafc';

  return (
    <group>
      <mesh
        position={[point.x, 0.03, point.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        raycast={noRaycast}
      >
        <ringGeometry args={selected ? [0.2, 0.3, 28] : [0.16, 0.24, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[point.x, 0.28, point.z]} renderOrder={7} raycast={noRaycast}>
        <sphereGeometry args={[selected ? 0.14 : 0.11, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[point.x, 0.3, point.z]} onPointerDown={onPointerDown}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <WorldLabel
        text={`${index + 1} · ${TARGET_LABELS[index]}`}
        position={[point.x, 0.62, point.z]}
        color={selected ? '#bae6fd' : '#e2e8f0'}
        size={0.26}
      />
    </group>
  );
}

function SpikeMarker({ point }: { point: Vec3 }) {
  const selected = useQuickStore((state) => state.selectedTarget === 3);
  const { onPointerDown } = useScreenDrag({
    canStart: () => {
      const quick = useQuickStore.getState();
      return quick.active && quick.step === 'attack';
    },
    getPlaneY: () => 0,
    onStart: () => {
      const quick = useQuickStore.getState();
      quick.beginHistory('spike');
      quick.selectTarget(3);
    },
    onMove: (intersection) => {
      useQuickStore.getState().setSpikeTarget({
        x: clamp(intersection.x, -12, 12),
        y: 0,
        z: clamp(intersection.z, -7, 7),
      });
    },
  });

  const color = selected ? '#fca5a5' : '#f87171';

  return (
    <group>
      <mesh
        position={[point.x, 0.035, point.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        raycast={noRaycast}
      >
        <ringGeometry args={selected ? [0.28, 0.4, 32] : [0.24, 0.34, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh
        position={[point.x, 0.036, point.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        raycast={noRaycast}
      >
        <planeGeometry args={[0.9, 0.035]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh
        position={[point.x, 0.036, point.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        raycast={noRaycast}
      >
        <planeGeometry args={[0.035, 0.9]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[point.x, 0.3, point.z]} onPointerDown={onPointerDown}>
        <sphereGeometry args={[0.34, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <WorldLabel
        text="Spike lands"
        position={[point.x, 0.78, point.z]}
        color={selected ? '#fecaca' : '#fca5a5'}
        size={0.28}
      />
    </group>
  );
}

function QuickFloorTap() {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const raycasterRef = useRef(new Raycaster());
  const pointerRef = useRef(new Vector2());
  const planeRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const hitRef = useRef(new Vector3());

  const onPointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    downRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleUp = useCallback(
    (event: PointerEvent) => {
      const down = downRef.current;
      downRef.current = null;
      if (!down) return;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;

      const quick = useQuickStore.getState();
      if (quick.step !== 'ball' && quick.step !== 'attack') return;

      const rect = canvas.getBoundingClientRect();
      pointerRef.current.set(
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      planeRef.current.constant = 0;
      if (!raycasterRef.current.ray.intersectPlane(planeRef.current, hitRef.current)) return;

      const point: Vec3 = {
        x: clamp(hitRef.current.x, -12, 12),
        y: 0,
        z: clamp(hitRef.current.z, -7, 7),
      };

      if (quick.step === 'ball') {
        if (quick.selectedTarget !== null && quick.selectedTarget < 3) {
          quick.beginHistory(`target:${quick.selectedTarget}`);
          quick.updateBallTarget(quick.selectedTarget, point);
        } else {
          quick.addBallTarget(point);
        }
      } else {
        quick.beginHistory('spike');
        quick.setSpikeTarget(point);
      }
    },
    [camera, canvas],
  );

  useEffect(() => {
    canvas.addEventListener('pointerup', handleUp);
    return () => canvas.removeEventListener('pointerup', handleUp);
  }, [canvas, handleUp]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]} onPointerDown={onPointerDown}>
      <planeGeometry args={[44, 34]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function FloorArrow({
  from,
  to,
  color,
  label,
}: {
  from: Vec3;
  to: Vec3;
  color: string;
  label?: string;
}) {
  const direction = useMemo(
    () => new Vector3(to.x - from.x, 0, to.z - from.z),
    [from.x, from.z, to.x, to.z],
  );
  const head = useMemo(() => {
    if (direction.lengthSq() < 0.0001) return null;
    const normal = direction.clone().normalize();
    return {
      position: new Vector3(to.x, 0.09, to.z).addScaledVector(normal, -0.16),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal),
    };
  }, [direction, to.x, to.z]);

  if (!head) return null;
  const mid: [number, number, number] = [(from.x + to.x) / 2, 0.22, (from.z + to.z) / 2];

  return (
    <group>
      <Line
        points={[
          [from.x, 0.05, from.z],
          [to.x, 0.05, to.z],
        ]}
        color={color}
        lineWidth={2}
        dashed
        dashSize={0.16}
        gapSize={0.1}
        transparent
        opacity={0.85}
      />
      <mesh position={head.position} quaternion={head.quaternion} renderOrder={6} raycast={noRaycast}>
        <coneGeometry args={[0.09, 0.3, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && <WorldLabel text={label} position={mid} color={color} size={0.24} />}
    </group>
  );
}

function MovementArrows() {
  const step = useQuickStore((state) => state.step);
  const receiveFormation = useQuickStore((state) => state.receiveFormation);
  const ballTargets = useQuickStore((state) => state.ballTargets);
  const spikeTarget = useQuickStore((state) => state.spikeTarget);
  const players = usePlayStore((state) => state.players);

  const arrows = useMemo(() => {
    if (step !== 'attack' || !receiveFormation) return [];
    const origin = new Map(receiveFormation.map((player) => [player.playerId, player]));
    return homePlayers(players)
      .map((player) => {
        const from = origin.get(player.playerId);
        if (!from) return null;
        const distance = Math.hypot(
          player.position.x - from.position.x,
          player.position.z - from.position.z,
        );
        if (distance < 0.35) return null;
        return {
          playerId: player.playerId,
          from: from.position,
          to: player.position,
          color: ROLE_COLORS[player.role],
          label: player.playerId.replace(/\D/g, ''),
        };
      })
      .filter((arrow): arrow is NonNullable<typeof arrow> => arrow !== null);
  }, [step, receiveFormation, players]);

  const spiker = spikerFor(players, ballTargets[2] ?? null, spikeTarget);

  return (
    <group>
      {arrows.map((arrow) => (
        <FloorArrow
          key={arrow.playerId}
          from={arrow.from}
          to={arrow.to}
          color={arrow.color}
          label={arrow.label}
        />
      ))}
      {step === 'attack' && spikeTarget && spiker && (
        <FloorArrow from={spiker.position} to={spikeTarget} color="#f87171" label="SPIKE" />
      )}
    </group>
  );
}

function BallPreview() {
  const step = useQuickStore((state) => state.step);
  const ballTargets = useQuickStore((state) => state.ballTargets);
  const spikeTarget = useQuickStore((state) => state.spikeTarget);
  const setHeight = useQuickStore((state) => state.setHeight);

  const legs = useMemo(
    () => buildLegs(ballTargets, spikeTarget, setHeight),
    [ballTargets, spikeTarget, setHeight],
  );

  if (step === 'play') return null;

  const ghost = legs.length > 0 ? legs[legs.length - 1]!.controlPoints.at(-1) ?? null : null;

  return (
    <group>
      {legs.map((leg) => (
        <Line
          key={`${leg.type}-${leg.startMs}`}
          points={curveFor(leg.controlPoints)
            .getPoints(40)
            .map((point) => [point.x, point.y, point.z] as [number, number, number])}
          color={TRAJECTORY_COLORS[leg.type]}
          lineWidth={2.5}
          dashed
          dashSize={0.22}
          gapSize={0.14}
          transparent
          opacity={0.95}
        />
      ))}
      {ballTargets.map((point, index) => (
        <TargetMarker key={`${point.x}-${point.z}-${index}`} point={point} index={index} />
      ))}
      {spikeTarget && <SpikeMarker point={spikeTarget} />}
      {ghost && (
        <mesh position={[ghost.x, ghost.y, ghost.z]} renderOrder={7} raycast={noRaycast}>
          <sphereGeometry args={[0.105, 20, 20]} />
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.35} />
        </mesh>
      )}
    </group>
  );
}

export function QuickInteraction() {
  const active = useQuickStore((state) => state.active);
  if (!active) return null;
  return (
    <group>
      <QuickFloorTap />
      <BallPreview />
      <MovementArrows />
    </group>
  );
}
