import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Camera,
  Clock3,
  Download,
  Film,
  History,
  Image as ImageIcon,
  Play,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { SessionRecord, SessionStatus } from '@/types';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { downloadTextFile, toCsv } from '@/lib/download';
import { formatCredits, formatCreditsDecimal, formatDate, formatDateTime, formatDuration } from '@/lib/format';
import { PRESETS } from '@/lib/mock-data';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { FilterTabs } from '@/components/ui/SegmentedControl';
import {
  EmptyState,
  InlineNotice,
} from '@/components/ui/Feedback';
import { Drawer } from '@/components/ui/Overlay';
import { CopyButton } from '@/components/ui/CopyButton';
import { Stat } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

type SessionFilter = 'all' | SessionStatus | 'demo' | 'live';

const statusTone: Record<SessionStatus, BadgeTone> = {
  completed: 'positive',
  stopped: 'warning',
  failed: 'negative',
};

const statusLabel: Record<SessionStatus, string> = {
  completed: 'Completed',
  stopped: 'Stopped',
  failed: 'Failed',
};

export function Sessions() {
  const { sessions, setStudioDraft } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SessionRecord | null>(null);

  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [sessions],
  );

  const counts = useMemo(
    () => ({
      all: sorted.length,
      completed: sorted.filter((session) => session.status === 'completed').length,
      stopped: sorted.filter((session) => session.status === 'stopped').length,
      failed: sorted.filter((session) => session.status === 'failed').length,
      demo: sorted.filter((session) => session.mode === 'demo').length,
      live: sorted.filter((session) => session.mode === 'live').length,
    }),
    [sorted],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sorted.filter((session) => {
      if (filter === 'demo' && session.mode !== 'demo') return false;
      if (filter === 'live' && session.mode !== 'live') return false;
      if (
        filter !== 'all' &&
        filter !== 'demo' &&
        filter !== 'live' &&
        session.status !== filter
      ) {
        return false;
      }
      if (!normalized) return true;
      return (
        session.title.toLowerCase().includes(normalized) ||
        session.prompt.toLowerCase().includes(normalized) ||
        session.cameraLabel.toLowerCase().includes(normalized) ||
        (session.referenceName?.toLowerCase().includes(normalized) ?? false)
      );
    });
  }, [filter, query, sorted]);

  const totals = useMemo(() => {
    const duration = sorted.reduce((sum, session) => sum + session.durationSec, 0);
    const credits = sorted.reduce((sum, session) => sum + session.creditsUsed, 0);
    const live = sorted.filter((session) => session.mode === 'live').length;
    return { duration, credits, live };
  }, [sorted]);

  const handleExport = () => {
    if (filtered.length === 0) {
      pushToast({ tone: 'info', title: 'Nothing to export in this view' });
      return;
    }
    const rows: Array<Array<string | number>> = [
      ['Started', 'Title', 'Preset', 'Duration (s)', 'Credits (estimated)', 'Status', 'Mode', 'Camera', 'Reference'],
      ...filtered.map((session) => [
        session.startedAt,
        session.title,
        PRESETS.find((preset) => preset.id === session.presetId)?.name ?? 'Custom',
        session.durationSec,
        Number(session.creditsUsed.toFixed(2)),
        session.status,
        session.mode,
        session.cameraLabel,
        session.referenceName ?? '',
      ]),
    ];
    downloadTextFile('dallr-session-history.csv', toCsv(rows), 'text/csv');
    pushToast({
      tone: 'success',
      title: 'Session CSV exported',
      description: `${filtered.length} local records downloaded.`,
    });
  };

  const applySettings = (session: SessionRecord) => {
    setStudioDraft({ prompt: session.prompt, presetId: session.presetId });
    setSelected(null);
    navigate('/studio');
    pushToast({
      tone: 'info',
      title: 'Settings applied',
      description: 'Prompt and preset are loaded in Live Studio. No reference file is restored.',
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Session history"
        actions={
          <>
            {filtered.length > 0 && (
              <Button
                variant="secondary"
                icon={Download}
                onClick={handleExport}
              >
                Export CSV
              </Button>
            )}
            <Link to="/studio">
              <Button variant="primary" icon={Play}>
                Open Live Studio
              </Button>
            </Link>
          </>
        }
      />

      {sessions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <Stat label="Total sessions" value={String(counts.all)} />
          </Card>
          <Card className="p-4">
            <Stat label="Total duration" value={formatDuration(totals.duration)} />
          </Card>
          <Card className="p-4">
            <Stat label="Credits used" value={`${formatCredits(Math.round(totals.credits))} cr`} />
          </Card>
          <Card className="p-4">
            <Stat label="Live sessions" value={String(totals.live)} />
          </Card>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.055] p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs<SessionFilter>
            label="Filter sessions"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setSelected(null);
            }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'completed', label: 'Completed', count: counts.completed },
              { value: 'stopped', label: 'Stopped', count: counts.stopped },
              { value: 'failed', label: 'Failed', count: counts.failed },
              { value: 'live', label: 'Live', count: counts.live },
              { value: 'demo', label: 'Dry runs', count: counts.demo },
            ]}
          />
          <div className="relative w-full lg:w-[260px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/25"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, prompt or camera"
              aria-label="Search sessions"
              className="h-8 pl-8 text-[11.5px]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={History}
              title={query ? 'No matching sessions' : 'No sessions recorded yet'}
              description={query ? 'Try a different search term.' : 'Start a live session in Live Studio to record your transformations here.'}
              action={
                <div className="flex items-center gap-2">
                  <Link to="/studio">
                    <Button size="sm" variant="primary" icon={Play}>
                      Open Live Studio
                    </Button>
                  </Link>
                  {query ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setQuery('');
                        setFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px_100px_100px] gap-3 border-b border-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25 md:grid">
              <span>Session</span>
              <span>Started</span>
              <span className="text-right">Duration</span>
              <span className="text-right">Credits</span>
              <span className="text-right">Status</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {filtered.map((session) => {
                const preset = PRESETS.find((item) => item.id === session.presetId);
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(session)}
                      className="group grid w-full grid-cols-1 items-center gap-2 px-4 text-left transition hover:bg-white/[0.025] focus-visible:bg-white/[0.03] focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_130px_100px_100px_100px] md:gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2.5 pt-3 md:py-3">
                        <span
                          className={cn(
                            'relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border bg-gradient-to-br',
                            preset?.gradient ?? 'border-white/[0.07] from-white/[0.06] to-white/[0.02]',
                          )}
                        >
                          <span className="absolute inset-0 bg-black/20" aria-hidden="true" />
                          <Wand2 className="relative size-3.5 text-white/60" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[12px] font-medium text-white/72 group-hover:text-white/88">
                              {session.title}
                            </span>
                            {session.mode === 'live' ? (
                              <Badge tone="positive" className="h-[18px] px-1.5 text-[8.5px]">
                                Live
                              </Badge>
                            ) : session.mode === 'demo' ? (
                              <Badge tone="accent" className="h-[18px] px-1.5 text-[8.5px]">
                                Dry run
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-white/27">
                            <span className="truncate">{preset?.name ?? 'Custom transform'}</span>
                            <span className="text-white/15">·</span>
                            <span className="truncate">{session.cameraLabel}</span>
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-[10.5px] text-white/34 md:block">
                        {formatDate(session.startedAt)}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-white/55 md:text-right">
                        {formatDuration(session.durationSec)}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-white/55 md:text-right">
                        {formatCreditsDecimal(session.creditsUsed)}
                      </span>
                      <span className="flex items-center justify-between gap-2 pb-3 md:justify-end md:pb-0">
                        <span className="text-[9.5px] text-white/27 md:hidden">
                          {formatDate(session.startedAt)}
                        </span>
                        <Badge tone={statusTone[session.status]}>{statusLabel[session.status]}</Badge>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-2.5">
              <p className="text-[9.5px] text-white/40">
                Showing {filtered.length} of {sorted.length} recorded sessions
              </p>
            </div>
          </>
        )}
      </Card>

      <InlineNotice tone="accent" icon={Film} title="Session Records">
        Sessions record transformation metadata, elapsed rendering seconds, and live credits deducted at 4 credits per second.
      </InlineNotice>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Session'}
        description={selected ? `${formatDateTime(selected.startedAt)} · ${selected.cameraLabel}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected ? (
              <Button variant="primary" icon={Sparkles} onClick={() => applySettings(selected)}>
                Use these settings
              </Button>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge tone={statusTone[selected.status]} dot>
                {statusLabel[selected.status]}
              </Badge>
              <Badge
                tone={
                  selected.mode === 'live'
                    ? 'positive'
                    : selected.mode === 'demo'
                      ? 'accent'
                      : 'neutral'
                }
              >
                {selected.mode === 'live'
                  ? 'Live session'
                  : selected.mode === 'demo'
                    ? 'Local dry run'
                    : 'Sample record'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <Clock3 className="size-2.5" aria-hidden="true" />
                  Duration
                </p>
                <p className="mt-1.5 text-[15px] font-medium tabular-nums text-white/80">
                  {formatDuration(selected.durationSec)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <Sparkles className="size-2.5" aria-hidden="true" />
                  Est. credits
                </p>
                <p className="mt-1.5 text-[15px] font-medium tabular-nums text-white/80">
                  {formatCreditsDecimal(selected.creditsUsed)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/28">
                Prompt
              </p>
              <p className="mt-2 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-[11.5px] leading-[1.6] text-white/55">
                {selected.prompt || 'No prompt recorded.'}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11.5px]">
              <div>
                <dt className="text-white/30">Preset</dt>
                <dd className="mt-0.5 font-medium text-white/70">
                  {PRESETS.find((preset) => preset.id === selected.presetId)?.name ?? 'Custom'}
                </dd>
              </div>
              <div>
                <dt className="text-white/30">Camera</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-white/70">
                  <Camera className="size-3 text-white/30" aria-hidden="true" />
                  {selected.cameraLabel}
                </dd>
              </div>
              <div>
                <dt className="text-white/30">Started</dt>
                <dd className="mt-0.5 font-medium text-white/70">{formatDateTime(selected.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-white/30">Reference</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-white/70">
                  <ImageIcon className="size-3 text-white/30" aria-hidden="true" />
                  <span className="truncate">{selected.referenceName ?? 'None'}</span>
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="font-mono text-[10px] text-white/35">{selected.id}</span>
              <CopyButton value={selected.id} label="Copy ID" toastTitle="Session ID copied" />
            </div>

            <InlineNotice tone="neutral" icon={Film} title="No media available">
              Session history stores metadata only. There is no playback, thumbnail or exportable
              video in this build. “Use these settings” restores the prompt and preset only.
            </InlineNotice>

            <Link
              to="/studio"
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent/65 transition hover:text-accent"
            >
              Open Live Studio
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
