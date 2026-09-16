import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CircleHelp, ClipboardList, LogOut, MousePointerClick, Plus, Search, Volleyball } from 'lucide-react';
import {
  COURT_TYPES,
  FORMATION_INFO,
  FORMATIONS,
  NET_HEIGHT_MEN,
  NET_HEIGHT_WOMEN,
  PLAY_CATEGORY_LABELS,
  PLAY_CATEGORIES,
  type Formation,
  type PlayCategory,
} from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { DEMO_MODE } from '../../lib/mode';
import { trpc } from '../../lib/trpc';
import type { Play } from '../../lib/trpc';
import { useAuthStore } from '../../stores/authStore';
import { useMasterStore } from '../../demo/masterStore';
import { useTourStore } from '../../demo/tourStore';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { Button, Field, Modal, NumberInput, Panel, Select, TextInput } from '../../components/ui';
import { MatchHistoryPanel } from '../scorecard/MatchHistoryPanel';
import { ScorecardWidget } from '../scorecard/ScorecardWidget';
import { PlayCard } from './PlayCard';

function LibraryStats({ plays }: { plays: Play[] }) {
  const stats = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const play of plays) {
      byCategory.set(play.category, (byCategory.get(play.category) ?? 0) + 1);
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total: plays.length,
      categories: byCategory.size,
      top: top ? PLAY_CATEGORY_LABELS[top[0] as PlayCategory] : '—',
      shared: plays.filter((play) => play.isPublic).length,
    };
  }, [plays]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        { label: 'Plays', value: String(stats.total) },
        { label: 'Categories', value: String(stats.categories) },
        { label: 'Top category', value: stats.top },
        { label: 'Shared', value: String(stats.shared) },
      ].map((stat) => (
        <div key={stat.label} className="panel px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</p>
          <p className="truncate text-lg font-bold tabular-nums text-sky-300">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function NewPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const utils = trpc.useContext();
  const create = trpc.play.create.useMutation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlayCategory>('serve_receive');
  const [rotation, setRotation] = useState(1);
  const [formation, setFormation] = useState<Formation>('5-1');
  const [libero, setLibero] = useState(true);
  const [courtType, setCourtType] = useState<'indoor' | 'beach'>('indoor');
  const [netHeight, setNetHeight] = useState(NET_HEIGHT_MEN);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), category, rotation, formation, libero, courtType, netHeight },
      {
        onSuccess: (play) => {
          void utils.play.list.invalidate();
          onClose();
          navigate(`/play/${play.id}`);
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="New play">
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Play name">
          <TextInput
            value={name}
            autoFocus
            required
            placeholder="e.g. Rotation 3 — Stack Slide"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Category">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as PlayCategory)}
            >
              {PLAY_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {PLAY_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Rotation">
            <Select value={String(rotation)} onChange={(event) => setRotation(Number(event.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  Rotation {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Court">
            <Select
              value={courtType}
              onChange={(event) => {
                const value = event.target.value as 'indoor' | 'beach';
                setCourtType(value);
                setNetHeight(NET_HEIGHT_MEN);
              }}
            >
              {COURT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value === 'indoor' ? 'Indoor' : 'Beach'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Net height (m)">
            <NumberInput
              step={0.01}
              value={netHeight}
              onChange={(event) => setNetHeight(Number(event.target.value))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Formation" hint={FORMATION_INFO[formation].short}>
            <Select
              value={formation}
              onChange={(event) => setFormation(event.target.value as Formation)}
            >
              {FORMATIONS.map((value) => (
                <option key={value} value={value} title={FORMATION_INFO[value].description}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              className={cn('w-full', libero && 'btn-primary')}
              onClick={() => setLibero(!libero)}
              title="Toggle the libero in the base lineup"
            >
              {libero ? 'Libero on' : 'No libero'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500">
          {[NET_HEIGHT_MEN, NET_HEIGHT_WOMEN].map((height) => (
            <button
              key={height}
              type="button"
              className="chip hover:text-slate-200"
              onClick={() => setNetHeight(height)}
            >
              {height === NET_HEIGHT_MEN ? "Men's" : "Women's"} {height} m
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={create.isLoading || !name.trim()}>
            Create play
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function PlayLibrary() {
  const [category, setCategory] = useState<PlayCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const lockMaster = useMasterStore((state) => state.lock);
  const startTour = useTourStore((state) => state.start);

  const list = trpc.play.list.useQuery(category === 'all' ? {} : { category });
  const plays = list.data ?? [];
  const filteredPlays = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return plays;
    return plays.filter((play) => play.name.toLowerCase().includes(term));
  }, [plays, query]);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-white/5 bg-panel-900/80 px-5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
          <Volleyball className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-sm font-bold">Tempo</h1>
          <p className="text-[10px] text-slate-500">
            3D volleyball play designer · built by Pranesh Selvaraj
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/scorecard" className="btn">
            <ClipboardList className="h-3.5 w-3.5" />
            Scorecard
          </Link>
          <Link to="/rules" className="btn">
            <BookOpen className="h-3.5 w-3.5" />
            Rules
          </Link>
          <span className="hidden text-xs text-slate-400 sm:block">
            {user?.name ?? user?.email}
          </span>
          {DEMO_MODE && (
            <Button variant="ghost" onClick={startTour} title="How Tempo works">
              <CircleHelp className="h-3.5 w-3.5" />
            </Button>
          )}
          <ThemeSwitcher compact />
          <Button
            variant="ghost"
            onClick={() => (DEMO_MODE ? lockMaster() : clear())}
            title={DEMO_MODE ? 'Lock preview' : 'Sign out'}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
          <Link to="/interactive" className="btn btn-primary">
            <MousePointerClick className="h-3.5 w-3.5" />
            Interactive play
          </Link>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New play
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-5">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <ScorecardWidget />
            <MatchHistoryPanel />
            {!list.isLoading && !list.error && plays.length > 0 && <LibraryStats plays={plays} />}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={cn(
                  'chip',
                  category === 'all' && 'border-sky-400/50 bg-sky-500/15 text-sky-100',
                )}
              >
                All plays
              </button>
              {PLAY_CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    'chip',
                    category === value && 'border-sky-400/50 bg-sky-500/15 text-sky-100',
                  )}
                >
                  {PLAY_CATEGORY_LABELS[value]}
                </button>
              ))}
            </div>

            <Panel bodyClassName="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Your plays</h2>
                <span className="chip">{filteredPlays.length}</span>
                <div className="relative ml-auto w-56">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <TextInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search plays…"
                    className="pl-7"
                  />
                </div>
              </div>

              {list.isLoading ? (
                <p className="py-10 text-center text-sm text-slate-500">Loading plays…</p>
              ) : list.error ? (
                <p className="py-10 text-center text-sm text-red-300">{list.error.message}</p>
              ) : plays.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-slate-200">No plays yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Start on the court right away, or create a play and draw ball paths.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Link to="/interactive" className="btn btn-primary">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      Start interactive play
                    </Link>
                    <Button onClick={() => setNewOpen(true)}>
                      <Plus className="h-3.5 w-3.5" />
                      New play
                    </Button>
                  </div>
                </div>
              ) : filteredPlays.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No plays match that search.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredPlays.map((play) => (
                    <PlayCard key={play.id} play={play} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 px-5 py-4 text-center text-[11px] text-slate-500">
        Tempo — designed and built by{' '}
        <a
          href="https://github.com/Pranesh-Selvaraj"
          target="_blank"
          rel="noreferrer"
          className="text-slate-300 underline-offset-2 hover:underline"
        >
          Pranesh Selvaraj
        </a>
        , volleyball player. MIT licensed.
      </footer>

      <NewPlayDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
