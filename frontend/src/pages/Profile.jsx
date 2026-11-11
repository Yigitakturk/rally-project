import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { Country, Tabs } from '../components/bits.jsx';
import NotFound from './NotFound.jsx';
import { seasonRange } from './Drivers.jsx';
import { shortDate, slug } from '../format.js';

const BACK = {
  drivers: '/drivers',
  codrivers: '/drivers?type=codrivers',
  teams: '/teams',
  cars: '/teams',
};

/** Who/what appears most often in the results, e.g. the drivers of a team.
 *  "Sébastien Ogier" and "Sebastien Ogier" count as the same name. */
function topNames(results, field, limit = 12) {
  const groups = new Map();
  for (const r of results) {
    const name = r[field];
    if (!name) continue;
    const key = slug(name);
    const g = groups.get(key) ?? { count: 0, spellings: new Map() };
    g.count++;
    g.spellings.set(name, (g.spellings.get(name) ?? 0) + 1);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => [[...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0], g.count])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function Stats({ item, kind }) {
  const { t } = useI18n();
  const stats = [
    // A team or car has several crews in each rally, so count crews there.
    [kind === 'teams' || kind === 'cars' ? t('profile.crews') : t('people.starts'), item.starts],
    [t('people.wins'), item.wins],
    [t('people.podiums'), item.podiums],
    [t('people.classWins'), item.classWins],
    [t('people.seasons'), seasonRange(item.seasons)],
  ];
  return (
    <dl className="stats">
      {stats.map(([label, value]) => (
        <div key={label}>
          <dd>{value ?? 0}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Chips({ title, names, linkKind }) {
  if (!names.length) return null;
  return (
    <div className="chips-block">
      <h2 className="section-title">{title}</h2>
      <ul className="chips">
        {names.map(([name, n]) => (
          <li key={name}>
            {linkKind ? <Link to={`/${linkKind}/${slug(name)}`}>{name}</Link> : name}
            <span className="muted"> · {n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultsBySeason({ item, kind }) {
  const { t, locale } = useI18n();
  const [params, setParams] = useSearchParams();
  const seasons = [...new Set(item.results.map((r) => r.season))].sort((a, b) => b - a);
  const chosen = Number(params.get('season')) || seasons[0];
  const rows = item.results.filter((r) => r.season === chosen).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  // The "other person" column: a driver's co-driver, a co-driver's driver, a team's or car's driver.
  const other = kind === 'drivers' ? 'codriver' : 'driver';
  const showCar = kind !== 'cars';
  const showTeam = kind === 'cars';

  if (!seasons.length) return <p className="muted">{t('profile.noResults')}</p>;
  return (
    <>
      <h2 className="section-title">{t('profile.results')}</h2>
      <Tabs
        label={t('people.season')}
        value={chosen}
        onChange={(v) => setParams((p) => { p.set('season', v); return p; }, { replace: true })}
        tabs={seasons.map((s) => ({ value: s, label: String(s) }))}
      />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="hide-sm">{t('profile.date')}</th>
              <th>{t('profile.rally')}</th>
              <th className="hide-md">{t('profile.class')}</th>
              <th className="num">{t('profile.pos')}</th>
              <th>{t(`profile.${other}`)}</th>
              {showCar && <th className="hide-md">{t('profile.car')}</th>}
              {showTeam && <th className="hide-md">{t('profile.team')}</th>}
              <th className="num hide-sm">{t('profile.points')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const finished = r.status === 'finished';
              const pos = r.classPosition ?? r.position;
              return (
                <tr key={`${r.rallyId}-${r[other]}-${i}`} className={finished ? (pos <= 3 ? `podium p${pos}` : '') : 'retired'}>
                  <td className="hide-sm muted">{shortDate(r.date, locale)}</td>
                  <td><Link to={`/rallies/${r.rallyId}`}>{r.rally}</Link></td>
                  <td className="hide-md muted">{r.class}</td>
                  <td className="num pos">{finished ? pos : t('profile.retired')}</td>
                  <td>{r[other]}</td>
                  {showCar && <td className="hide-md">{r.car}</td>}
                  {showTeam && <td className="hide-md">{r.team}</td>}
                  <td className="num hide-sm">{r.points ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Profile({ kind }) {
  const { id } = useParams();
  const { t } = useI18n();
  const { data: item, error, loading, retry } = useApi(`/${kind}/${id}`);
  const results = useMemo(() => item?.results ?? [], [item]);

  if (error?.status === 404) return <NotFound />;
  const summary = item?.summary;
  const label = { drivers: 'pages.driver', codrivers: 'pages.codriver', teams: 'pages.team', cars: 'pages.car' }[kind];

  return (
    <section className="page">
      <Link to={BACK[kind]} className="back-link"><ArrowLeft size={16} aria-hidden="true" /> {t('profile.back')}</Link>
      <Status loading={loading} error={error} retry={retry}>
        {item && (
          <>
            <div className="profile-head">
              {summary?.image && (
                <figure className="profile-photo">
                  <img src={summary.image} alt={item.name} loading="lazy" />
                  <figcaption><a href={summary.url} target="_blank" rel="noreferrer">{t('profile.photo')}</a></figcaption>
                </figure>
              )}
              <div>
                <p className="eyebrow">{t(label)}</p>
                <h1 className="page-title" lang="">{item.name}</h1>
                {item.country && <p><Country name={item.country} /></p>}
                <Stats item={item} kind={kind} />
              </div>
            </div>

            {summary?.extract && (
              <div className="intro">
                <p className="muted small">{t('profile.fromWikipedia')}</p>
                <p>{summary.extract}</p>
                <a href={summary.url} target="_blank" rel="noreferrer" className="small">
                  {t('profile.readMore')} <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            )}

            <div className="chips-row">
              {(kind === 'teams' || kind === 'cars') && (
                <Chips title={t('profile.drivers')} names={topNames(results, 'driver')} />
              )}
              {kind === 'teams' && <Chips title={t('profile.cars')} names={topNames(results, 'car')} />}
              {kind === 'cars' && <Chips title={t('profile.teams')} names={topNames(results, 'team')} linkKind="teams" />}
            </div>

            <ResultsBySeason item={item} kind={kind} />
          </>
        )}
      </Status>
    </section>
  );
}
