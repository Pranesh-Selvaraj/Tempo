import { Check, ExternalLink, X } from 'lucide-react';
import { Modal } from './ui';

const REPO_URL = 'https://github.com/Pranesh-Selvaraj/Tempo';

const ALLOWED = [
  'Read, study and review the source code',
  'Use Tempo for free — personal, educational, internal or commercial use',
  'Install and host unmodified copies for yourself and your organization',
  'Share links to the official repository',
  'Report issues and contribute improvements through the repository',
];

const NOT_ALLOWED = [
  'Modify, adapt or create derivative works from the code',
  'Run or use modified, forked or derivative versions',
  'Distribute, sell or offer Tempo (or a copy) as a product, service or template',
  'Incorporate the code into another product',
  'Remove license, copyright or attribution notices',
  'Use the Tempo name or logo to brand or endorse something else',
];

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="About Tempo" size="lg">
      <div className="space-y-4 text-xs text-slate-300">
        <p className="leading-relaxed text-slate-400">
          Tempo is a 3D volleyball play designer. It is free to use — including commercially —
          but it is <span className="text-slate-200">source-available, not open source</span>: you
          can read and use the code, but the product comes only from the official repository.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-200">
              <Check className="h-3.5 w-3.5" />
              You may
            </p>
            <ul className="space-y-1.5">
              {ALLOWED.map((item) => (
                <li key={item} className="flex gap-1.5 leading-relaxed text-slate-400">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-red-400/20 bg-red-500/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-red-200">
              <X className="h-3.5 w-3.5" />
              You may not
            </p>
            <ul className="space-y-1.5">
              {NOT_ALLOWED.map((item) => (
                <li key={item} className="flex gap-1.5 leading-relaxed text-slate-400">
                  <X className="mt-0.5 h-3 w-3 shrink-0 text-red-300" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
            <ExternalLink className="h-3.5 w-3.5" />
            Official repository
          </a>
          <a
            href={`${REPO_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            Full license terms
          </a>
          <p className="w-full text-[10px] text-slate-500 sm:ml-auto sm:w-auto">
            If this summary and the license differ, the license governs.
          </p>
        </div>
      </div>
    </Modal>
  );
}
