import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { usePageTitle } from '../title.js';

export default function NotFound() {
  const { t } = useI18n();
  usePageTitle(t('common.notFound'));
  return (
    <section className="page">
      <h1 className="page-title">{t('common.notFound')}</h1>
      <Link to="/" className="button">{t('common.backHome')}</Link>
    </section>
  );
}
