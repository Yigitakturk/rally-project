import { Link } from 'react-router-dom';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';

// For now the home page only proves the website can reach the API.
// The full home page (countdown, top 3) is built in step 7.
export default function Home() {
  const { t, locale } = useI18n();
  const { data, error, loading, retry } = useApi('/home');
  const date = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  return (
    <section className="page">
      <p className="eyebrow">{t('site.tagline')}</p>
      <Status loading={loading} error={error} retry={retry}>
        <div className="cards">
          {data?.nextRally && (
            <Link to={`/rallies/${data.nextRally.id}`} className="card card-accent">
              <span className="card-label">{t('home.nextRally')}</span>
              <span className="card-title">{data.nextRally.name}</span>
              <span className="muted">{date(data.nextRally.startDate)} · {data.nextRally.country}</span>
            </Link>
          )}
          {data?.latestRally?.winner && (
            <Link to={`/rallies/${data.latestRally.id}`} className="card">
              <span className="card-label">{t('home.latestWinner')}</span>
              <span className="card-title">{data.latestRally.winner.driver?.name}</span>
              <span className="muted">{data.latestRally.name} · {date(data.latestRally.endDate)}</span>
            </Link>
          )}
        </div>
      </Status>
    </section>
  );
}
