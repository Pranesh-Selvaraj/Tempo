import { Link } from 'react-router-dom';
import { Copy, Globe, Lock, MonitorPlay, Pencil, Presentation, Trash2 } from 'lucide-react';
import {
  PLAY_CATEGORY_LABELS,
  phaseColor,
} from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { trpc } from '../../lib/trpc';
import { Button, IconButton } from '../../components/ui';
import type { Play } from '../../lib/trpc';
import { useState } from 'react';

export function PlayCard({ play }: { play: Play }) {
  const duplicate = trpc.play.duplicate.useMutation();
  const remove = trpc.play.delete.useMutation();
  const utils = trpc.useContext();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = () => {
    void utils.play.list.invalidate();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/view/${play.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="panel flex flex-col gap-3 p-3 transition hover:border-white/15">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/play/${play.id}`}
            className="block truncate text-sm font-semibold text-slate-100 hover:text-sky-300"
          >
            {play.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="chip">{PLAY_CATEGORY_LABELS[play.category]}</span>
            <span className="chip">Rotation {play.rotation}</span>
            <span className="chip capitalize">{play.courtType}</span>
            <span
              className={cn(
                'chip',
                play.isPublic
                  ? 'border-emerald-400/30 text-emerald-200'
                  : 'border-amber-400/20 text-amber-200',
              )}
            >
              {play.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {play.isPublic ? 'Shared' : 'Private'}
            </span>
          </div>
        </div>
        <span
          className="mt-0.5 h-6 w-6 shrink-0 rounded-lg"
          style={{ background: `linear-gradient(135deg, ${phaseColor(play.name)}, #000000)` }}
        />
      </div>

      {play.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{play.description}</p>
      )}

      <div className="mt-auto flex items-center gap-1.5">
        <Link to={`/play/${play.id}`} className="btn btn-primary flex-1">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
        <Link to={`/present/${play.id}`} className="btn" title="Present full screen">
          <Presentation className="h-3.5 w-3.5" />
        </Link>
        <Link to={`/view/${play.id}`} className="btn" title="Read-only viewer">
          <MonitorPlay className="h-3.5 w-3.5" />
        </Link>
        <IconButton title="Copy share link" onClick={copyLink}>
          <Copy className={cn('h-3.5 w-3.5', copied && 'text-emerald-300')} />
        </IconButton>
        <IconButton
          title="Duplicate"
          onClick={() =>
            duplicate.mutate({ id: play.id }, { onSuccess: () => refresh() })
          }
          disabled={duplicate.isLoading}
        >
          <Copy className="h-3.5 w-3.5" />
        </IconButton>
        {confirming ? (
          <Button
            variant="danger"
            onClick={() =>
              remove.mutate({ id: play.id }, { onSuccess: () => refresh() })
            }
          >
            Sure?
          </Button>
        ) : (
          <IconButton title="Delete play" variant="danger" onClick={() => setConfirming(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

