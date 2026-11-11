import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useI18n, LANGUAGES } from '../i18n/index.jsx';

const LINKS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/calendar', key: 'nav.calendar' },
  { to: '/drivers', key: 'nav.drivers' },
  { to: '/teams', key: 'nav.teams' },
  { to: '/standings', key: 'nav.standings' },
  { to: '/history', key: 'nav.history' },
];

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('nav.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'active' : ''}
          aria-pressed={l.code === lang}
          title={l.dict._name}
          onClick={() => setLang(l.code)}
        >
          {l.dict._short ?? l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the phone menu and go to the top when the page changes.
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="brand" aria-label={t('nav.home')}>
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">{t('site.name')}</span>
          </NavLink>

          <nav className={`nav ${open ? 'open' : ''}`} id="main-nav">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end}>
                {t(link.key)}
              </NavLink>
            ))}
          </nav>

          <div className="header-tools">
            <LanguageSwitch />
            <button
              type="button"
              className="menu-button"
              aria-expanded={open}
              aria-controls="main-nav"
              aria-label={open ? t('nav.close') : t('nav.menu')}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          {t('footer.data')}{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
        </p>
        <p>
          {t('footer.live')}{' '}
          <a href="https://www.wrc.com" target="_blank" rel="noreferrer">wrc.com</a>
        </p>
      </footer>
    </div>
  );
}
