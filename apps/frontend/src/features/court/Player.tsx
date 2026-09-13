import { Suspense, useRef } from 'react';
import { Vector3 } from 'three';
import { clamp, ROLE_COLORS, type PlayerState } from '@tempo/shared-types';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useEditorStore } from '../../stores/editorStore';
import { useModelStore } from '../../stores/modelStore';
import { usePlayStore } from '../../stores/playStore';
import { useQuickStore } from '../../stores/quickStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useScreenDrag } from '../designer/DragControls';
import { MannequinPlayer } from './MannequinPlayer';
import { PlayerGLB } from './PlayerGLB';
import { WorldLabel } from './WorldLabel';

const D = Math.PI / 180;

/**
 * A volleyball player: drag target, selection ring, jersey label, and a body
 * that is either the procedural mannequin or a user-supplied skinned GLB.
 */
export function Player({ state }: { state: PlayerState }) {
  const offset = useRef(new Vector3());
  const selected = useEditorStore((store) => store.selectedPlayerId === state.playerId);
  const showRoster = useEditorStore((store) => store.showRoster);
  const modelUrl = useModelStore((store) => store.modelUrl);

  const { onPointerDown } = useScreenDrag({
    canStart: () =>
      useEditorStore.getState().editing &&
      useEditorStore.getState().dragEnabled &&
      useEditorStore.getState().tool === 'select' &&
      !useEditorStore.getState().recordingFrame.active,
    getPlaneY: () => 0,
    onStart: (point) => {
      useTimelineStore.getState().setPlaying(false);
      useEditorStore.getState().selectPlayer(state.playerId);
      if (useQuickStore.getState().active) {
        useQuickStore.getState().beginHistory(`player:${state.playerId}`);
      }
      const player = usePlayStore.getState().players.find((p) => p.playerId === state.playerId);
      if (player) {
        offset.current.set(point.x - player.position.x, 0, point.z - player.position.z);
      }
    },
    onMove: (point) => {
      usePlayStore.getState().updatePlayer(state.playerId, {
        position: {
          x: clamp(point.x - offset.current.x, -10.5, 10.5),
          y: 0,
          z: clamp(point.z - offset.current.z, -5.9, 5.9),
        },
      });
    },
  });

  const jersey = state.playerId.startsWith('opp') ? '#f97316' : ROLE_COLORS[state.role];
  const number = state.playerId.replace(/[^0-9]/g, '') || state.playerId;

  const body = modelUrl ? (
    <ErrorBoundary fallback={<MannequinPlayer state={state} />} label="player-model">
      <Suspense fallback={<MannequinPlayer state={state} />}>
        <PlayerGLB state={state} url={modelUrl} />
      </Suspense>
    </ErrorBoundary>
  ) : (
    <MannequinPlayer state={state} />
  );

  return (
    <group
      position={[state.position.x, state.position.y, state.position.z]}
      rotation={[0, state.rotationY * D, 0]}
    >
      {/* Selection ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={1}>
        <ringGeometry args={[0.42, 0.52, 40]} />
        <meshBasicMaterial
          color={jersey}
          transparent
          opacity={selected ? 0.95 : 0.3}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {body}

      {/* Invisible hit volume for pointer interaction */}
      <mesh
        position={[0, 1.0, 0]}
        onPointerDown={(event) => {
          if (!useEditorStore.getState().dragEnabled) {
            event.stopPropagation();
            return;
          }
          onPointerDown(event);
        }}
        userData={{ playerId: state.playerId }}
      >
        <cylinderGeometry args={[0.38, 0.38, 2.0, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {showRoster && (
        <WorldLabel
          text={number}
          position={[0, 1.98, 0]}
          color="#ffffff"
          background="rgba(2, 6, 23, 0.55)"
          size={0.3}
        />
      )}
    </group>
  );
}
