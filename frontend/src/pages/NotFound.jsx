import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="page">
      <h1 className="page-title">{t('common.notFound')}</h1>
      <Link to="/" className="button">{t('common.backHome')}</Link>
    </section>
  );
}
