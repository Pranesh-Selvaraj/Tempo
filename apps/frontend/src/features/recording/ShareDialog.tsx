import { useState } from 'react';
import { Check, Copy, Download, Link as LinkIcon, Share2, Smartphone, UploadCloud } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { trpc } from '../../lib/trpc';
import { formatBytes, slugify } from '../../lib/format';
import { DEMO_MODE } from '../../lib/mode';
import { uploadRecordingFile } from '../../lib/upload';
import { usePlayStore } from '../../stores/playStore';
import { Button, Modal, Toggle } from '../../components/ui';
import type { RecordingResult } from './useRecorder';

export function SharePanel({ result }: { result: RecordingResult }) {
  const play = usePlayStore((state) => state.play);
  const setPlay = usePlayStore((state) => state.setPlay);
  const setPublicMutation = trpc.play.setPublic.useMutation();
  const [copied, setCopied] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!play) return null;

  const shareUrl = `${window.location.origin}/view/${play.id}`;
  const filename = `${slugify(play.name)}.${result.extension}`;
  const file = new File([result.blob], filename, { type: result.blob.type });
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  const download = () => {
    const anchor = document.createElement('a');
    anchor.href = result.url;
    anchor.download = filename;
    anchor.click();
  };

  const share = async () => {
    try {
      await navigator.share({
        files: [file],
        title: play.name,
        text: `${play.name} — authored in Tempo`,
      });
    } catch {
      // User dismissed the share sheet.
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('Clipboard unavailable', error);
    }
  };

  const upload = async () => {
    setUploadState('uploading');
    setUploadError(null);
    try {
      const stored = await uploadRecordingFile(result.blob, filename);
      setUploadedUrl(stored.url);
      setUploadState('done');
    } catch (error) {
      console.error('Upload failed', error);
      setUploadError(error instanceof Error ? error.message : String(error));
      setUploadState('error');
    }
  };

  const copyUploaded = async () => {
    if (!uploadedUrl) return;
    try {
      await navigator.clipboard.writeText(uploadedUrl);
    } catch (error) {
      console.error('Clipboard unavailable', error);
    }
  };

  return (
    <div className="space-y-4">
      {result.preset.format === 'gif' ? (
        <img src={result.url} alt="Exported GIF preview" className="mx-auto max-h-72 rounded-lg" />
      ) : result.preset.format === 'glb' ? (
        <div className="rounded-lg border border-white/10 bg-panel-950/60 p-4 text-xs text-slate-300">
          The scene was exported as a binary glTF model. Download it and open it in any 3D viewer
          (Blender, Windows 3D Viewer, three.js editor).
        </div>
      ) : (
        <video src={result.url} controls playsInline className="max-h-72 w-full rounded-lg bg-black" />
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={download}>
          <Download className="h-3.5 w-3.5" />
          Download {result.extension.toUpperCase()}
        </Button>
        {canShareFiles && (
          <Button onClick={share}>
            <Share2 className="h-3.5 w-3.5" />
            Share to app…
          </Button>
        )}
        <Button onClick={copyLink}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy play link'}
        </Button>
      </div>

      {DEMO_MODE ? (
        <div className="rounded-lg border border-sky-400/20 bg-sky-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
            <UploadCloud className="h-3.5 w-3.5" /> Host the file
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            The static demo has no server, so uploads are disabled. Download the video or use your
            device&apos;s share sheet — the play link below still works.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/5 bg-panel-950/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
            <UploadCloud className="h-3.5 w-3.5" /> Host the file
          </p>
          {uploadState === 'done' && uploadedUrl ? (
            <div className="mt-2 space-y-2">
              <p className="break-all font-mono text-[10px] text-emerald-200">{uploadedUrl}</p>
              <Button onClick={copyUploaded}>
                <Copy className="h-3.5 w-3.5" />
                Copy video link
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <Button onClick={upload} disabled={uploadState === 'uploading'}>
                <UploadCloud className="h-3.5 w-3.5" />
                {uploadState === 'uploading' ? 'Uploading…' : 'Upload for a direct video link'}
              </Button>
              <span className="text-[10px] text-slate-500">
                Stores in the server&apos;s uploads folder (or R2 when configured).
              </span>
            </div>
          )}
          {uploadError && <p className="mt-1 text-[10px] text-red-300">{uploadError}</p>}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-panel-950/50 p-3">
        <div className="rounded bg-white p-1.5">
          <QRCodeSVG value={uploadedUrl ?? shareUrl} size={92} />
        </div>
        <div className="text-[11px] leading-relaxed text-slate-400">
          <p className="flex items-center gap-1 font-medium text-slate-200">
            <Smartphone className="h-3.5 w-3.5" />
            {uploadedUrl ? 'Scan to open the video file' : 'Scan to open the play on a phone'}
          </p>
          <p className="mt-1">
            {result.preset.label} · {formatBytes(result.blob.size)}
            {result.durationMs > 0 ? ` · ${(result.durationMs / 1000).toFixed(1)} s` : ''}
          </p>
          <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
            {uploadedUrl ?? shareUrl}
          </p>
        </div>
      </div>

      <Toggle
        checked={play.isPublic}
        label="Anyone with the link can view this play"
        onChange={(value) =>
          setPublicMutation.mutate(
            { id: play.id, isPublic: value },
            {
              onSuccess: (updated) => setPlay(updated),
              onError: (error) => console.error('Could not change sharing', error),
            },
          )
        }
      />
      <p className="text-[10px] text-slate-500">
        Turn sharing on before sending the link — phones that are not signed in can only open public
        plays.
      </p>
    </div>
  );
}

export function ShareDialog({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: RecordingResult | null;
}) {
  return (
    <Modal open={open && result !== null} onClose={onClose} title="Export & share">
      {result && <SharePanel result={result} />}
    </Modal>
  );
}
