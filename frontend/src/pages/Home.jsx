import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ExternalLink, History as HistoryIcon, Trophy, Tv, Users, Car } from 'lucide-react';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { usePageTitle } from '../title.js';
import { Country, PersonLink, SurfaceBadge } from '../components/bits.jsx';
import { dateRange, formatKm, rallyState, shortDate, today } from '../format.js';

const WATCH_URL = 'https://www.rally.tv';
const LIVE_URL = 'https://www.wrc.com';

/** Time left until the start day of the rally (midnight, visitor's time). Updates every minute. */
function useCountdown(isoDate) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  if (!isoDate) return null;
  const ms = new Date(`${isoDate}T00:00:00`).getTime() - now;
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}

function Countdown({ date }) {
  const { t } = useI18n();
  const left = useCountdown(date);
  if (!left) return null;
  const parts = [
    [left.days, left.days === 1 ? t('home.day1') : t('home.days')],
    [left.hours, left.hours === 1 ? t('home.hour1') : t('home.hours')],
    [left.minutes, t('home.minutes')],
  ];
  return (
    <div className="countdown" aria-label={`${t('home.startsIn')}: ${parts.map(([n, l]) => `${n} ${l}`).join(', ')}`}>
      <span className="countdown-label">{t('home.startsIn')}</span>
      <div className="countdown-parts" aria-hidden="true">
        {parts.map(([n, label]) => (
          <div key={label} className="countdown-part">
            <span className="countdown-num">{String(n).padStart(2, '0')}</span>
            <span className="countdown-unit">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextRally({ rally, latestSeason }) {
  const { t, locale } = useI18n();
  const live = rallyState(rally) === 'live';
  return (
    <div className="hero">
      <p className="eyebrow">
        {live ? <span className="live-dot">{t('home.liveNow')}</span> : t('home.nextRally')}
        {' · '}{t('home.round', { n: rally.round, year: rally.season })}
      </p>
      <h1 className="hero-title" lang="">{rally.name}</h1>
      <div className="round-meta hero-meta">
        <span>{dateRange(rally.startDate, rally.endDate, locale)}</span>
        <Country name={rally.country} />
        <SurfaceBadge surface={rally.surface} />
        {rally.distanceKm && <span className="muted">{formatKm(rally.distanceKm, locale)}</span>}
      </div>
      {!live && <Countdown date={rally.startDate} />}
      {latestSeason && latestSeason < rally.season && !live && (
        <p className="muted small">{t('home.seasonOver', { year: latestSeason, rally: rally.name })}</p>
      )}
      <div className="link-row">
        <Link to={`/rallies/${rally.id}`} className="button">{t('home.details')} <ArrowRight size={16} aria-hidden="true" /></Link>
        {live && <a href={LIVE_URL} className="button button-ghost" target="_blank" rel="noreferrer">{t('home.live')} <ExternalLink size={14} aria-hidden="true" /></a>}
        <a href={WATCH_URL} className="button button-ghost" target="_blank" rel="noreferrer"><Tv size={16} aria-hidden="true" /> {t('home.watch')}</a>
      </div>
    </div>
  );
}

function LatestWinner({ rally }) {
  const { t, locale } = useI18n();
  const w = rally.winner;
  return (
    <Link to={`/rallies/${rally.id}`} className="card card-accent">
      <span className="card-label"><Trophy size={14} aria-hidden="true" /> {t('home.latestWinner')}</span>
      <span className="card-title" lang="">{w.driver?.name}</span>
      <span className="muted">{w.codriver?.name} · {w.car?.name}</span>
      <span className="muted small">{t('home.won', { rally: rally.name })} · {dateRange(rally.startDate, rally.endDate, locale)}</span>
    </Link>
  );
}

function TopThree({ standings }) {
  const { t } = useI18n();
  return (
    <div className="card">
      <span className="card-label">{t('home.top3', { year: standings.season })}</span>
      <ol className="top3">
        {standings.drivers.map((d) => (
          <li key={d.position} className={`p${d.position}`}>
            <span className="top3-pos">{d.position}</span>
            <span className="top3-name">
              <strong><PersonLink person={{ name: d.driver, article: d.article }} /></strong>
              <span className="muted small"><Country name={d.country} /></span>
            </span>
            <span className="top3-points">{t('home.points', { n: d.points })}</span>
          </li>
        ))}
      </ol>
      <Link to={`/standings/${standings.season}`} className="small more-link">{t('home.fullStandings')} <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}

function ComingUp({ season, afterId }) {
  const { t, locale } = useI18n();
  const { data } = useApi(`/seasons/${season}`);
  const now = today();
  const list = (data?.calendar ?? []).filter((r) => r.startDate > now && r.id !== afterId).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="card">
      <span className="card-label">{t('home.comingUp')}</span>
      <ul className="upcoming">
        {list.map((r) => (
          <li key={r.id}>
            <span className="upcoming-date">{shortDate(r.startDate, locale)}</span>
            <Link to={`/rallies/${r.id}`}>{r.name}</Link>
            <span className="muted small"><Country name={r.country} /></span>
          </li>
        ))}
      </ul>
      <Link to={`/calendar/${season}`} className="small more-link">{t('home.fullCalendar')} <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}

function Explore() {
  const { t } = useI18n();
  const items = [
    ['/calendar', CalendarDays, t('nav.calendar'), t('home.exploreCalendar')],
    ['/drivers', Users, t('nav.drivers'), t('home.exploreDrivers')],
    ['/teams', Car, t('nav.teams'), t('home.exploreTeams')],
    ['/history', HistoryIcon, t('nav.history'), t('home.exploreHistory')],
  ];
  return (
    <>
      <h2 className="section-title">{t('home.explore')}</h2>
      <div className="explore">
        {items.map(([to, Icon, title, text]) => (
          <Link key={to} to={to} className="card explore-card">
            <Icon size={22} aria-hidden="true" className="explore-icon" />
            <span className="explore-title">{title}</span>
            <span className="muted small">{text}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { data, error, loading, retry } = useApi('/home');
  usePageTitle('');

  return (
    <section className="page home">
      <p className="eyebrow">{t('site.tagline')}</p>
      <Status loading={loading} error={error} retry={retry}>
        {data && (
          <>
            {data.nextRally && <NextRally rally={data.nextRally} latestSeason={data.latestRally?.season} />}
            <div className="cards home-cards">
              {data.latestRally?.winner && <LatestWinner rally={data.latestRally} />}
              {data.standings?.drivers?.length > 0 && <TopThree standings={data.standings} />}
              {data.nextRally && <ComingUp season={data.nextRally.season} afterId={data.nextRally.id} />}
            </div>
            <Explore />
          </>
        )}
      </Status>
    </section>
  );
}
