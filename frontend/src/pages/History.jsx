import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { usePageTitle } from '../title.js';
import { Country } from '../components/bits.jsx';
import { slug } from '../format.js';

/** Links to our profile when we have one (2020 and later), otherwise plain text. */
function Name({ person, kind, known }) {
  if (!person?.name) return null;
  const id = slug(kind === 'teams' ? person.name : person.article ?? person.name);
  return known.has(id) ? <Link to={`/${kind}/${id}`}>{person.name}</Link> : <span>{person.name}</span>;
}

function TitleList({ title, items }) {
  const { t } = useI18n();
  return (
    <div className="card title-list">
      <span className="card-label"><Trophy size={14} aria-hidden="true" /> {title}</span>
      <ol>
        {items.slice(0, 5).map((p) => (
          <li key={p.name}>
            <span className="title-name" lang="">{p.name}</span>
            <span className="muted small"><Country name={p.country} /></span>
            <span className="title-count">{p.titles === 1 ? t('historyPage.title1') : t('historyPage.titles', { n: p.titles })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function History() {
  const { t } = useI18n();
  const { data, error, loading, retry } = useApi('/history');
  const drivers = useApi('/drivers');
  const codrivers = useApi('/codrivers');
  usePageTitle(t('pages.history'));

  const known = useMemo(() => new Set([
    ...(drivers.data?.items ?? []).map((x) => x.id),
    ...(codrivers.data?.items ?? []).map((x) => x.id),
  ]), [drivers.data, codrivers.data]);

  // One row per year: driver, co-driver and manufacturer champions together.
  const years = useMemo(() => {
    const map = new Map();
    for (const kind of ['drivers', 'codrivers', 'manufacturers']) {
      for (const c of data?.champions?.[kind] ?? []) {
        const row = map.get(c.season) ?? { season: c.season };
        row[kind] = c;
        map.set(c.season, row);
      }
    }
    return [...map.values()].sort((a, b) => b.season - a.season);
  }, [data]);

  const mostWins = (drivers.data?.items ?? []).slice(0, 5);

  return (
    <section className="page">
      <h1 className="page-title">{t('pages.history')}</h1>
      <p className="muted intro-text">{t('historyPage.intro')}</p>
      <Status loading={loading} error={error} retry={retry}>
        {data && (
          <>
            <h2 className="section-title">{t('historyPage.mostTitles')}</h2>
            <div className="cards cards-3">
              <TitleList title={t('historyPage.drivers')} items={data.mostTitles.drivers} />
              <TitleList title={t('historyPage.codrivers')} items={data.mostTitles.codrivers} />
              <TitleList title={t('historyPage.manufacturers')} items={data.mostTitles.manufacturers} />
            </div>

            {mostWins.length > 0 && (
              <>
                <h2 className="section-title">{t('historyPage.mostWins')}</h2>
                <ol className="chips">
                  {mostWins.map((d) => (
                    <li key={d.id}>
                      <Link to={`/drivers/${d.id}`}>{d.name}</Link>
                      <span className="muted"> · {t('historyPage.wins', { n: d.wins })}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            <h2 className="section-title">{t('historyPage.champions')}</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('historyPage.year')}</th>
                    <th>{t('historyPage.driver')}</th>
                    <th className="hide-sm">{t('historyPage.codriver')}</th>
                    <th>{t('historyPage.manufacturer')}</th>
                    <th className="hide-md">{t('historyPage.car')}</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.season}>
                      <td className="stage-code">{y.season}</td>
                      <td>
                        <div className="crew">
                          <strong><Name person={y.drivers} kind="drivers" known={known} /></strong>
                          {y.drivers && <span className="muted small"><Country name={y.drivers.country} /></span>}
                        </div>
                      </td>
                      <td className="hide-sm"><Name person={y.codrivers} kind="codrivers" known={known} /></td>
                      <td>{y.manufacturers?.name}</td>
                      <td className="hide-md muted">{y.drivers?.car ?? y.manufacturers?.car}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small">
              {Object.values(data.sources ?? {}).map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">{i === 0 ? t('historyPage.source') : ` · ${i + 1}`}</a>
              ))}
            </p>
          </>
        )}
      </Status>
    </section>
  );
}
