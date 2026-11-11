import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { Country, Tabs } from '../components/bits.jsx';

const PAGE = 50;

/** Simple search: ignores accents and capitals, so "tanak" finds "Tänak". */
export function normalize(text) {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('en');
}

export function seasonRange(seasons) {
  if (!seasons?.length) return '';
  const first = Math.min(...seasons);
  const last = Math.max(...seasons);
  return first === last ? String(first) : `${first}–${last}`;
}

export default function Drivers() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const kind = params.get('type') === 'codrivers' ? 'codrivers' : 'drivers';
  const season = params.get('season') ?? '';
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const seasons = useApi('/seasons');
  const { data, error, loading, retry } = useApi(`/${kind}${season ? `?season=${season}` : ''}`);

  const items = useMemo(() => {
    const q = normalize(query.trim());
    const list = data?.items ?? [];
    return q ? list.filter((p) => normalize(p.name).includes(q)) : list;
  }, [data, query]);

  const setParam = (key, value) => {
    setShown(PAGE);
    setParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      return p;
    }, { replace: true });
  };

  return (
    <section className="page">
      <h1 className="page-title">{t('pages.drivers')}</h1>
      <Tabs
        label={t('pages.drivers')}
        value={kind}
        onChange={(v) => setParam('type', v === 'drivers' ? '' : v)}
        tabs={[
          { value: 'drivers', label: t('people.drivers') },
          { value: 'codrivers', label: t('people.codrivers') },
        ]}
      />

      <div className="filters">
        <label className="field">
          <span>{t('people.search')}</span>
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t('people.season')}</span>
          <select value={season} onChange={(e) => setParam('season', e.target.value)}>
            <option value="">{t('people.allSeasons')}</option>
            {(seasons.data?.items ?? []).map((s) => (
              <option key={s.year} value={s.year}>{s.year}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small">{t('people.since')}. {t('people.help')}</p>

      <Status loading={loading} error={error} retry={retry}>
        {items.length === 0 ? (
          <p className="muted">{t('people.none')}</p>
        ) : (
          <>
            <p className="muted">{t('people.count', { n: items.length })}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('people.name')}</th>
                    <th className="num">{t('people.wins')}</th>
                    <th className="num">{t('people.podiums')}</th>
                    <th className="num hide-sm">{t('people.classWins')}</th>
                    <th className="num">{t('people.starts')}</th>
                    <th className="num hide-sm">{t('people.seasons')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, shown).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="crew">
                          <strong><Link to={`/${kind}/${p.id}`}>{p.name}</Link></strong>
                          <span className="muted small"><Country name={p.country} /></span>
                        </div>
                      </td>
                      <td className="num">{p.wins || ''}</td>
                      <td className="num">{p.podiums || ''}</td>
                      <td className="num hide-sm">{p.classWins || ''}</td>
                      <td className="num">{p.starts}</td>
                      <td className="num hide-sm muted">{seasonRange(p.seasons)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown < items.length && (
              <button type="button" className="button button-ghost" onClick={() => setShown((n) => n + PAGE)}>
                {t('people.showMore')}
              </button>
            )}
          </>
        )}
      </Status>
    </section>
  );
}
