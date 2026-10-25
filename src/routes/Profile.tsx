import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarDays,
  Copy,
  CreditCard,
  ExternalLink,
  Fingerprint,
  LogOut,
  PencilLine,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { formatCredits, formatDate, formatDuration } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, Divider } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { CopyButton } from '@/components/ui/CopyButton';
import { Stat } from '@/components/ui/Progress';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Profile() {
  const { user, sessions, wallet, settings, updateUser, signOut } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  if (!user) return null;

  const totalDuration = sessions.reduce((sum, session) => sum + session.durationSec, 0);
  const totalCredits = sessions.reduce((sum, session) => sum + session.creditsUsed, 0);
  const accentLabel =
    settings.accent === 'aurora' ? 'Aurora' : settings.accent === 'citrine' ? 'Citrine' : 'Rose';

  const openEdit = () => {
    setName(user.name);
    setEmail(user.email);
    setErrors({});
    setEditOpen(true);
  };

  const handleSave = () => {
    const nextErrors: { name?: string; email?: string } = {};
    if (name.trim().length < 2) nextErrors.name = 'Enter at least 2 characters.';
    if (!emailPattern.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateUser({ name: name.trim(), email: email.trim() });
    setEditOpen(false);
    pushToast({
      tone: 'success',
      title: 'Profile updated',
      description: 'Changes are stored on this device only.',
    });
  };

  const handleSignOut = () => {
    setSignOutOpen(false);
    signOut();
    navigate('/sign-in');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your creator identity, workspace details and plan."
        actions={
          <>
            <Button variant="secondary" icon={Settings2} onClick={() => navigate('/settings')}>
              Settings
            </Button>
            <Button variant="primary" icon={PencilLine} onClick={openEdit}>
              Edit profile
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="relative h-[92px] overflow-hidden border-b border-white/[0.055]">
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgb(var(--accent)/0.16),rgba(90,160,170,0.06)_45%,transparent_80%)]" />
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.35)_0.6px,transparent_0.6px)] [background-size:6px_6px] [mask-image:linear-gradient(90deg,black,transparent)]" />
              <div className="absolute -bottom-16 right-[8%] size-40 rounded-full bg-accent/[0.08] blur-2xl" />
            </div>

            <div className="px-5 pb-5">
              <div className="-mt-7 flex flex-wrap items-end justify-between gap-3">
                <Avatar name={user.name} size="xl" className="ring-4 ring-ink-850" />
                <div className="flex items-center gap-2 pb-1">
                  <Badge tone="accent" dot>
                    Demo account
                  </Badge>
                  <Badge tone="neutral">{user.plan}</Badge>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-medium tracking-[-0.02em] text-white/92">{user.name}</h2>
                  <p className="mt-0.5 text-[12px] text-white/38">{user.email}</p>
                </div>
                <Button size="sm" variant="ghost" icon={PencilLine} onClick={openEdit}>
                  Edit
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-white/30">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3" aria-hidden="true" />
                  Joined {formatDate(user.joinedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Fingerprint className="size-3" aria-hidden="true" />
                  Local identity
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-3 text-accent/60" aria-hidden="true" />
                  Preview build
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
                <Stat label="Sessions" value={String(sessions.length)} detail="Local records" />
                <Stat label="Studio time" value={formatDuration(totalDuration)} detail="All records" />
                <Stat label="Est. credits" value={formatCredits(Math.round(totalCredits))} detail="Never billed" />
                <Stat label="Balance" value={`${formatCredits(wallet.balanceCredits)} cr`} detail="Sample credit" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Account details"
              description="Identifiers are generated locally for this preview."
              icon={<UserRound className="size-3.5" />}
              action={
                <Badge tone="neutral" icon={<Copy className="size-2.5" />}>
                  Copyable
                </Badge>
              }
            />
            <dl className="mt-4 space-y-0 divide-y divide-white/[0.05]">
              {[
                { label: 'User ID', value: user.id, copy: true },
                { label: 'Workspace ID', value: user.workspaceId, copy: true },
                { label: 'Email', value: user.email, copy: false },
                { label: 'Plan', value: user.plan, copy: false },
                { label: 'Account type', value: 'Local demo · no auth service', copy: false },
              ].map((row) => (
                <div key={row.label} className="density-row flex items-center justify-between gap-4">
                  <dt className="shrink-0 text-[11px] text-white/32">{row.label}</dt>
                  <dd className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-[10.5px] text-white/60">{row.value}</span>
                    {row.copy ? (
                      <CopyButton value={row.value} label="" toastTitle={`${row.label} copied`} />
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Security"
              description="Signing out clears the local preview session. Workspace data remains on this device."
              icon={<LogOut className="size-3.5" />}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/[0.1] px-3.5 py-3">
              <div>
                <p className="text-[11.5px] font-medium text-white/65">Sign out of Dallr</p>
                <p className="mt-0.5 text-[10px] text-white/28">
                  You can sign back in with the demo account at any time.
                </p>
              </div>
              <Button variant="secondary" icon={LogOut} onClick={() => setSignOutOpen(true)}>
                Sign out
              </Button>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/28">Current plan</p>
                <p className="mt-1.5 text-[17px] font-medium tracking-[-0.02em] text-white/88">{user.plan}</p>
              </div>
              <span className="grid size-9 place-items-center rounded-xl border border-accent/15 bg-accent/[0.06] text-accent/80">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-[1.55] text-white/45">
              Full access to Dallr Studio with live Decart Lucy 2.5 streaming and wallet management.
            </p>
            <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-3.5">
              {[
                'Live Lucy 2.5 studio rendering (720p 30fps)',
                'Image reference target upload',
                'Live credit billing (4 credits/sec)',
                'Instant wallet top-up and ledger tracking',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[11px] text-white/50">
                  <span className="size-1 rounded-full bg-accent/60" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <IngressLink />
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Appearance"
              description="Saved preferences for this workspace."
              action={
                <Link
                  to="/settings"
                  className="text-[10px] font-medium text-accent/65 transition hover:text-accent"
                >
                  Edit
                </Link>
              }
            />
            <div className="mt-3 space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-white/32">Accent</span>
                <span className="flex items-center gap-1.5 text-white/65">
                  <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                  {accentLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/32">Reduced motion</span>
                <span className="text-white/65">{settings.reduceMotion ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/32">Density</span>
                <span className="text-white/65">{settings.compact ? 'Compact' : 'Comfortable'}</span>
              </div>
            </div>
          </Card>

          <InlineNotice tone="neutral" icon={CreditCard} title="Local demo account">
            Authentication is simulated. No password, email or payment data is validated or sent
            anywhere. Sign in again with the demo credentials to return.
          </InlineNotice>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        description="Update the local display identity for this preview."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <FormField label="Full name" htmlFor="profile-name" error={errors.name}>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              invalid={Boolean(errors.name)}
              autoComplete="name"
            />
          </FormField>
          <FormField label="Email" htmlFor="profile-email" error={errors.email}>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(errors.email)}
              autoComplete="email"
            />
          </FormField>
          <Divider />
          <p className="text-[10.5px] leading-[1.55] text-white/28">
            These details are stored in this browser profile only. Changing them does not create an
            account or migrate workspace data.
          </p>
        </div>
      </Modal>

      <Modal
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out of Dallr?"
        description="The demo workspace data stays on this device."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={LogOut} onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        }
      >
        <p className="text-[12px] leading-[1.6] text-white/45">
          You will return to the sign-in screen. No session, wallet or settings data is deleted.
        </p>
      </Modal>
    </div>
  );
}

function IngressLink() {
  return (
    <Link to="/wallet" className="mt-4 block">
      <Button variant="secondary" size="sm" className="w-full" iconRight={ExternalLink}>
        View wallet
      </Button>
    </Link>
  );
}
