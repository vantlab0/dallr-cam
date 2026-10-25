import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  Check,
  Database,
  Download,
  Info,
  Monitor,
  MonitorCog,
  Palette,
  RotateCcw,
  ServerCog,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { AccentTheme } from '@/types';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { downloadTextFile } from '@/lib/download';
import { isDesktopRuntime } from '@/lib/environment';
import { DownloadAppModal } from '@/components/desktop/DownloadAppModal';
import {
  formatCredits,
  formatDate,
  formatDuration,
} from '@/lib/format';
import { estimatedSecondsRemaining } from '@/lib/credits';
import { DEFAULT_STUDIO_DRAFT } from '@/lib/defaults';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, Divider } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Switch } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { cn } from '@/lib/utils';
import {
  DECART_API_KEY_STORAGE,
  DECART_TOKEN_ENDPOINT_STORAGE,
} from '@/services/decart/credentials';

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
  } = useApp();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [rateInput, setRateInput] = useState(String(settings.usageRatePerMin));
  const [resetOpen, setResetOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const runningInDesktop = isDesktopRuntime();

  const [apiKeyInput, setApiKeyInput] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(DECART_API_KEY_STORAGE) || '';
      }
    } catch {}
    return '';
  });
  const [endpointInput, setEndpointInput] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(DECART_TOKEN_ENDPOINT_STORAGE) || '';
      }
    } catch {}
    return '';
  });

  const saveDecartConfig = () => {
    try {
      if (typeof window !== 'undefined') {
        if (apiKeyInput.trim()) {
          window.localStorage.setItem(DECART_API_KEY_STORAGE, apiKeyInput.trim());
        } else {
          window.localStorage.removeItem(DECART_API_KEY_STORAGE);
        }
        if (endpointInput.trim()) {
          window.localStorage.setItem(DECART_TOKEN_ENDPOINT_STORAGE, endpointInput.trim());
        } else {
          window.localStorage.removeItem(DECART_TOKEN_ENDPOINT_STORAGE);
        }
      }
      pushToast({
        tone: 'success',
        title: 'Credentials saved',
        description: 'Decart connection credentials saved to your browser.',
      });
    } catch {
      pushToast({
        tone: 'error',
        title: 'Storage error',
        description: 'Failed to save credentials to browser storage.',
      });
    }
  };

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
      title: 'Workspace reset',
      description: 'Wallet, sessions, transactions and settings were restored to defaults.',
    });
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
                        aria-label="Usage rate per minute"
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
                      description: 'Prompt, preset, mirroring and rate were reset.',
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
            <Card className="p-4">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-white/28">
                Current estimate
              </p>
              <p className="mt-2 text-[22px] font-medium tracking-[-0.02em] text-white/88 tabular-nums">
                {formatDuration(remaining)}
              </p>
              <p className="mt-1 text-[10.5px] leading-[1.5] text-white/30">
                {formatCredits(wallet.balanceCredits)} credits ÷{' '}
                {settings.usageRatePerMin} credits per minute.
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
        <div className="space-y-4" role="tabpanel" aria-label="Data and credentials">
          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Decart credentials"
              description="Configure your Decart API key or client token to connect live to Lucy 2.5."
              icon={<ServerCog className="size-3.5" />}
            />
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-white/70">
                  Decart API Key or Client Token
                </label>
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Decart API Key (or client token)"
                  className="mt-1 text-[11px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-white/70">
                  Custom Token Minting Endpoint (optional)
                </label>
                <Input
                  type="url"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="https://your-service.com/api/realtime-token"
                  className="mt-1 text-[11px]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="primary" onClick={saveDecartConfig}>
                  Save credentials
                </Button>
                {(apiKeyInput || endpointInput) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setApiKeyInput('');
                      setEndpointInput('');
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem(DECART_API_KEY_STORAGE);
                        window.localStorage.removeItem(DECART_TOKEN_ENDPOINT_STORAGE);
                      }
                      pushToast({
                        tone: 'info',
                        title: 'Credentials cleared',
                        description: 'Removed saved credentials from browser storage.',
                      });
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Workspace data"
              description="Manage your local workspace storage."
              icon={<Database className="size-3.5" />}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={Download} onClick={handleExport}>
                Export workspace JSON
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={RotateCcw}
                onClick={() => setResetOpen(true)}
              >
                Reset workspace
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Desktop applications"
              description="Download standalone installers for Windows and macOS with direct virtual camera exposure."
              icon={<Monitor className="size-3.5" />}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                icon={Download}
                onClick={() => setDownloadModalOpen(true)}
              >
                Download for Windows & macOS
              </Button>
            </div>
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
        <p className="text-xs leading-relaxed text-white/60">
          Session history and your wallet credits will remain saved, while camera and prompt configurations will reset to default.
        </p>
      </Modal>

      <DownloadAppModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </div>
  );
}
