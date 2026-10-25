import { useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { PasswordField } from '@/components/auth/PasswordField';
import { cn } from '@/lib/utils';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export function Register() {
  const { user, register } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);

  if (user) {
    return <Navigate to="/studio" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) nextErrors.name = 'Enter your full name.';
    if (!emailPattern.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (confirm !== password) nextErrors.confirm = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      pushToast({
        tone: 'success',
        title: 'Account created',
      });
      navigate('/studio', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const clearError = (key: keyof typeof errors) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Start your studio"
      description="Create your account to start streaming."
      footer={
        <span>
          Already have an account?{' '}
          <Link
            to="/sign-in"
            className="font-medium text-white/70 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <FormField label="Full name" htmlFor="register-name" error={errors.name}>
          <Input
            id="register-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
            invalid={Boolean(errors.name)}
            autoComplete="name"
            placeholder="Ada Okafor"
          />
        </FormField>

        <FormField label="Email" htmlFor="register-email" error={errors.email}>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
            invalid={Boolean(errors.email)}
            autoComplete="email"
            placeholder="you@studio.com"
          />
        </FormField>

        <FormField label="Password" htmlFor="register-password" error={errors.password}>
          <PasswordField
            id="register-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              clearError('password');
            }}
            invalid={Boolean(errors.password)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          {password ? (
            <div className="mt-1.5">
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      score >= step
                        ? score >= 3
                          ? 'bg-positive/70'
                          : score === 2
                            ? 'bg-warning/70'
                            : 'bg-negative/70'
                        : 'bg-white/[0.07]',
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-[9.5px] text-white/28">
                Password strength: {strengthLabels[score] ?? 'Weak'}
              </p>
            </div>
          ) : null}
        </FormField>

        <FormField label="Confirm password" htmlFor="register-confirm" error={errors.confirm}>
          <PasswordField
            id="register-confirm"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              clearError('confirm');
            }}
            invalid={Boolean(errors.confirm)}
            autoComplete="new-password"
            placeholder="Repeat password"
          />
        </FormField>

        <Button type="submit" variant="primary" className="mt-2 w-full" loading={loading} iconRight={ArrowRight}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
