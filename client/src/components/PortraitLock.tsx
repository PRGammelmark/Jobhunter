import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useLocale } from '../i18n';

const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 560px)';

function tryLockPortrait() {
  const orientation = window.screen?.orientation;
  if (!orientation || typeof orientation.lock !== 'function') return;
  void orientation.lock('portrait').catch(() => {
    /* Browsers only allow this in installed PWAs / fullscreen — ignore failures. */
  });
}

export default function PortraitLock() {
  const { t } = useLocale();
  const [blocked, setBlocked] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(LANDSCAPE_QUERY).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_QUERY);
    const onChange = () => setBlocked(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);

    tryLockPortrait();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryLockPortrait();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mq.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!blocked) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-5 bg-canvas px-8 text-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="portrait-lock-title"
      aria-describedby="portrait-lock-body"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-brand-soft text-brand">
        <Smartphone size={32} strokeWidth={2} className="portrait-tilt" />
      </div>
      <div className="max-w-xs">
        <h1 id="portrait-lock-title" className="text-xl font-bold tracking-tight text-ink">
          {t('pwa.portraitTitle')}
        </h1>
        <p id="portrait-lock-body" className="mt-2 text-[15px] leading-relaxed text-ink-secondary">
          {t('pwa.portraitBody')}
        </p>
      </div>
    </div>
  );
}
