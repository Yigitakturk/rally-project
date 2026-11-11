// Helpers that turn the API's English data into the visitor's language.

// Country names as Wikipedia writes them → ISO country codes. The browser then
// gives the name in any language (Intl.DisplayNames), and we draw the flag.
const COUNTRY_CODES = {
  'Andorra': 'AD', 'Argentina': 'AR', 'Australia': 'AU', 'Austria': 'AT', 'Belarus': 'BY',
  'Belgium': 'BE', 'Bolivia': 'BO', 'Brazil': 'BR', 'Bulgaria': 'BG', 'Canada': 'CA',
  'Chile': 'CL', 'China': 'CN', 'Croatia': 'HR', 'Cyprus': 'CY', 'Czech Republic': 'CZ',
  'Czechia': 'CZ', 'Denmark': 'DK', 'Estonia': 'EE', 'Finland': 'FI', 'France': 'FR',
  'Germany': 'DE', 'Greece': 'GR', 'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN',
  'Indonesia': 'ID', 'Ireland': 'IE', 'Republic of Ireland': 'IE', 'Italy': 'IT',
  'Japan': 'JP', 'Jordan': 'JO', 'Kenya': 'KE', 'Latvia': 'LV', 'Lithuania': 'LT',
  'Luxembourg': 'LU', 'Malaysia': 'MY', 'Mexico': 'MX', 'Monaco': 'MC', 'Netherlands': 'NL',
  'New Zealand': 'NZ', 'Norway': 'NO', 'Paraguay': 'PY', 'Peru': 'PE', 'Poland': 'PL',
  'Portugal': 'PT', 'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU', 'Saudi Arabia': 'SA',
  'Slovakia': 'SK', 'Slovenia': 'SI', 'South Africa': 'ZA', 'South Korea': 'KR', 'Spain': 'ES',
  'Sweden': 'SE', 'Switzerland': 'CH', 'Thailand': 'TH', 'Turkey': 'TR', 'Türkiye': 'TR',
  'Ukraine': 'UA', 'United Kingdom': 'GB', 'United States': 'US', 'Uruguay': 'UY',
  'Zambia': 'ZM',
};
const NAMES_LONGEST_FIRST = Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length);

/** "Austria Czech Republic Germany" → ["AT", "CZ", "DE"]; unknown text → []. */
export function countryCodes(name) {
  if (!name) return [];
  let rest = ` ${name} `;
  const found = [];
  for (const n of NAMES_LONGEST_FIRST) {
    if (rest.includes(` ${n} `) || rest.includes(` ${n},`)) {
      found.push({ code: COUNTRY_CODES[n], at: name.indexOf(n) });
      rest = rest.replace(n, ' '.repeat(n.length));
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.code);
}

const displayNames = new Map();
function regionName(code, locale) {
  try {
    if (!displayNames.has(locale)) displayNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
    return displayNames.get(locale).of(code);
  } catch {
    return code;
  }
}

/** Country name in the visitor's language ("Japan" → "Japonya"). */
export function countryName(name, locale) {
  const codes = countryCodes(name);
  if (!codes.length) return name ?? '';
  return codes.map((c) => regionName(c, locale)).join(', ');
}

/** Flag emoji for a country name ("Japan" → 🇯🇵). */
export function flag(name) {
  return countryCodes(name)
    .map((code) => String.fromCodePoint(...[...code].map((ch) => 0x1f1a5 + ch.charCodeAt(0))))
    .join(' ');
}

/** Road surface in the visitor's language, using the dictionary's "surface" section. */
export function surfaceName(text, t) {
  if (!text) return '';
  return text
    .split(/\s*(?:,| and | & |\/)\s*/i)
    .map((part) => {
      const key = part.trim().toLowerCase();
      const translated = t(`surface.${key}`);
      return translated === `surface.${key}` ? part : translated;
    })
    .join(' · ');
}

/** Main surface word for colouring a badge: gravel, tarmac, snow or mixed. */
export function surfaceKind(text) {
  const s = (text ?? '').toLowerCase();
  const kinds = ['gravel', 'tarmac', 'asphalt', 'snow'].filter((k) => s.includes(k));
  if (kinds.length !== 1) return 'mixed';
  return kinds[0] === 'asphalt' ? 'tarmac' : kinds[0];
}

const noon = (iso) => new Date(`${iso}T12:00:00`);

/** "22 – 25 January 2026" in the visitor's language. */
export function dateRange(start, end, locale) {
  if (!start) return '';
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  if (!end || end === start) return fmt.format(noon(start));
  try {
    return fmt.formatRange(noon(start), noon(end));
  } catch {
    return `${fmt.format(noon(start))} – ${fmt.format(noon(end))}`;
  }
}

export function shortDate(iso, locale) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(noon(iso));
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** done | live | upcoming, based on today's date. */
export function rallyState(rally, now = today()) {
  if (rally.endDate && rally.endDate < now) return 'done';
  if (rally.startDate && rally.startDate <= now) return 'live';
  return 'upcoming';
}

export function formatKm(km, locale) {
  if (km == null) return '';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(km)} km`;
}

/** Same ids as the backend uses: "Sébastien Ogier" → "sebastien-ogier". */
export function slug(text) {
  return (text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Profile id for a person/car (article first) or a team (name). */
export const personId = (p) => slug(p?.article ?? p?.name);
export const teamId = (team) => slug(team?.name);

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

/** Wikipedia's "16 October" (+ season year) → "16 Eki" / "16 Oct". Unknown text is kept. */
export function dayLabel(text, year, locale) {
  const m = /(\d{1,2})\s+([A-Za-z]+)/.exec(text ?? '');
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  if (month < 0) return text ?? '';
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(noon(iso));
}

/** Each country with its own flag: [{ code, name, flag }]. */
export function countries(name, locale) {
  return countryCodes(name).map((code) => ({
    code,
    name: regionName(code, locale),
    flag: String.fromCodePoint(...[...code].map((ch) => 0x1f1a5 + ch.charCodeAt(0))),
  }));
}
