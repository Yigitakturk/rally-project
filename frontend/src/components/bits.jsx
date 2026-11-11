// Small shared pieces used on several pages.
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { countries, personId, surfaceKind, surfaceName, teamId } from '../format.js';

export function Country({ name }) {
  const { locale } = useI18n();
  if (!name) return null;
  const list = countries(name, locale);
  if (!list.length) return <span className="country">{name}</span>;
  return (
    <span className="countries">
      {list.map((c) => (
        <span key={c.code} className="country">
          <span className="flag" aria-hidden="true">{c.flag}</span>
          {c.name}
        </span>
      ))}
    </span>
  );
}

export function SurfaceBadge({ surface }) {
  const { t } = useI18n();
  if (!surface) return null;
  return <span className={`badge surface-${surfaceKind(surface)}`}>{surfaceName(surface, t)}</span>;
}

/** Link to a driver / co-driver profile (plain text when there's no profile). */
export function PersonLink({ person, kind = 'drivers', short }) {
  if (!person?.name) return null;
  const id = personId(person);
  const label = short ? person.name.split(' ').slice(-1)[0] : person.name;
  return id ? <Link to={`/${kind}/${id}`}>{label}</Link> : <span>{label}</span>;
}

export function TeamLink({ team }) {
  if (!team?.name) return null;
  return <Link to={`/teams/${teamId(team)}`}>{team.name}</Link>;
}

export function CarLink({ car }) {
  if (!car?.name) return null;
  return <Link to={`/cars/${personId(car)}`}>{car.name}</Link>;
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          className={tab.value === value ? 'active' : ''}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
