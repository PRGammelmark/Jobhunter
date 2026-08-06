import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';
import { useLocale } from '../i18n';
import { Alert, BrandMark, Button, Card, Field, Input } from '../ui';

export default function SetupPage() {
  const { user, loading, setupRequired, setup } = useAuth();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !setupRequired) {
    return <Navigate to={user ? '/' : '/login'} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('setup.passwordTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      await setup(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#ffe5d8_0%,_#f4f5f7_45%,_#f4f5f7_100%)] px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-[440px] p-6 sm:p-8" padding="none">
        <BrandMark className="mb-5" />
        <h1 className="text-xl font-bold text-ink">{t('setup.title')}</h1>
        <p className="mb-6 mt-1 text-sm text-ink-secondary">{t('setup.subtitle')}</p>
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t('setup.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label={t('setup.email')}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label={t('setup.password')} hint={t('setup.passwordHelp')}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" fullWidth disabled={submitting || loading}>
            {submitting ? t('setup.submitting') : t('setup.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
