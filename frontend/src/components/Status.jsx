import { useI18n } from '../i18n/index.jsx';

/** Shows "Loading…" or an error with a retry button; renders children when data is ready. */
export default function Status({ loading, error, retry, children }) {
  const { t } = useI18n();
  if (loading) return <p className="status">{t('common.loading')}</p>;
  if (error) {
    return (
      <div className="status status-error">
        <p>{t('common.error')}</p>
        <button type="button" className="button" onClick={retry}>{t('common.retry')}</button>
      </div>
    );
  }
  return children;
}
