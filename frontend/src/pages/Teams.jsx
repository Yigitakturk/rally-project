import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import Status from '../components/Status.jsx';
import { Country } from '../components/bits.jsx';
import { seasonRange } from './Drivers.jsx';

const PAGE = 120;

function TeamCards({ items }) {
  const { t } = useI18n();
  return (
    <ul className="team-grid">
      {items.map((team) => (
        <li key={team.id}>
          <Link to={`/teams/${team.id}`} className="card">
            <span className="card-title">{team.name}</span>
            <span className="muted small"><Country name={team.country} /> · {seasonRange(team.seasons)}</span>
            <span className="team-numbers">
              <span><strong>{team.wins}</strong> {t('people.wins')}</span>
              <span><strong>{team.podiums}</strong> {t('people.podiums')}</span>
              <span><strong>{team.starts}</strong> {t('profile.crews')}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Teams() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const all = params.get('all') === 'true';
  const teams = useApi(`/teams${all ? '?all=true' : ''}`);
  const cars = useApi('/cars');
  const [shown, setShown] = useState(PAGE);

  return (
    <section className="page">
      <h1 className="page-title">{t('pages.teams')}</h1>
      <p className="muted small">{t('people.since')}.</p>

      <h2 className="section-title">{t('teamsPage.teams')}</h2>
      <label className="check">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => setParams((p) => { if (e.target.checked) p.set('all', 'true'); else p.delete('all'); return p; }, { replace: true })}
        />
        {t('teamsPage.showAll')}
      </label>
      <Status loading={teams.loading} error={teams.error} retry={teams.retry}>
        {teams.data && (
          <>
            <p className="muted small">{all ? t('teamsPage.count', { n: teams.data.items.length }) : t('teamsPage.mainOnly')}</p>
            <TeamCards items={all ? teams.data.items.slice(0, shown) : teams.data.items} />
            {all && shown < teams.data.items.length && (
              <button type="button" className="button button-ghost" onClick={() => setShown((n) => n + PAGE)}>
                {t('people.showMore')}
              </button>
            )}
          </>
        )}
      </Status>

      <h2 className="section-title">{t('teamsPage.cars')}</h2>
      <Status loading={cars.loading} error={cars.error} retry={cars.retry}>
        {cars.data && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('profile.car')}</th>
                  <th className="num">{t('people.wins')}</th>
                  <th className="num">{t('people.podiums')}</th>
                  <th className="num hide-sm">{t('people.classWins')}</th>
                  <th className="num">{t('profile.crews')}</th>
                  <th className="num hide-sm">{t('people.seasons')}</th>
                </tr>
              </thead>
              <tbody>
                {cars.data.items.map((car) => (
                  <tr key={car.id}>
                    <td><strong><Link to={`/cars/${car.id}`}>{car.name}</Link></strong></td>
                    <td className="num">{car.wins || ''}</td>
                    <td className="num">{car.podiums || ''}</td>
                    <td className="num hide-sm">{car.classWins || ''}</td>
                    <td className="num">{car.starts}</td>
                    <td className="num hide-sm muted">{seasonRange(car.seasons)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Status>
    </section>
  );
}
