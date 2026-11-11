import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { usePageTitle } from '../title.js';
import { Country, Tabs } from '../components/bits.jsx';
import { SeasonPicker } from './Calendar.jsx';
import { slug } from '../format.js';

const KINDS = ['drivers', 'codrivers', 'manufacturers'];
const NAME_FIELD = { drivers: 'driver', codrivers: 'codriver', manufacturers: 'manufacturer' };
const LINK_KIND = { drivers: 'drivers', codrivers: 'codrivers', manufacturers: 'teams' };

/** /standings without a year opens the newest season that has standings. */
export function StandingsRedirect() {
  const { data, error, loading, retry } = useApi('/home');
  const year = data?.standings?.season ?? data?.latestRally?.season ?? new Date().getFullYear();
  return (
    <Status loading={loading} error={error} retry={retry}>
      {data && <Navigate to={`/standings/${year}`} replace />}
    </Status>
  );
}

function resultClass(result) {
  const n = Number(result);
  if (n === 1) return 'res-1';
  if (n === 2) return 'res-2';
  if (n === 3) return 'res-3';
  if (n >= 4 && n <= 10) return 'res-pts';
  if (/^ret/i.test(result ?? '')) return 'res-ret';
  return '';
}

export default function Standings() {
  const { year } = useParams();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const kind = KINDS.includes(params.get('type')) ? params.get('type') : 'drivers';
  const { data, error, loading, retry } = useApi(`/seasons/${year}/standings`);
  const season = useApi(`/seasons/${year}`);
  usePageTitle(t('standingsPage.title', { year }));

  const rows = data?.[kind] ?? [];
  const calendar = season.data?.calendar ?? [];
  const codes = rows[0]?.rounds?.map((r) => r.code) ?? [];
  const leaderPoints = rows[0]?.points ?? 0;
  const roundsDone = calendar.filter((r) => r.winner).length;
  const finished = calendar.length > 0 && roundsDone === calendar.length;

  return (
    <section className="page">
      <h1 className="page-title">{t('standingsPage.title', { year })}</h1>
      <SeasonPicker current={Number(year)} base="/standings" />
      <Tabs
        label={t('pages.standings')}
        value={kind}
        onChange={(v) => setParams((p) => { if (v === 'drivers') p.delete('type'); else p.set('type', v); return p; }, { replace: true })}
        tabs={KINDS.map((k) => ({ value: k, label: t(`standingsPage.${k}`) }))}
      />
      <Status loading={loading} error={error?.status === 404 ? null : error} retry={retry}>
        {rows.length === 0 ? (
          <p className="notice">{t('standingsPage.notStarted')}</p>
        ) : (
          <>
            {calendar.length > 0 && !finished && (
              <p className="muted small">{t('standingsPage.after', { n: roundsDone, total: calendar.length })}</p>
            )}
            <div className="table-wrap">
              <table className="table standings">
                <thead>
                  <tr>
                    <th className="num">{t('standingsPage.pos')}</th>
                    <th>{t('standingsPage.name')}</th>
                    <th className="num">{t('standingsPage.points')}</th>
                    <th className="num hide-sm">{t('standingsPage.gap')}</th>
                    {codes.map((code, i) => {
                      const rally = calendar[i];
                      return (
                        <th key={`${code}-${i}`} className="round-col hide-sm">
                          {rally ? <Link to={`/rallies/${rally.id}`} title={rally.name}>{code}</Link> : code}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const name = row[NAME_FIELD[kind]];
                    const id = slug(kind === 'manufacturers' ? name : row.article ?? name);
                    return (
                      <tr key={`${row.position}-${name}`} className={row.position <= 3 ? `podium p${row.position}` : ''}>
                        <td className="num pos">{row.position}</td>
                        <td>
                          <div className="crew">
                            <strong><Link to={`/${LINK_KIND[kind]}/${id}`}>{name}</Link></strong>
                            {row.position === 1 && finished && <span className="badge badge-champion">{t('standingsPage.champion')}</span>}
                            <span className="muted small"><Country name={row.country} /></span>
                          </div>
                        </td>
                        <td className="num"><strong>{row.points}</strong></td>
                        <td className="num hide-sm muted">{row.position > 1 ? `−${leaderPoints - row.points}` : ''}</td>
                        {row.rounds.map((r, i) => (
                          <td
                            key={`${r.code}-${i}`}
                            className={`round-col hide-sm ${resultClass(r.result)}`}
                            title={r.points != null ? t('standingsPage.pointsTip', { n: r.points }) : undefined}
                          >
                            {/^ret/i.test(r.result ?? '') ? t('standingsPage.ret') : r.result ?? ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small hide-sm">{t('standingsPage.legend')}</p>
            {data?.source?.url && (
              <a href={data.source.url} target="_blank" rel="noreferrer" className="small">{t('rally.source')}</a>
            )}
          </>
        )}
      </Status>
    </section>
  );
}
