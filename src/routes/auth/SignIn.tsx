import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { PasswordField } from '@/components/auth/PasswordField';

const DEMO_EMAIL = 'ada@dallr.studio';
const DEMO_PASSWORD = 'dallr-demo';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignIn() {
  const { user, signIn } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  if (user) {
    return <Navigate to="/studio" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!emailPattern.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 6) nextErrors.password = 'Use at least 6 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      pushToast({
        tone: 'success',
        title: 'Signed in',
        description: 'Demo authentication only — no credentials were verified.',
      });
      navigate('/studio', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrors({});
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your studio"
      description="Continue to the Dallr workspace. This preview uses a local demo account and does not verify credentials."
      footer={
        <span>
          New to Dallr?{' '}
          <Link
            to="/register"
            className="font-medium text-white/70 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <FormField label="Email" htmlFor="signin-email" error={errors.email}>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/25"
              aria-hidden="true"
            />
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
              }}
              invalid={Boolean(errors.email)}
              autoComplete="email"
              placeholder="you@studio.com"
              className="pl-8"
            />
          </div>
        </FormField>

        <FormField
          label="Password"
          htmlFor="signin-password"
          error={errors.password}
          action={
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-[10.5px] font-medium text-white/32 transition hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Forgot password?
            </button>
          }
        >
          <PasswordField
            id="signin-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
            invalid={Boolean(errors.password)}
            autoComplete="current-password"
            placeholder="At least 6 characters"
          />
        </FormField>

        <Button type="submit" variant="primary" className="mt-1 w-full" loading={loading} iconRight={ArrowRight}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <button
        type="button"
        onClick={fillDemo}
        className="mt-2 w-full rounded-lg border border-dashed border-white/[0.09] bg-white/[0.015] px-3 py-2 text-left transition hover:border-white/[0.15] hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span className="flex items-center gap-2 text-[10.5px] font-medium text-white/55">
          <Sparkles className="size-3 text-accent/70" aria-hidden="true" />
          Use demo account
        </span>
        <span className="mt-0.5 block font-mono text-[9.5px] text-white/25">
          {DEMO_EMAIL} · {DEMO_PASSWORD}
        </span>
      </button>

      <div className="mt-4">
        <InlineNotice tone="neutral" icon={ShieldCheck} title="Demo authentication">
          Any valid-looking email and 6+ character password will sign in. The form is not connected
          to an auth service, and no password is stored or transmitted.
        </InlineNotice>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-white/20">
        <KeyRound className="size-2.5" aria-hidden="true" />
        Local preview session · resets from Settings
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Password reset unavailable"
        description="Recovery requires the account service."
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setForgotOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <InlineNotice tone="warning" icon={KeyRound} title="Not implemented in this build">
            Dallr has no account backend, email delivery or password store. Use the demo account
            button on the sign-in form to continue.
          </InlineNotice>
          <p className="text-[11px] leading-[1.6] text-white/32">
            In production this flow would send a time-limited reset link to the verified account
            email.
          </p>
        </div>
      </Modal>
    </AuthLayout>
  );
}
