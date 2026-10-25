import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  PencilLine,
  Settings2,
  UserRound,
} from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { formatCredits, formatDuration } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { CopyButton } from '@/components/ui/CopyButton';
import { Stat } from '@/components/ui/Progress';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Profile() {
  const { user, sessions, wallet, updateUser, signOut } = useApp();
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

      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="overflow-hidden">
          <div className="relative h-[80px] overflow-hidden border-b border-white/[0.055]">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgb(var(--accent)/0.16),rgba(90,160,170,0.06)_45%,transparent_80%)]" />
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-7 flex flex-wrap items-end justify-between gap-3">
              <Avatar name={user.name} size="xl" className="ring-4 ring-ink-850" />
              <Badge tone="neutral">{user.plan}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-medium tracking-[-0.02em] text-white/92">{user.name}</h2>
                <p className="mt-0.5 text-[12px] text-white/38">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={PencilLine} onClick={openEdit}>
                  Edit profile
                </Button>
                <Button size="sm" variant="ghost" icon={LogOut} onClick={() => setSignOutOpen(true)}>
                  Sign out
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
              <Stat label="Sessions" value={String(sessions.length)} />
              <Stat label="Studio time" value={formatDuration(totalDuration)} />
              <Stat label="Credits used" value={`${formatCredits(Math.round(totalCredits))} cr`} />
              <Stat label="Balance" value={`${formatCredits(wallet.balanceCredits)} cr`} />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <CardHeader
            title="Account details"
            icon={<UserRound className="size-3.5" />}
          />
          <dl className="mt-4 space-y-0 divide-y divide-white/[0.05]">
            {[
              { label: 'User ID', value: user.id, copy: true },
              { label: 'Workspace ID', value: user.workspaceId, copy: true },
              { label: 'Email', value: user.email, copy: false },
              { label: 'Plan', value: user.plan, copy: false },
            ].map((row) => (
              <div key={row.label} className="density-row flex items-center justify-between gap-4 py-2.5">
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
        </div>
      </Modal>

      <Modal
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out of Dallr?"
        description="Are you sure you want to sign out?"
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
        <p className="text-[12px] leading-[1.6] text-white/50">
          You will return to the sign-in screen.
        </p>
      </Modal>
    </div>
  );
}
