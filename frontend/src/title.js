// The name shown in the browser tab and in Google results, e.g. "Rally Japan 2026 · Rally".
import { useEffect } from 'react';
import { useI18n } from './i18n/index.jsx';

/** `page` = this page's name; '' = the home page; null = leave the title alone (e.g. a "not found" page sets its own). */
export function usePageTitle(page) {
  const { t } = useI18n();
  const name = t('site.name');
  const title = page === null ? null : page ? `${page} · ${name}` : `${name} – ${t('site.tagline')}`;
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
