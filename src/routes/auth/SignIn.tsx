import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { PasswordField } from '@/components/auth/PasswordField';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignIn() {
  const { user, signIn } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      });
      navigate('/studio', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your studio"
      description="Continue to the Dallr workspace."
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



      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset password"
        description="Password recovery instructions."
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setForgotOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-white/50">
            Enter your account email to receive a password reset link.
          </p>
        </div>
      </Modal>
    </AuthLayout>
  );
}
