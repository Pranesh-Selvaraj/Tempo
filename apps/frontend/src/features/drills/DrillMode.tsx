import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, Play, RotateCcw } from 'lucide-react';
import { phaseColor, type Phase } from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Scene } from '../court/Scene';
import { Button } from '../../components/ui';

/**
 * Guided walkthrough: step through the phases one at a time, reveal the ball
 * paths when the team is ready to answer, and tick off reps.
 */
export function DrillMode() {
  const { playId } = useParams<{ playId: string }>();
  const play = usePlayStore((state) => state.play);
  const phases = usePlayStore((state) => state.phases);
  const showTrajectories = useEditorStore((state) => state.showTrajectories);
  const showGhosts = useEditorStore((state) => state.showGhosts);
  const [done, setDone] = useState<string[]>([]);

  const query = trpc.play.get.useQuery({ id: playId ?? '' }, { enabled: Boolean(playId) });

  useEffect(() => {
    if (query.data) {
      usePlayStore.getState().reset();
      usePlayStore.getState().loadDetail(query.data);
      useTimelineStore.getState().reset();
      // Drills start with the ball paths hidden — reveal them when the team is ready.
      useEditorStore.setState({ showTrajectories: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  if (!play) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        {query.isLoading ? 'Loading drill…' : 'Play not found'}
      </div>
    );
  }

  const mark = (phase: Phase) => {
    setDone((current) =>
      current.includes(phase.id) ? current.filter((id) => id !== phase.id) : [...current, phase.id],
    );
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/5 bg-panel-900/80 px-3">
        <Link to={`/play/${play.id}`} className="btn btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-semibold">Drill · {play.name}</h1>
          <p className="text-[10px] text-slate-500">
            {done.length}/{phases.length} phases run
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            onClick={() => useEditorStore.getState().toggleTrajectories()}
            title="Hide the ball paths so players have to read it"
          >
            {showTrajectories ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showTrajectories ? 'Hide paths' : 'Reveal paths'}
          </Button>
          <Button onClick={() => useEditorStore.getState().toggleGhosts()}>
            {showGhosts ? 'Ghosts on' : 'Ghosts off'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              useTimelineStore.getState().setCurrent(0);
              useTimelineStore.getState().setPlaying(true);
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Run play
          </Button>
          <Button variant="ghost" title="Reset checkmarks" onClick={() => setDone([])}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="scroll-thin w-72 shrink-0 space-y-2 overflow-y-auto border-r border-white/5 bg-panel-900/60 p-3">
          {phases.map((phase, index) => {
            const complete = done.includes(phase.id);
            const color = phaseColor(phase.name);
            return (
              <div
                key={phase.id}
                className={cn(
                  'rounded-xl border p-3 transition',
                  complete ? 'border-emerald-400/30 bg-emerald-500/5' : 'border-white/10 bg-panel-950/50',
                )}
              >
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => mark(phase)} title="Mark as run">
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-slate-100">
                    {index + 1}. {phase.name}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-slate-500">
                    {(phase.startMs / 1000).toFixed(1)}s
                  </span>
                </div>
                {phase.coachingNote && (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                    {phase.coachingNote}
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      useTimelineStore.getState().setPlaying(false);
                      useTimelineStore.getState().setCurrent(phase.startMs);
                    }}
                  >
                    Jump here
                  </Button>
                  <Button
                    className="flex-1"
                    variant="primary"
                    onClick={() => {
                      useTimelineStore.getState().setCurrent(phase.startMs);
                      useTimelineStore.getState().setPlaying(true);
                    }}
                  >
                    Play
                  </Button>
                </div>
              </div>
            );
          })}
          {phases.length === 0 && (
            <p className="text-[11px] leading-relaxed text-slate-500">
              Add phases in the editor (Phases tab) to turn this play into a guided drill.
            </p>
          )}
        </aside>

        <main className="relative min-w-0 flex-1">
          <Scene editing={false} />
        </main>
      </div>
    </div>
  );
}
