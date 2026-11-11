// Reads one rally's Wikipedia article, e.g. "2025 Rally Japan".
import {
  load, outline, findSection, sectionTables, tableGrid, linkTitle, flagCountry,
  cleanText, toSeconds, toKm,
} from '../html.js';

/** People/teams/cars linked in a cell: [{ name, article }] (flags skipped). */
function links($, cell) {
  if (!cell) return [];
  return $(cell.el).find('a').toArray()
    .filter((a) => !$(a).closest('.flagicon').length && linkTitle($, a))
    .map((a) => ({ name: cleanText($, a), article: linkTitle($, a) }));
}

function person($, cell) {
  if (!cell) return null;
  const first = links($, cell)[0];
  return {
    name: cell.text || first?.name || null,
    article: first?.article ?? null,
    country: flagCountry($, cell.el),
  };
}

function column(headRows, ...names) {
  const width = Math.max(...headRows.map((r) => r.length));
  for (let i = 0; i < width; i++) {
    const texts = headRows.map((r) => (r[i]?.text ?? '').toLowerCase());
    if (names.some((n) => texts.some((t) => t === n || t.startsWith(n)))) return i;
  }
  return -1;
}

/** Splits a grid into header rows (all <th>) and data rows. */
function splitGrid(grid, { keepFullWidth = false } = {}) {
  let h = 0;
  while (h < grid.length && grid[h].every((c) => c.header)) h++;
  // A row that is one cell across the whole table is a note ("Source: ...")
  // or a group title, not a result.
  const body = grid.slice(h).filter((row) => keepFullWidth || row.length < 2 || !row.every((c) => c === row[0]));
  return { head: grid.slice(0, h), body };
}

function parseInfobox($, root) {
  const box = $(root.nodes).filter('table.infobox').add($(root.nodes).find('table.infobox')).first();
  const info = {};
  box.find('tr').each((_, tr) => {
    const label = $(tr).children('th.infobox-label').first();
    const value = $(tr).children('td.infobox-data').first();
    if (label.length && value.length) info[cleanText($, label)] = { el: value[0], text: cleanText($, value) };
  });
  const stagesText = info['Stages']?.text ?? '';
  return {
    country: info['Host country']?.text ?? null,
    rallyBase: info['Rally base']?.text ?? null,
    datesText: info['Dates run']?.text ?? null,
    surface: info['Stage surface']?.text ?? null,
    stages: Number(/^\d+/.exec(stagesText)?.[0]) || null,
    stageKm: toKm(stagesText),
    crewsRegistered: Number(/^\d+/.exec(info['Crews registered']?.text ?? '')?.[0]) || null,
    crewsText: info['Crews']?.text ?? null,
    powerStageWinner: info['Power Stage winner'] ? links($, info['Power Stage winner']).map((l) => l.name) : [],
  };
}

function parseEntries($, tree) {
  const sec = findSection(tree, /^Entry list$/i);
  const entries = [];
  for (const table of sectionTables($, sec)) {
    const caption = cleanText($, $(table).children('caption'));
    const { head, body } = splitGrid(tableGrid($, table), { keepFullWidth: true });
    const col = {
      no: column(head, 'no.'),
      driver: column(head, 'driver'),
      codriver: column(head, 'co-driver'),
      entrant: column(head, 'entrant'),
      car: column(head, 'car'),
      tyre: column(head, 'tyre'),
    };
    if (col.driver < 0) continue;
    let group = caption.replace(/\s*entries.*$/i, '').trim() || null;
    for (const row of body) {
      // A full-width row is a group title, e.g. "World Rally Championship entries".
      if (row.every((c) => c === row[0])) {
        group = row[0].text.replace(/\s*entries.*$/i, '').trim() || group;
        continue;
      }
      if (!row[col.driver]?.text) continue;
      entries.push({
        group,
        number: row[col.no]?.text ?? null,
        driver: person($, row[col.driver]),
        codriver: person($, row[col.codriver]),
        entrant: {
          name: row[col.entrant]?.text ?? null,
          article: links($, row[col.entrant])[0]?.article ?? null,
          country: row[col.entrant] ? flagCountry($, row[col.entrant].el) : null,
        },
        car: { name: row[col.car]?.text ?? null, article: links($, row[col.car])[0]?.article ?? null },
        tyre: col.tyre >= 0 ? row[col.tyre]?.text || $(row[col.tyre].el).find('a').attr('title') || null : null,
      });
    }
  }
  return entries;
}

function parseItinerary($, tree) {
  const sec = findSection(tree, /^(Itinerary|Route)$/i);
  const table = sectionTables($, sec)[0] ?? sectionTables($, sec?.children?.[0])[0];
  if (!table) return [];
  const { head, body } = splitGrid(tableGrid($, table));
  const col = {
    date: column(head, 'date'),
    no: column(head, 'no.', 'stage'),
    time: column(head, 'time'),
    name: column(head, 'stage name', 'name'),
    distance: column(head, 'distance'),
  };
  return body
    .filter((row) => /^(SS\d+|SD)/i.test(row[col.no]?.text ?? '') || /shakedown/i.test(row[col.name]?.text ?? ''))
    .map((row) => ({
      day: row[col.date]?.text ?? null,
      stage: /shakedown/i.test(row[col.name]?.text ?? '') ? 'SD' : row[col.no].text,
      time: row[col.time]?.text ?? null,
      name: (row[col.name]?.text ?? '').replace(/\s*\[.*?\]\s*/g, ' ').trim(),
      powerStage: /power stage/i.test(row[col.name]?.text ?? ''),
      distanceKm: toKm(row[col.distance]?.text),
    }));
}

function parseClassification($, sec) {
  const table = sectionTables($, sec)[0];
  if (!table) return [];
  const { head, body } = splitGrid(tableGrid($, table));
  const col = {
    no: column(head, 'no.'),
    driver: column(head, 'driver'),
    codriver: column(head, 'co-driver'),
    entrant: column(head, 'entrant'),
    car: column(head, 'car'),
    time: column(head, 'time'),
    diff: column(head, 'difference'),
    total: head.length ? head[0].length - 1 : -1,
  };
  const pointsStart = column(head, 'points');
  return body
    .filter((row) => row[col.driver]?.text && row.length > col.driver)
    .map((row) => {
      const pos = row[0]?.text ?? '';
      const retired = /^ret/i.test(pos);
      const finished = /^\d+$/.test(pos);
      return {
        position: finished ? Number(pos) : null,
        classPosition: finished && /^\d+$/.test(row[1]?.text ?? '') ? Number(row[1].text) : null,
        status: finished ? 'finished' : retired ? 'retired' : pos || null,
        retiredOn: retired ? (/(SS\d+)/i.exec(pos)?.[1] ?? null) : null,
        number: row[col.no]?.text ?? null,
        driver: person($, row[col.driver]),
        codriver: person($, row[col.codriver]),
        entrant: { name: row[col.entrant]?.text ?? null, article: links($, row[col.entrant])[0]?.article ?? null },
        car: { name: row[col.car]?.text ?? null, article: links($, row[col.car])[0]?.article ?? null },
        time: finished ? row[col.time]?.text ?? null : null,
        timeSeconds: finished ? toSeconds(row[col.time]?.text) : null,
        gap: finished ? row[col.diff]?.text ?? null : null,
        reason: retired ? row[col.time]?.text ?? null : null,
        points: pointsStart >= 0 ? Number(row[col.total]?.text) || 0 : null,
      };
    });
}

function parseStageWinners($, sec) {
  const table = sectionTables($, sec)[0];
  if (!table) return [];
  const { head, body } = splitGrid(tableGrid($, table));
  const col = {
    stage: column(head, 'stage', 'no.'),
    name: column(head, 'stage name'),
    winners: column(head, 'winner'),
    car: column(head, 'car'),
    time: column(head, 'time'),
    leaders: column(head, 'class leader', 'rally leader', 'leader'),
  };
  const isShakedown = (row) => /^SD$/i.test(row[col.stage]?.text ?? '') ||
    (col.name >= 0 && /shakedown/i.test(row[col.name]?.text ?? ''));
  return body
    .filter((row) => /^SS\d+$/i.test(row[col.stage]?.text ?? '') || isShakedown(row))
    .map((row) => {
      const winners = links($, row[col.winners]);
      const leaders = links($, row[col.leaders]);
      return {
        stage: isShakedown(row) ? 'SD' : row[col.stage].text.toUpperCase(),
        winners,
        winnersText: row[col.winners]?.text ?? null,
        car: row[col.car]?.text ?? null,
        time: row[col.time]?.text ?? null,
        leaders,
        leadersText: col.leaders >= 0 ? row[col.leaders]?.text ?? null : null,
      };
    });
}

/** Results per class ("WRC Rally1", "WRC2 Rally2", ...) from the Report section. */
function parseClasses($, tree) {
  const report = findSection(tree, /^(Report|Results)$/i);
  if (!report) return [];
  return report.children
    .map((cls) => ({
      name: cls.title,
      classification: parseClassification($, findSection(cls, /^Classification$/i)),
      stages: parseStageWinners($, findSection(cls, /^Special stages$/i)),
    }))
    .filter((c) => c.classification.length || c.stages.length);
}

export function parseRally(html) {
  const $ = load(html);
  const tree = outline($);
  return {
    ...parseInfobox($, tree),
    entries: parseEntries($, tree),
    itinerary: parseItinerary($, tree),
    classes: parseClasses($, tree),
  };
}
