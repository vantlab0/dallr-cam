import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  Check,
  Database,
  Download,
  Info,
  Laptop,
  MonitorCog,
  Palette,
  RotateCcw,
  ServerCog,
  Settings2,
  ShieldAlert,
  Sparkles,
  Wand2,
  WifiOff,
} from 'lucide-react';
import type { AccentTheme } from '@/types';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { downloadTextFile } from '@/lib/download';
import { isDesktopRuntime } from '@/lib/environment';
import {
  formatCredits,
  formatDate,
  formatDuration,
} from '@/lib/format';
import { estimatedSecondsRemaining } from '@/lib/credits';
import { DEFAULT_STUDIO_DRAFT } from '@/lib/mock-data';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, Divider } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Switch } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'studio' | 'notifications' | 'data';

const accents: Array<{ value: AccentTheme; label: string; swatch: string; hint: string }> = [
  { value: 'aurora', label: 'Aurora', swatch: '#b9c4ff', hint: 'Cool periwinkle' },
  { value: 'citrine', label: 'Citrine', swatch: '#dce99e', hint: 'Warm citron' },
  { value: 'rose', label: 'Rose', swatch: '#eeb2c4', hint: 'Muted rose' },
];

function SettingRow({
  title,
  description,
  control,
  className,
}: {
  title: string;
  description: string;
  control: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-6 py-3.5', className)}>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-white/72">{title}</p>
        <p className="mt-0.5 max-w-[480px] text-[10.5px] leading-[1.55] text-white/30">{description}</p>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Palette;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        active
          ? 'bg-white/[0.085] text-white/88'
          : 'text-white/38 hover:bg-white/[0.04] hover:text-white/65',
      )}
    >
      <Icon className={cn('size-3.5', active && 'text-accent')} aria-hidden="true" />
      {label}
    </button>
  );
}

export function Settings() {
  const {
    settings,
    wallet,
    user,
    sessions,
    transactions,
    studioDraft,
    updateSettings,
    updateNotifications,
    resetDemoData,
    setStudioDraft,
    reconnect,
  } = useApp();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [rateInput, setRateInput] = useState(String(settings.usageRatePerMin));
  const [resetOpen, setResetOpen] = useState(false);
  const runningInDesktop = isDesktopRuntime();

  useEffect(() => {
    setRateInput(String(settings.usageRatePerMin));
  }, [settings.usageRatePerMin]);

  const remaining = estimatedSecondsRemaining(wallet.balanceCredits, settings.usageRatePerMin);

  const commitRate = () => {
    const parsed = Number(rateInput);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 240) {
      setRateInput(String(settings.usageRatePerMin));
      pushToast({
        tone: 'error',
        title: 'Rate must be between 1 and 240',
        description: 'This demo rate only affects local time estimates.',
      });
      return;
    }
    updateSettings({ usageRatePerMin: Math.round(parsed) });
    pushToast({
      tone: 'success',
      title: 'Estimate rate updated',
      description: 'Session estimates and projections updated to reflect the specified rate.',
    });
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'Local workspace export. Contains no video, audio or payment credentials.',
      user,
      wallet,
      settings,
      studioDraft,
      transactions,
      sessions,
    };
    downloadTextFile(
      'dallr-workspace.json',
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    pushToast({
      tone: 'success',
      title: 'Workspace exported',
      description: 'A JSON copy of your workspace state was downloaded.',
    });
  };

  const handleReset = () => {
    setResetOpen(false);
    resetDemoData();
    pushToast({
      tone: 'success',
      title: 'Demo workspace reset',
      description: 'Sample wallet, sessions, transactions and settings were restored.',
    });
  };

  const handleOfflineToggle = (next: boolean) => {
    updateSettings({ simulateOffline: next });
    if (next) {
      pushToast({
        tone: 'info',
        title: 'Offline mode enabled',
        description: 'Connection states and recovery UI are now visible across the app.',
      });
    } else {
      void reconnect();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Appearance, studio defaults and local preview controls. Preferences are saved to this device."
        actions={
          <>
            <Badge tone="positive" dot>
              Saved locally
            </Badge>
            <Badge tone="neutral">{runningInDesktop ? 'Desktop runtime' : 'Browser preview'}</Badge>
          </>
        }
      />

      <div
        role="tablist"
        aria-label="Settings sections"
        className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1"
      >
        <TabButton active={tab === 'general'} icon={Palette} label="General" onClick={() => setTab('general')} />
        <TabButton active={tab === 'studio'} icon={Wand2} label="Studio" onClick={() => setTab('studio')} />
        <TabButton
          active={tab === 'notifications'}
          icon={BellRing}
          label="Notifications"
          onClick={() => setTab('notifications')}
        />
        <TabButton active={tab === 'data'} icon={Database} label="Data & about" onClick={() => setTab('data')} />
      </div>

      {tab === 'general' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" role="tabpanel" aria-label="General settings">
          <div className="space-y-4">
            <Card className="p-4 sm:p-5">
              <CardHeader
                title="Accent colour"
                description="Applied across controls, focus states and session highlights."
                icon={<Palette className="size-3.5" />}
              />
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {accents.map((accent) => {
                  const active = settings.accent === accent.value;
                  return (
                    <button
                      key={accent.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateSettings({ accent: accent.value })}
                      className={cn(
                        'group rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45',
                        active
                          ? 'border-white/[0.16] bg-white/[0.055]'
                          : 'border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.03]',
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className="size-5 rounded-full ring-1 ring-white/20"
                          style={{ backgroundColor: accent.swatch }}
                          aria-hidden="true"
                        />
                        {active ? <Check className="size-3.5 text-accent" aria-hidden="true" /> : null}
                      </span>
                      <span className="mt-2 block text-[11.5px] font-medium text-white/72">
                        {accent.label}
                      </span>
                      <span className="mt-0.5 block text-[9.5px] text-white/28">{accent.hint}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-white/[0.055] bg-black/[0.12] px-3 py-2.5">
                <p className="text-[10px] leading-[1.5] text-white/28">
                  This is a dark-only interface in the current build. A light theme is not bundled.
                </p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <CardHeader
                title="Interface"
                description="Motion and density preferences apply immediately."
                icon={<MonitorCog className="size-3.5" />}
              />
              <div className="mt-2 divide-y divide-white/[0.05]">
                <SettingRow
                  title="Reduce motion"
                  description="Disable page, overlay and decorative animations. System preference is respected even when this is off."
                  control={
                    <Switch
                      checked={settings.reduceMotion}
                      onCheckedChange={(next) => updateSettings({ reduceMotion: next })}
                      label="Reduce motion"
                    />
                  }
                />
                <SettingRow
                  title="Compact density"
                  description="Tighten page padding and list row height for smaller laptop displays."
                  control={
                    <Switch
                      checked={settings.compact}
                      onCheckedChange={(next) => updateSettings({ compact: next })}
                      label="Compact density"
                    />
                  }
                />
                <SettingRow
                  title="Language"
                  description="Only English is bundled in this preview build."
                  control={
                    <Badge tone="outline" className="mt-1">
                      English (US)
                    </Badge>
                  }
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-accent/15 bg-accent/[0.06] text-accent/80">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-white/72">Preview workspace</p>
                  <p className="mt-1 text-[10.5px] leading-[1.55] text-white/32">
                    These preferences control only this local interface. No account, billing or
                    rendering service receives them.
                  </p>
                </div>
              </div>
              <Divider className="my-3.5" />
              <dl className="space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/30">Sample balance</dt>
                  <dd className="font-medium tabular-nums text-white/65">
                    {formatCredits(wallet.balanceCredits)} cr
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/30">Estimated time left</dt>
                  <dd className="font-medium text-white/65">{formatDuration(remaining)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/30">Member since</dt>
                  <dd className="font-medium text-white/65">
                    {user ? formatDate(user.joinedAt) : '—'}
                  </dd>
                </div>
              </dl>
            </Card>
            <InlineNotice tone="neutral" icon={Info}>
              Settings autosave after every change. Reset the sample workspace at any time from the
              Data & about tab.
            </InlineNotice>
          </div>
        </div>
      ) : null}

      {tab === 'studio' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" role="tabpanel" aria-label="Studio settings">
          <div className="space-y-4">
            <Card className="p-4 sm:p-5">
              <CardHeader
                title="Camera defaults"
                description="Applied the next time you enable the camera."
                icon={<ServerCog className="size-3.5" />}
              />
              <div className="mt-2 divide-y divide-white/[0.05]">
                <SettingRow
                  title="Mirror camera preview"
                  description="Reflect the source preview horizontally so framing feels like a mirror. Output is unaffected."
                  control={
                    <Switch
                      checked={settings.mirrorCamera}
                      onCheckedChange={(next) => updateSettings({ mirrorCamera: next })}
                      label="Mirror camera preview"
                    />
                  }
                />
                <SettingRow
                  title="Remember last camera"
                  description="Store the selected camera device on this device and preselect it next time."
                  control={
                    <Switch
                      checked={settings.rememberCamera}
                      onCheckedChange={(next) => updateSettings({ rememberCamera: next })}
                      label="Remember last camera"
                    />
                  }
                />
                <SettingRow
                  title="Estimate rate"
                  description="Default rate for live session metering (240 credits/min = 4 credits/sec)."
                  control={
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        max={600}
                        value={rateInput}
                        onChange={(event) => setRateInput(event.target.value)}
                        onBlur={commitRate}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                        }}
                        aria-label="Demo usage rate per minute"
                        className="h-8 w-[72px] text-right text-[11px] tabular-nums"
                      />
                      <span className="text-[10px] text-white/30">cr/min</span>
                    </div>
                  }
                />
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <CardHeader
                title="Session defaults"
                description="Prompt and preset are restored from your last studio session."
                icon={<Wand2 className="size-3.5" />}
              />
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/[0.12] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
                    Active prompt
                  </p>
                  <Badge tone="neutral">{studioDraft.prompt.length} characters</Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-[11.5px] leading-[1.6] text-white/45">
                  {studioDraft.prompt || 'No prompt saved.'}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => {
                    setStudioDraft({
                      prompt: DEFAULT_STUDIO_DRAFT.prompt,
                      presetId: DEFAULT_STUDIO_DRAFT.presetId,
                    });
                    updateSettings({
                      mirrorCamera: true,
                      rememberCamera: true,
                      usageRatePerMin: 12,
                    });
                    pushToast({
                      tone: 'success',
                      title: 'Studio defaults restored',
                      description: 'Prompt, preset, mirroring and demo rate were reset.',
                    });
                  }}
                >
                  Restore studio defaults
                </Button>
                <Link to="/studio">
                  <Button variant="ghost" size="sm">
                    Open Live Studio
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <InlineNotice tone="warning" icon={ShieldAlert} title="Estimates only">
              No renderer is attached. The demo rate changes time-left calculations and dry-run
              credit estimates, never a wallet balance.
            </InlineNotice>
            <Card className="p-4">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-white/28">
                Current estimate
              </p>
              <p className="mt-2 text-[22px] font-medium tracking-[-0.02em] text-white/88 tabular-nums">
                {formatDuration(remaining)}
              </p>
              <p className="mt-1 text-[10.5px] leading-[1.5] text-white/30">
                {formatCredits(wallet.balanceCredits)} credits ÷{' '}
                {settings.usageRatePerMin} credits per minute (4 credits/sec).
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'notifications' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" role="tabpanel" aria-label="Notification settings">
          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Notification preferences"
              description="Choose which events should notify you when delivery is available."
              icon={<BellRing className="size-3.5" />}
            />
            <div className="mt-2 divide-y divide-white/[0.05]">
              <SettingRow
                title="Session ended"
                description="A summary when a live session or dry run finishes."
                control={
                  <Switch
                    checked={settings.notifications.sessionEnded}
                    onCheckedChange={(next) => updateNotifications({ sessionEnded: next })}
                    label="Session ended notifications"
                  />
                }
              />
              <SettingRow
                title="Low balance"
                description="A reminder when your wallet balance drops below 5 minutes of live rendering."
                control={
                  <Switch
                    checked={settings.notifications.lowBalance}
                    onCheckedChange={(next) => updateNotifications({ lowBalance: next })}
                    label="Low balance notifications"
                  />
                }
              />
              <SettingRow
                title="Product updates"
                description="Occasional notes about new studio features and builds."
                control={
                  <Switch
                    checked={settings.notifications.productUpdates}
                    onCheckedChange={(next) => updateNotifications({ productUpdates: next })}
                    label="Product update notifications"
                  />
                }
              />
            </div>
          </Card>
          <div className="space-y-4">
            <InlineNotice tone="neutral" icon={BellRing} title="Delivery not connected">
              Preferences save locally, but no desktop notifications are sent in this build. A
              production app would request OS permission and deliver these through the desktop
              service.
            </InlineNotice>
            <Card className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
                Saved preferences
              </p>
              <ul className="mt-2.5 space-y-2 text-[11px]">
                {[
                  ['Session ended', settings.notifications.sessionEnded],
                  ['Low balance', settings.notifications.lowBalance],
                  ['Product updates', settings.notifications.productUpdates],
                ].map(([label, enabled]) => (
                  <li key={String(label)} className="flex items-center justify-between gap-3">
                    <span className="text-white/32">{label}</span>
                    <span className={enabled ? 'text-positive/75' : 'text-white/28'}>
                      {enabled ? 'On' : 'Off'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'data' ? (
        <div className="space-y-4" role="tabpanel" aria-label="Data and about">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <CardHeader
                title="Preview states"
                description="Temporary switches to review loading, error and disconnected UI."
                icon={<WifiOff className="size-3.5" />}
                action={<Badge tone="warning">Demo controls</Badge>}
              />
              <div className="mt-2 divide-y divide-white/[0.05]">
                <SettingRow
                  title="Simulate offline"
                  description="Shows the global disconnect banner and stops the active dry run. Reconnect works from the banner."
                  control={
                    <Switch
                      checked={settings.simulateOffline}
                      onCheckedChange={handleOfflineToggle}
                      label="Simulate offline mode"
                    />
                  }
                />
                <SettingRow
                  title="Simulate data errors"
                  description="Makes Session history and Transactions load into their retryable error state."
                  control={
                    <Switch
                      checked={settings.simulateDataError}
                      onCheckedChange={(next) => updateSettings({ simulateDataError: next })}
                      label="Simulate data loading errors"
                    />
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/transactions">
                  <Button size="sm" variant="secondary">
                    View transactions states
                  </Button>
                </Link>
                <Link to="/sessions">
                  <Button size="sm" variant="ghost">
                    View session states
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <CardHeader
                title="Local data"
                description="Everything in this workspace is stored in this browser profile."
                icon={<Database className="size-3.5" />}
              />
              <div className="mt-4 space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/30">Session records</span>
                  <span className="tabular-nums text-white/65">{sessions.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/30">Transactions</span>
                  <span className="tabular-nums text-white/65">{transactions.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/30">Storage</span>
                  <span className="text-white/65">Local browser storage</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/30">Video / audio</span>
                  <span className="text-white/65">Not stored</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={Download} onClick={handleExport}>
                  Export JSON
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={RotateCcw}
                  onClick={() => setResetOpen(true)}
                >
                  Reset demo data
                </Button>
              </div>
            </Card>
          </div>

          <Card className="p-4 sm:p-5">
            <CardHeader
              title="About this build"
              description="Dallr Studio is an interface preview for a Decart Lucy 2.5 workflow."
              icon={<Info className="size-3.5" />}
              action={<Badge tone="accent">v0.1.0</Badge>}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Interface', value: 'React + Tauri 2 shell', icon: Laptop },
                { label: 'Runtime', value: runningInDesktop ? 'Tauri desktop webview' : 'Browser preview', icon: MonitorCog },
                { label: 'Renderer', value: 'Not connected', icon: Sparkles },
                { label: 'Payments', value: 'Not implemented', icon: ShieldAlert },
                { label: 'Auth', value: 'Local simulation', icon: Settings2 },
                { label: 'Sample data', value: 'Fictional · local only', icon: Database },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">
                  <div className="flex items-center gap-1.5 text-white/28">
                    <item.icon className="size-3" aria-hidden="true" />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.13em]">{item.label}</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] font-medium text-white/62">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10.5px] leading-[1.6] text-white/26">
              Connected to Decart Lucy 2.5 realtime video foundation model with 4 credits per second metered deduction.
            </p>
          </Card>
        </div>
      ) : null}

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset workspace settings?"
        description="This restores studio preferences and default settings."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={RotateCcw} onClick={handleReset}>
              Reset settings
            </Button>
          </>
        }
      >
        <InlineNotice tone="warning" icon={ShieldAlert} title="Workspace preferences will be reset">
          Session history and your wallet credits will remain saved, while camera and prompt configurations will reset to default.
        </InlineNotice>
      </Modal>
    </div>
  );
}
