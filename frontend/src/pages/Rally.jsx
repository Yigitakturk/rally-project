import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Trophy, Zap } from 'lucide-react';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { CarLink, Country, PersonLink, SurfaceBadge, Tabs, TeamLink } from '../components/bits.jsx';
import NotFound from './NotFound.jsx';
import { dateRange, dayLabel, formatKm, rallyState } from '../format.js';

const LIVE_URL = 'https://www.wrc.com';

function Facts({ rally }) {
  const { t, locale } = useI18n();
  const items = [
    [t('rally.dates'), dateRange(rally.startDate, rally.endDate, locale)],
    [t('rally.country'), <Country key="c" name={rally.country} />],
    [t('rally.base'), rally.rallyBase ?? rally.headquarters],
    [t('rally.surface'), <SurfaceBadge key="s" surface={rally.surface} />],
    [t('rally.stages'), rally.stages],
    [t('rally.distance'), formatKm(rally.stageKm ?? rally.distanceKm, locale)],
    [t('rally.crews'), rally.crewsRegistered],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');
  return (
    <dl className="facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WinnerCard({ rally }) {
  const { t } = useI18n();
  const w = rally.winner;
  if (!w?.driver) return null;
  const power = (rally.powerStageWinner ?? []).slice(0, 2);
  return (
    <div className="cards">
      <div className="card card-accent">
        <span className="card-label"><Trophy size={14} aria-hidden="true" /> {t('rally.winner')}</span>
        <span className="card-title"><PersonLink person={w.driver} /></span>
        <span className="muted">
          <PersonLink person={w.codriver} kind="codrivers" /> · <CarLink car={w.car} />
        </span>
      </div>
      {power.length > 0 && (
        <div className="card">
          <span className="card-label"><Zap size={14} aria-hidden="true" /> {t('rally.powerStage')}</span>
          <span className="card-title">{power[0]}</span>
          {power[1] && <span className="muted">{power[1]}</span>}
          <span className="muted small">{t('rally.help.powerStage')}</span>
        </div>
      )}
    </div>
  );
}

function ResultsTable({ cls }) {
  const { t } = useI18n();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="num">{t('rally.pos')}</th>
            <th className="num hide-sm">{t('rally.no')}</th>
            <th>{t('rally.driver')} / {t('rally.codriver')}</th>
            <th className="hide-md">{t('rally.car')}</th>
            <th className="hide-md">{t('rally.team')}</th>
            <th className="num">{t('rally.time')}</th>
            <th className="num hide-sm">{t('rally.gap')}</th>
            <th className="num">{t('rally.points')}</th>
          </tr>
        </thead>
        <tbody>
          {cls.classification.map((row, i) => {
            const finished = row.status === 'finished';
            const pos = row.classPosition ?? row.position;
            return (
              <tr key={`${row.number}-${i}`} className={finished ? (pos >= 1 && pos <= 3 ? `podium p${pos}` : '') : 'retired'}>
                <td className="num pos">{finished ? pos : t('rally.retired')}</td>
                <td className="num hide-sm muted">{row.number}</td>
                <td>
                  <div className="crew">
                    <strong><PersonLink person={row.driver} /></strong>
                    <span className="muted"><PersonLink person={row.codriver} kind="codrivers" /></span>
                    <span className="muted small show-md"><CarLink car={row.car} /></span>
                  </div>
                </td>
                <td className="hide-md"><CarLink car={row.car} /></td>
                <td className="hide-md"><TeamLink team={row.entrant} /></td>
                <td className="num">
                  {finished ? row.time : (
                    <span className="muted small">
                      {row.reason}{row.retiredOn ? ` · ${t('rally.retiredOn', { stage: row.retiredOn })}` : ''}
                    </span>
                  )}
                </td>
                <td className="num hide-sm muted">{finished && row.gap !== '0.0' ? row.gap : ''}</td>
                <td className="num">{row.points ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StagesTable({ rally, cls }) {
  const { t, locale } = useI18n();
  const winners = useMemo(() => new Map((cls?.stages ?? []).map((s) => [s.stage, s])), [cls]);
  const rows = rally.itinerary?.length
    ? rally.itinerary
    : (cls?.stages ?? []).map((s) => ({ stage: s.stage }));
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t('rally.stage')}</th>
            <th className="hide-sm">{t('rally.day')}</th>
            <th>{t('rally.name')}</th>
            <th className="num hide-sm">{t('rally.length')}</th>
            <th>{t('rally.stageWinner')}</th>
            <th className="num">{t('rally.time')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const w = winners.get(s.stage);
            // "Lappi / Ferm, Ogier / Ingrassia" → drivers Lappi and Ogier (a tie), linked when possible.
            const names = (w?.winnersText ?? '').split(/,\s*/).filter(Boolean).map((crew) => {
              const surname = crew.split(' / ')[0].trim();
              const match = (w.winners ?? []).find((p) => p.name === surname);
              return { name: surname, article: match?.article ?? null };
            });
            return (
              <tr key={s.stage} className={s.powerStage ? 'power' : ''}>
                <td className="stage-code">{s.stage === 'SD' ? t('rally.shakedown') : s.stage}</td>
                <td className="hide-sm muted">{dayLabel(s.day, rally.season, locale)}</td>
                <td>
                  {s.name}
                  {s.powerStage && <span className="badge badge-power">{t('rally.powerStageTag')}</span>}
                </td>
                <td className="num hide-sm muted">{formatKm(s.distanceKm, locale)}</td>
                <td>
                  {names.map((p, i) => (
                    <span key={`${p.name}-${i}`}>
                      {i > 0 && ', '}
                      {p.article ? <PersonLink person={p} /> : p.name}
                    </span>
                  ))}
                </td>
                <td className="num">{w?.time ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">{t('rally.shakedown')}: {t('rally.help.shakedown')}</p>
    </div>
  );
}

function EntriesTable({ entries }) {
  const { t } = useI18n();
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const g = e.group ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(e);
    }
    return [...map.entries()];
  }, [entries]);
  return groups.map(([group, list]) => (
    <div key={group} className="table-wrap">
      {group && <h3 className="table-caption">{group}</h3>}
      <table className="table">
        <thead>
          <tr>
            <th className="num">{t('rally.no')}</th>
            <th>{t('rally.driver')} / {t('rally.codriver')}</th>
            <th className="hide-md">{t('rally.team')}</th>
            <th className="hide-sm">{t('rally.car')}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((e, i) => (
            <tr key={`${e.number}-${i}`}>
              <td className="num muted">{e.number}</td>
              <td>
                <div className="crew">
                  <strong><Country name={e.driver?.country} /> <PersonLink person={e.driver} /></strong>
                  <span className="muted"><PersonLink person={e.codriver} kind="codrivers" /></span>
                </div>
              </td>
              <td className="hide-md"><TeamLink team={e.entrant} /></td>
              <td className="hide-sm"><CarLink car={e.car} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ));
}

export default function Rally() {
  const { id } = useParams();
  const { t } = useI18n();
  const { data: rally, error, loading, retry } = useApi(`/rallies/${id}`);
  // The open tab and class live in the address (?tab=stages&class=1) so a link can be shared.
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'results';
  const classIndex = Number(params.get('class') ?? 0) || 0;
  const setParam = (key, value) => setParams((p) => { p.set(key, value); return p; }, { replace: true });
  const setTab = (v) => setParam('tab', v);
  const setClassIndex = (v) => setParam('class', String(v));

  if (error?.status === 404) return <NotFound />;

  const classes = rally?.classes ?? [];
  const shownClass = Math.max(0, Math.min(classIndex, classes.length - 1));
  const cls = classes[shownClass];
  const state = rally ? rallyState(rally) : null;
  const tabs = [
    classes.length && { value: 'results', label: t('rally.tabResults') },
    (rally?.itinerary?.length || cls?.stages?.length) && { value: 'stages', label: t('rally.tabStages') },
    rally?.entries?.length && { value: 'entries', label: t('rally.tabEntries') },
  ].filter(Boolean);
  const activeTab = tabs.some((x) => x.value === tab) ? tab : tabs[0]?.value;

  return (
    <section className="page">
      <Status loading={loading} error={error} retry={retry}>
        {rally && (
          <>
            <Link to={`/calendar/${rally.season}`} className="back-link">
              <ArrowLeft size={16} aria-hidden="true" /> {t('rally.back', { year: rally.season })}
            </Link>
            <p className="eyebrow">{t('calendar.round', { n: rally.round })} · {rally.season}</p>
            <h1 className="page-title" lang="">{rally.name}</h1>
            <Facts rally={rally} />

            <div className="link-row">
              {state !== 'done' && (
                <a href={LIVE_URL} target="_blank" rel="noreferrer" className="button">
                  {t('rally.liveResults')} <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
              {rally.source?.url && (
                <a href={rally.source.url} target="_blank" rel="noreferrer" className="button button-ghost">
                  {t('rally.source')} <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>

            <WinnerCard rally={rally} />

            {tabs.length === 0 ? (
              <p className="notice">{state === 'done' ? t('rally.noDetails') : t('rally.notYet')}</p>
            ) : (
              <div className="rally-tabs">
                <Tabs tabs={tabs} value={activeTab} onChange={setTab} label={rally.name} />
                {activeTab !== 'entries' && classes.length > 1 && (
                  <Tabs
                    label={t('rally.class')}
                    tabs={classes.map((c, i) => ({ value: i, label: c.name }))}
                    value={shownClass}
                    onChange={setClassIndex}
                  />
                )}
                {activeTab === 'results' && cls && <ResultsTable cls={cls} />}
                {activeTab === 'stages' && <StagesTable rally={rally} cls={cls} />}
                {activeTab === 'entries' && <EntriesTable entries={rally.entries} />}
              </div>
            )}
          </>
        )}
      </Status>
    </section>
  );
}
