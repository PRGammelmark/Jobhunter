import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';
import { useLocale } from '../i18n';
import { Alert, BrandMark, Button, Card, Field, Input } from '../ui';

export default function LoginPage() {
  const { user, loading, setupRequired, login } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && setupRequired) return <Navigate to="/setup" replace />;
  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#ffe5d8_0%,_#f4f5f7_45%,_#f4f5f7_100%)] px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-[420px] p-6 sm:p-8" padding="none">
        <BrandMark className="mb-5" />
        <p className="mb-6 text-sm text-ink-secondary">{t('login.subtitle')}</p>
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t('login.email')}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label={t('login.password')}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" fullWidth disabled={submitting || loading}>
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
        <p className="mt-4 text-xs text-ink-secondary">{t('login.noAccount')}</p>
      </Card>
    </div>
  );
}
