import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Download, FileText, Search } from 'lucide-react';
import { RULE_CATEGORIES } from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { trpc } from '../../lib/trpc';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { Modal, Panel, TextInput } from '../../components/ui';

const RULE_BOOK_URL = '/rules/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf';

function RuleBookBanner() {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            FIVB Official Volleyball Rules 2025–2028
          </p>
          <p className="text-[11px] text-slate-500">
            Official English rule book (v05) · PDF · © FIVB — reference copy bundled for offline use
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <a className="btn" href={RULE_BOOK_URL} target="_blank" rel="noreferrer">
            <BookOpen className="h-3.5 w-3.5" />
            Read online
          </a>
          <a className="btn btn-primary" href={RULE_BOOK_URL} download>
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>
    </Panel>
  );
}

interface DiagramPreview {
  src: string;
  caption: string;
}

export function RulesBrowser() {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<DiagramPreview | null>(null);

  const list = trpc.rules.list.useQuery(category ? { category } : {});
  const search = trpc.rules.search.useQuery(
    { query: query.trim() },
    { enabled: query.trim().length >= 2 },
  );

  const searching = query.trim().length >= 2;
  const rules = searching ? (search.data ?? []) : (list.data ?? []);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rules>();
    for (const rule of rules) {
      const bucket = map.get(rule.category) ?? [];
      bucket.push(rule);
      map.set(rule.category, bucket);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rules]);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/5 bg-panel-900/80 px-3 py-3 sm:px-5">
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-sm font-bold">Rules reference</h1>
          <p className="hidden text-[10px] text-slate-500 sm:block">
            Essentials + diagrams · FIVB rule book 2025–2028
          </p>
        </div>
        <div className="relative w-full sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rules…"
            className="pl-7"
          />
        </div>
        <ThemeSwitcher compact />
      </header>

      <div className="mx-auto flex max-w-6xl gap-5 p-5">
        <nav className="hidden w-48 shrink-0 space-y-1 md:block">
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              setQuery('');
            }}
            className={cn(
              'block w-full rounded-lg px-3 py-1.5 text-left text-xs transition',
              !category && !searching
                ? 'bg-sky-500/15 text-sky-100'
                : 'text-slate-400 hover:bg-white/5',
            )}
          >
            All categories
          </button>
          {RULE_CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setCategory(value);
                setQuery('');
              }}
              className={cn(
                'block w-full rounded-lg px-3 py-1.5 text-left text-xs transition',
                category === value && !searching
                  ? 'bg-sky-500/15 text-sky-100'
                  : 'text-slate-400 hover:bg-white/5',
              )}
            >
              {value}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          {!searching && (
            <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={cn(
                  'chip shrink-0',
                  !category && 'border-sky-400/50 bg-sky-500/15 text-sky-100',
                )}
              >
                All
              </button>
              {RULE_CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    'chip shrink-0',
                    category === value && 'border-sky-400/50 bg-sky-500/15 text-sky-100',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          {!searching && <RuleBookBanner />}

          {grouped.length === 0 && (
            <Panel className="py-10 text-center text-sm text-slate-500">
              {searching ? 'No rules match that search.' : 'Loading rules…'}
            </Panel>
          )}
          {grouped.map(([group, groupRules]) => (
            <section key={group} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">{group}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {groupRules.map((rule) => (
                  <article key={rule.id} className="panel flex flex-col p-3">
                    <h3 className="text-xs font-semibold text-slate-100">{rule.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{rule.content}</p>
                    {rule.diagramUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            src: rule.diagramUrl!,
                            caption: rule.title,
                          })
                        }
                        className="mt-2 overflow-hidden rounded-lg border border-white/5 bg-panel-950/60 transition hover:border-sky-400/40"
                        title="Enlarge diagram"
                      >
                        <img
                          src={rule.diagramUrl}
                          alt={`Diagram: ${rule.title}`}
                          loading="lazy"
                          className="h-32 w-full object-contain p-1"
                        />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          <footer className="border-t border-white/5 pb-4 pt-4 text-center text-[11px] text-slate-500">
            Rule summaries and diagrams curated by <span className="text-slate-300">Pranesh Selvaraj</span>{' '}
            · Tempo — 3D volleyball play designer
          </footer>
        </div>
      </div>

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.caption ?? 'Diagram'}
        size="lg"
      >
        {preview && (
          <img
            src={preview.src}
            alt={`Diagram: ${preview.caption}`}
            className="w-full rounded-lg border border-white/5 bg-panel-950/60"
          />
        )}
      </Modal>
    </div>
  );
}
