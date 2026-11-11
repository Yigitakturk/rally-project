// Reads a "YYYY World Rally Championship" Wikipedia article.
import { load, section, tableGrid, wikitables, linkTitle, flagCountry, toKm, cleanText } from '../html.js';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

/** "22 January" + 2026 → "2026-01-22" */
export function toIsoDate(text, year) {
  const m = /(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/.exec(text ?? '');
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  const y = m[3] ?? year;
  return `${y}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function columnIndex(headerRow, ...names) {
  return headerRow.findIndex((c) => names.some((n) => c.text.toLowerCase().startsWith(n)));
}

function cellLink($, cell) {
  if (!cell) return null;
  const a = $(cell.el).find('a').toArray().find((x) => linkTitle($, x) && !$(x).closest('.flagicon').length);
  return a ? linkTitle($, a) : null;
}

function parseCalendar($, root, year) {
  const table = wikitables($, section($, root, 'Calendar'))[0];
  if (!table) return [];
  const grid = tableGrid($, table);
  const head = grid[0];
  const col = {
    round: columnIndex(head, 'round'),
    start: columnIndex(head, 'start'),
    finish: columnIndex(head, 'finish'),
    rally: columnIndex(head, 'rally'),
    hq: columnIndex(head, 'rally headquarters', 'headquarters'),
    surface: columnIndex(head, 'surface'),
    stages: columnIndex(head, 'stages'),
    distance: columnIndex(head, 'distance'),
  };
  // "Rally" also matches "Rally headquarters": take the first exact one.
  col.rally = head.findIndex((c) => c.text.toLowerCase() === 'rally');

  return grid.slice(1)
    .filter((row) => /^\d+$/.test(row[col.round]?.text ?? ''))
    .map((row) => {
      const get = (k) => (col[k] >= 0 ? row[col[k]] : null);
      return {
        round: Number(get('round').text),
        name: get('rally')?.text ?? null,
        eventArticle: cellLink($, get('rally')),
        country: flagCountry($, get('rally')?.el),
        headquarters: get('hq')?.text ?? null,
        startDate: toIsoDate(get('start')?.text, year),
        endDate: toIsoDate(get('finish')?.text, year),
        surface: get('surface')?.text ?? null,
        stages: Number(get('stages')?.text) || null,
        distanceKm: toKm(get('distance')?.text),
      };
    });
}

/** Links to each round's own article, from the "Season summary" table. */
function parseReportLinks($, root) {
  const table = wikitables($, section($, root, 'Season_summary'))[0];
  if (!table) return {};
  const grid = tableGrid($, table);
  const reportCol = columnIndex(grid[0], 'report');
  const links = {};
  for (const row of grid.slice(1)) {
    const round = Number(row[0]?.text);
    if (!round || reportCol < 0) continue;
    const t = cellLink($, row[reportCol]);
    if (t) links[round] = t;
  }
  return links;
}

/** One standings cell: position on top, points ("17+4+5") underneath. */
function parseResultCell($, cell) {
  const frac = $(cell.el).find('.sfrac').first();
  if (frac.length) {
    const parts = frac.find('span[style*="display:block"]').toArray().map((s) => cleanText($, s));
    const result = parts.filter(Boolean)[0] ?? '';
    const points = parts.filter(Boolean)[1] ?? '';
    const nums = points.split('+').map(Number).filter((n) => !Number.isNaN(n));
    return { result, points: nums.reduce((a, b) => a + b, 0) };
  }
  return cell.text ? { result: cell.text, points: null } : null;
}

function parseStandings($, root, sectionId, kind) {
  const table = wikitables($, section($, root, sectionId))[0];
  if (!table) return [];
  const grid = tableGrid($, table);
  const head = grid[0];
  const nameCol = 1;
  const pointsCol = head.findIndex((c) => c.text.toLowerCase().startsWith('points'));
  const roundCols = head.map((c, i) => ({ code: c.text, i }))
    .filter(({ i }) => i > nameCol && i !== pointsCol);

  return grid.slice(1)
    .filter((row) => /^\d+$/.test(row[0]?.text ?? '') && row[nameCol])
    .map((row) => ({
      position: Number(row[0].text),
      [kind]: row[nameCol].text,
      article: cellLink($, row[nameCol]),
      country: flagCountry($, row[nameCol].el),
      points: Number(row[pointsCol]?.text) || 0,
      rounds: Object.fromEntries(roundCols.map(({ code, i }) => [code, row[i] ? parseResultCell($, row[i]) : null])),
    }));
}

export function parseSeason(html, year) {
  const $ = load(html);
  const root = $.root();
  const calendar = parseCalendar($, root, year);
  const reports = parseReportLinks($, root);
  for (const r of calendar) r.article = reports[r.round] ?? null;

  return {
    year,
    calendar,
    standings: {
      drivers: parseStandings($, root, 'FIA_World_Rally_Championship_for_Drivers', 'driver'),
      codrivers: parseStandings($, root, 'FIA_World_Rally_Championship_for_Co-Drivers', 'codriver'),
      manufacturers: parseStandings($, root, 'FIA_World_Rally_Championship_for_Manufacturers', 'manufacturer'),
    },
  };
}
