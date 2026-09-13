import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Download,
  LayoutGrid,
  LogOut,
  MonitorPlay,
} from 'lucide-react';
import { CAMERA_PRESETS_MAP, type CameraPresetId } from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { trpc } from '../../lib/trpc';
import { useAuthStore } from '../../stores/authStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useRenderQueueStore } from '../../stores/renderQueueStore';
import { Button, IconButton } from '../../components/ui';

export function TopBar({ onExport }: { onExport: () => void }) {
  const play = usePlayStore((state) => state.play);
  const dirty = usePlayStore((state) => state.dirty);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clear);
  const presetId = useCameraStore((state) => state.presetId);
  const previewPathId = useCameraStore((state) => state.previewPathId);
  const setPreset = useCameraStore((state) => state.setPreset);
  const setPreviewPath = useCameraStore((state) => state.setPreviewPath);
  const cameraPaths = usePlayStore((state) => state.cameraPaths);
  const recording = useEditorStore((state) => state.recordingFrame.active);
  const readyRenders = useRenderQueueStore(
    (state) => state.jobs.filter((job) => job.status === 'done').length,
  );
  const updatePlay = trpc.play.update.useMutation();
  const [name, setName] = useState(play?.name ?? '');

  useEffect(() => {
    setName(play?.name ?? '');
  }, [play?.id, play?.name]);

  if (!play) return null;

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === play.name) {
      setName(play.name);
      return;
    }
    usePlayStore.getState().setPlay({ ...play, name: trimmed });
    updatePlay.mutate(
      { id: play.id, name: trimmed },
      { onError: (error) => console.error('Could not rename play', error) },
    );
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/5 bg-panel-900/90 px-3">
      <Link to="/" className="btn btn-ghost" title="Back to library">
        <LayoutGrid className="h-4 w-4" />
      </Link>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        className="w-64 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-100 outline-none transition hover:border-white/10 focus:border-sky-400/60"
      />
      <span
        className={cn(
          'chip',
          dirty ? 'border-amber-400/30 text-amber-200' : 'border-emerald-400/20 text-emerald-200',
        )}
      >
        {dirty ? 'Unsaved edits' : 'All changes saved'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <select
          title="Camera view"
          value={previewPathId ? `path:${previewPathId}` : `preset:${presetId}`}
          onChange={(event) => {
            const value = event.target.value;
            if (value.startsWith('path:')) {
              setPreviewPath(value.slice(5));
            } else {
              setPreset(value.slice(7) as CameraPresetId);
            }
          }}
          className="input w-40 py-1"
        >
          {(Object.keys(CAMERA_PRESETS_MAP) as CameraPresetId[]).map((id) => (
            <option key={id} value={`preset:${id}`}>
              {CAMERA_PRESETS_MAP[id].label}
            </option>
          ))}
          {cameraPaths.length > 0 && (
            <optgroup label="Camera paths">
              {cameraPaths.map((path) => (
                <option key={path.id} value={`path:${path.id}`}>
                  {path.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <Link to={`/view/${play.id}`} className="btn" title="Read-only viewer">
          <MonitorPlay className="h-3.5 w-3.5" />
          Viewer
        </Link>
        <Link to="/rules" className="btn" title="Rules reference">
          <BookOpen className="h-3.5 w-3.5" />
          Rules
        </Link>

        <Button variant="primary" onClick={onExport} disabled={recording}>
          <Download className="h-3.5 w-3.5" />
          Export
          {readyRenders > 0 && (
            <span className="ml-1 rounded-full bg-violet-400 px-1.5 text-[10px] font-bold text-slate-950">
              {readyRenders}
            </span>
          )}
        </Button>

        <div className="mx-1 h-6 w-px bg-white/10" />
        <span className="max-w-[120px] truncate text-xs text-slate-400">{user?.name ?? user?.email}</span>
        <IconButton
          title="Sign out"
          onClick={() => {
            clearAuth();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </header>
  );
}
