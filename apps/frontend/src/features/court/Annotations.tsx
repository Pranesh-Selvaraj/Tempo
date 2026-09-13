import { useMemo } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { usePlayStore } from '../../stores/playStore';
import { useEditorStore } from '../../stores/editorStore';
import { WorldLabel } from './WorldLabel';

/**
 * 3D coaching notes that fade in during their visibility window. Rendered with
 * sprites (not DOM) so they are captured in recorded video.
 */
export function Annotations() {
  const annotations = usePlayStore((state) => state.annotations);
  const currentMs = useTimelineStore((state) => state.currentMs);
  const selectedAnnotationId = useEditorStore((store) => store.selectedAnnotationId);
  const selectAnnotation = useEditorStore((store) => store.selectAnnotation);
  const pending = useEditorStore((store) => store.pendingAnnotation);

  const visible = useMemo(
    () =>
      annotations.filter((annotation) => {
        const afterStart = annotation.visibleFromMs === null || currentMs >= annotation.visibleFromMs;
        const beforeEnd = annotation.visibleToMs === null || currentMs <= annotation.visibleToMs;
        return afterStart && beforeEnd;
      }),
    [annotations, currentMs],
  );

  return (
    <group>
      {visible.map((annotation) => {
        const selected = annotation.id === selectedAnnotationId;
        const height = Math.max(0.15, annotation.position.y);
        return (
          <group key={annotation.id}>
            <mesh
              position={[annotation.position.x, 0.05, annotation.position.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={3}
            >
              <ringGeometry args={[selected ? 0.2 : 0.14, selected ? 0.28 : 0.2, 24]} />
              <meshBasicMaterial
                color={annotation.color}
                transparent
                opacity={selected ? 0.95 : 0.6}
                depthWrite={false}
              />
            </mesh>
            <mesh
              position={[annotation.position.x, (height + 0.05) / 2, annotation.position.z]}
              renderOrder={3}
            >
              <cylinderGeometry args={[0.006, 0.006, height, 6]} />
              <meshBasicMaterial color={annotation.color} transparent opacity={0.5} />
            </mesh>
            <mesh
              onPointerDown={(event) => {
                event.stopPropagation();
                selectAnnotation(annotation.id);
              }}
              position={[annotation.position.x, height + 0.05, annotation.position.z]}
              renderOrder={9}
            >
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshBasicMaterial color={annotation.color} toneMapped={false} />
            </mesh>
            <WorldLabel
              text={annotation.text}
              position={[annotation.position.x, height + 0.32, annotation.position.z]}
              color={annotation.color}
              size={0.3}
            />
          </group>
        );
      })}

      {pending && (
        <group>
          <mesh position={[pending.x, 0.03, pending.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.2, 0.3, 24]} />
            <meshBasicMaterial color="#facc15" transparent opacity={0.8} depthWrite={false} />
          </mesh>
          <WorldLabel
            text="type a note in the panel →"
            position={[pending.x, pending.y + 0.3, pending.z]}
            color="#fde68a"
            size={0.26}
          />
        </group>
      )}
    </group>
  );
}
