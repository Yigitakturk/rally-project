// Languages. Every *.json file in this folder is one language, so adding a
// language means adding one file (copy en.json, translate the values).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const files = import.meta.glob('./*.json', { eager: true, import: 'default' });
export const LANGUAGES = Object.entries(files)
  .map(([path, dict]) => ({ code: path.match(/\.\/(.+)\.json$/)[1], dict }))
  .sort((a, b) => a.code.localeCompare(b.code));

const FALLBACK = 'en';
const STORAGE_KEY = 'rally.lang';

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function initialLanguage() {
  const codes = LANGUAGES.map((l) => l.code);
  // A shared link can pick the language: ...?lang=tr
  const fromLink = new URLSearchParams(window.location.search).get('lang');
  if (fromLink && codes.includes(fromLink)) return fromLink;
  const saved = readSaved();
  if (saved && codes.includes(saved)) return saved;
  const browser = (navigator.languages ?? [navigator.language]).map((l) => l?.slice(0, 2));
  return browser.find((c) => codes.includes(c)) ?? FALLBACK;
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  const setLang = useCallback((code) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Private mode etc.: the choice just isn't remembered.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const dict = LANGUAGES.find((l) => l.code === lang)?.dict ?? {};
    const fallback = LANGUAGES.find((l) => l.code === FALLBACK)?.dict ?? {};
    // t('calendar.round', { n: 3 }) → "Round 3": {n} is filled in.
    const t = (key, vars) => {
      const text = lookup(dict, key) ?? lookup(fallback, key) ?? key;
      if (!vars || typeof text !== 'string') return text;
      return text.replace(/\{(\w+)\}/g, (m, name) => (vars[name] ?? m));
    };
    return { lang, setLang, t, locale: dict._locale ?? lang };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
