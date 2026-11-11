import { Link, Navigate, useParams } from 'react-router-dom';
import { Tv } from 'lucide-react';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import NotFound from './NotFound.jsx';
import { Country, SurfaceBadge } from '../components/bits.jsx';
import { dateRange, formatKm, rallyState } from '../format.js';

const WATCH_URL = 'https://www.rally.tv';

/** /calendar without a year opens the season of the next rally. */
export function CalendarRedirect() {
  const { data, error, loading, retry } = useApi('/home');
  const year = data?.nextRally?.season ?? data?.latestRally?.season ?? new Date().getFullYear();
  return (
    <Status loading={loading} error={error} retry={retry}>
      {data && <Navigate to={`/calendar/${year}`} replace />}
    </Status>
  );
}

function SeasonPicker({ current, base = '/calendar' }) {
  const { t } = useI18n();
  const { data } = useApi('/seasons');
  if (!data) return null;
  return (
    <nav className="season-picker" aria-label={t('calendar.season')}>
      {data.items.map((s) => (
        <Link key={s.year} to={`${base}/${s.year}`} className={s.year === current ? 'active' : ''} aria-current={s.year === current ? 'page' : undefined}>
          {s.year}
        </Link>
      ))}
    </nav>
  );
}
export { SeasonPicker };

function RallyCard({ rally, state, isNext }) {
  const { t, locale } = useI18n();
  const label = isNext ? t('calendar.next') : t(`calendar.${state}`);
  return (
    <li className={`round round-${state} ${isNext ? 'round-next' : ''}`}>
      <Link to={`/rallies/${rally.id}`} className="round-link">
        <div className="round-number" aria-hidden="true">{String(rally.round).padStart(2, '0')}</div>
        <div className="round-body">
          <div className="round-top">
            <span className="round-dates">{dateRange(rally.startDate, rally.endDate, locale)}</span>
            <span className={`state state-${isNext ? 'next' : state}`}>{label}</span>
          </div>
          <h2 className="round-name">{rally.name}</h2>
          <div className="round-meta">
            <Country name={rally.country} />
            <SurfaceBadge surface={rally.surface} />
            {rally.stages && <span className="muted">{t('calendar.stages', { n: rally.stages })}</span>}
            {rally.distanceKm && <span className="muted">{formatKm(rally.distanceKm, locale)}</span>}
          </div>
          {rally.winner?.driver && (
            <div className="round-winner">
              <span className="muted">{t('calendar.winner')}:</span> <strong>{rally.winner.driver.name}</strong>
              {rally.winner.codriver && <span className="muted"> / {rally.winner.codriver.name}</span>}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function Calendar() {
  const { year } = useParams();
  const { t } = useI18n();
  const { data, error, loading, retry } = useApi(`/seasons/${year}`);
  const calendar = data?.calendar ?? [];
  const nextId = calendar.find((r) => rallyState(r) !== 'done')?.id;
  if (error?.status === 404) return <NotFound />;

  return (
    <section className="page">
      <div className="page-head">
        <h1 className="page-title">{t('calendar.title', { year })}</h1>
        <a className="button button-ghost" href={WATCH_URL} target="_blank" rel="noreferrer">
          <Tv size={16} aria-hidden="true" /> {t('calendar.watch')}
        </a>
      </div>
      <SeasonPicker current={Number(year)} />
      <Status loading={loading} error={error} retry={retry}>
        {calendar.length === 0 ? (
          <p className="muted">{t('calendar.noRallies')}</p>
        ) : (
          <>
            <p className="muted">{t('calendar.rounds', { n: calendar.length })}</p>
            <ol className="rounds">
              {calendar.map((r) => (
                <RallyCard key={r.id} rally={r} state={rallyState(r)} isNext={r.id === nextId} />
              ))}
            </ol>
          </>
        )}
      </Status>
    </section>
  );
}
