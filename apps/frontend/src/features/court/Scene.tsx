import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { bridge } from '../../lib/bridge';
import { useEditorStore } from '../../stores/editorStore';
import { CameraPathEditor } from '../camera/CameraPathEditor';
import { CameraRig } from '../camera/CameraRig';
import { ArrowDrawer } from '../designer/ArrowDrawer';
import { FloorInteraction } from '../designer/FloorInteraction';
import { TrajectoryEditor } from '../designer/TrajectoryEditor';
import { QuickInteraction } from '../quick/QuickInteraction';
import { PlaybackDriver } from '../timeline/PlaybackDriver';
import { Annotations } from './Annotations';
import { Ball } from './Ball';
import { Court } from './Court';
import { GhostTrails, SelectionBeacon } from './GhostTrails';
import { Net } from './Net';
import { Players } from './Players';
import { TrajectoryTubes } from './TrajectoryTube';

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#93c5fd', '#0f172a', 0.4]} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-10, 12, -10]} intensity={0.35} />
    </>
  );
}

function Effects() {
  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom luminanceThreshold={0.72} luminanceSmoothing={0.2} intensity={0.35} mipmapBlur />
      <Vignette eskil={false} offset={0.22} darkness={0.55} />
    </EffectComposer>
  );
}

/**
 * The 3D court. `editing` toggles authoring affordances (drag handles, floor
 * clicks). Everything else — animation, camera rig, annotations — always runs,
 * so the same scene is used for recording and presentation.
 */
export function Scene({ editing = true, quick = false }: { editing?: boolean; quick?: boolean }) {
  const setEditing = useEditorStore((state) => state.setEditing);
  const renderJobActive = useEditorStore((state) => state.renderJobActive);

  useEffect(() => {
    setEditing(editing);
    return () => setEditing(true);
  }, [editing, setEditing]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={renderJobActive ? 'never' : 'always'}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      camera={{ position: [12, 8, 12], fov: 50, near: 0.1, far: 200 }}
      onCreated={(state) => {
        bridge.canvas = state.gl.domElement;
        bridge.renderer = state.gl;
        bridge.scene = state.scene;
        bridge.camera = state.camera;
        bridge.root = state;
      }}
    >
      <color attach="background" args={['#0b1120']} />
      <fog attach="fog" args={['#0b1120', 30, 90]} />

      <Lighting />
      <Court />
      <Net />
      <Players />
      <GhostTrails />
      {editing && <SelectionBeacon />}
      <Ball />
      <TrajectoryTubes />
      <Annotations />

      <PlaybackDriver />
      <CameraRig />
      {editing && !quick && <CameraPathEditor />}
      {editing && !quick && <TrajectoryEditor />}
      {editing && !quick && <ArrowDrawer />}
      {editing && !quick && <FloorInteraction />}
      {quick && <QuickInteraction />}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        target={[0, 1.5, 0]}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={1.5}
        maxDistance={60}
      />
      <Effects />
    </Canvas>
  );
}
