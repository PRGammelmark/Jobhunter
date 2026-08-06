import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { api } from '../services/api';
import PageBreadcrumbs from '../components/layout/PageBreadcrumbs';
import { useLocale } from '../i18n';
import { Alert, Button, Card, Field, FilterChip, Input, PageHeader, Textarea } from '../ui';

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [tab, setTab] = useState(0);
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const app = await api.createApplication(
        tab === 0 ? { url } : { manualText, companyName, title }
      );
      navigate(`/applications/${app._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('newApplication.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageBreadcrumbs
        items={[
          { label: t('nav.pipeline'), to: '/pipeline' },
          { label: t('newApplication.title') },
        ]}
      />
      <PageHeader title={t('newApplication.title')} />

      <div className="mb-4 flex gap-2">
        <FilterChip active={tab === 0} onClick={() => setTab(0)}>
          {t('newApplication.tabLink')}
        </FilterChip>
        <FilterChip active={tab === 1} onClick={() => setTab(1)}>
          {t('newApplication.tabManual')}
        </FilterChip>
      </div>

      <Card className="mb-4">
        {tab === 0 ? (
          <Field label={t('newApplication.jobLink')}>
            <Input
              placeholder="https://www.jobindex.dk/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label={t('newApplication.jobTitle')}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={t('newApplication.company')}>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
            <Field label={t('newApplication.jobText')}>
              <Textarea
                rows={8}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Card>

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Button
        fullWidth
        size="lg"
        disabled={loading || (tab === 0 ? !url : !manualText)}
        onClick={handleSubmit}
        leftIcon={loading ? <LoaderCircle size={18} className="animate-spin" /> : undefined}
      >
        {loading ? t('newApplication.creating') : t('newApplication.create')}
      </Button>
    </div>
  );
}
