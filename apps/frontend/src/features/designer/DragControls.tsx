import { useCallback, useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';

interface OrbitLike {
  enabled: boolean;
  target?: Vector3;
  update?: () => void;
}

interface ScreenDragHandlers {
  onStart?: (point: Vector3) => void;
  onMove?: (point: Vector3, event: PointerEvent) => void;
  onEnd?: () => void;
  /** Height of the horizontal plane the pointer is projected onto. */
  getPlaneY?: () => number;
  canStart?: () => boolean;
}

/**
 * Pointer drag projected onto a horizontal plane. Used for moving players and
 * trajectory control points. Disables OrbitControls while dragging.
 */
export function useScreenDrag(handlers: ScreenDragHandlers) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitLike | null;
  const canvas = useThree((state) => state.gl.domElement);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const activeRef = useRef(false);
  const raycasterRef = useRef(new Raycaster());
  const pointerRef = useRef(new Vector2());
  const planeRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const hitRef = useRef(new Vector3());

  const pick = useCallback(
    (clientX: number, clientY: number): Vector3 | null => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.set(
        ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      planeRef.current.constant = -(handlersRef.current.getPlaneY?.() ?? 0);
      return raycasterRef.current.ray.intersectPlane(planeRef.current, hitRef.current) ? hitRef.current : null;
    },
    [camera, canvas],
  );

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.button !== 0) return;
      if (handlersRef.current.canStart && !handlersRef.current.canStart()) return;
      const point = pick(event.clientX, event.clientY);
      if (!point) return;
      event.stopPropagation();
      activeRef.current = true;
      if (controls) controls.enabled = false;
      handlersRef.current.onStart?.(point.clone());
    },
    [controls, pick],
  );

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!activeRef.current) return;
      const point = pick(event.clientX, event.clientY);
      if (point) handlersRef.current.onMove?.(point, event);
    };
    const handleEnd = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      if (controls) controls.enabled = true;
      handlersRef.current.onEnd?.();
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }, [controls, pick]);

  return { onPointerDown, draggingRef: activeRef };
}
