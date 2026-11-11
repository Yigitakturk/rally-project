// Reads Wikipedia's "List of World Rally Championship ... champions" articles.
import { load, tableGrid, linkTitle, flagCountry } from '../html.js';

export const CHAMPION_LISTS = {
  drivers: "List of World Rally Championship Drivers' champions",
  codrivers: "List of World Rally Championship Co-Drivers' champions",
  manufacturers: "List of World Rally Championship Manufacturers' champions",
};

/** [{ season, name, article, country, car }] from the first table that has a Season/Year column. */
export function parseChampions(html) {
  const $ = load(html);
  for (const table of $('table.wikitable').toArray()) {
    const grid = tableGrid($, table);
    const head = grid[0]?.map((c) => c.text.toLowerCase()) ?? [];
    const seasonCol = head.findIndex((t) => t === 'season' || t === 'year');
    if (seasonCol < 0) continue;
    const nameCol = head.findIndex((t) => /^(driver|co-driver|manufacturers'? champions?)/.test(t));
    const countryCol = head.indexOf('country');
    const carCol = head.findIndex((t) => t.startsWith('car'));
    if (nameCol < 0) continue;

    return grid.slice(1)
      .filter((row) => /^\d{4}$/.test(row[seasonCol]?.text ?? ''))
      .map((row) => {
        const cell = row[nameCol];
        const a = $(cell.el).find('a').toArray().find((x) => linkTitle($, x) && !$(x).closest('.flagicon').length);
        return {
          season: Number(row[seasonCol].text),
          name: cell.text.replace(/\s*\[[a-z]{2}\]$/, ''),
          article: a ? linkTitle($, a) : null,
          country: countryCol >= 0 ? row[countryCol].text || null : flagCountry($, cell.el),
          car: carCol >= 0 ? row[carCol]?.text || null : null,
        };
      });
  }
  return [];
}
