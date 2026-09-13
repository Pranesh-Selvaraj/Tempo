import { useCallback, useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { clamp } from '@tempo/shared-types';
import { useEditorStore } from '../../stores/editorStore';
import type { Vec3 } from '@tempo/shared-types';

/**
 * Invisible floor plane that handles authoring clicks: adding trajectory
 * control points, placing annotations, and clearing selections. Ignores
 * pointer movement so orbiting does not create points.
 */
export function FloorInteraction() {
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

      const editor = useEditorStore.getState();
      if (editor.recordingFrame.active) return;

      const rect = canvas.getBoundingClientRect();
      pointerRef.current.set(
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      planeRef.current.constant = 0;
      if (!raycasterRef.current.ray.intersectPlane(planeRef.current, hitRef.current)) return;

      const point: Vec3 = {
        x: clamp(hitRef.current.x, -13, 13),
        y: editor.brushHeight,
        z: clamp(hitRef.current.z, -8, 8),
      };

      if (editor.tool === 'draw-trajectory') {
        editor.addDraftPoint(point);
      } else if (editor.tool === 'place-annotation') {
        editor.setPendingAnnotation(point);
      } else {
        editor.clearSelection();
      }
    },
    [camera, canvas],
  );

  useEffect(() => {
    canvas.addEventListener('pointerup', handleUp);
    return () => canvas.removeEventListener('pointerup', handleUp);
  }, [canvas, handleUp]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} onPointerDown={onPointerDown}>
      <planeGeometry args={[44, 34]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
