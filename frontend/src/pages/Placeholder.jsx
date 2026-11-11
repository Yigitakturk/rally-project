import { useI18n } from '../i18n/index.jsx';

/** Temporary page used until the real page is built in a later step. */
export default function Placeholder({ titleKey }) {
  const { t } = useI18n();
  return (
    <section className="page">
      <h1 className="page-title">{t(titleKey)}</h1>
      <p className="muted">{t('common.comingSoon')}</p>
    </section>
  );
}
