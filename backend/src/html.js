// Small helpers for reading Wikipedia's HTML: finding a section by its
// heading and turning a table into a simple grid of cells.
import * as cheerio from 'cheerio';

export function load(html) {
  return cheerio.load(html);
}

function headingLevel($, el) {
  const node = $(el);
  const h = node.is('h1,h2,h3,h4,h5,h6') ? node : node.children('h1,h2,h3,h4,h5,h6').first();
  return h.length ? Number(h[0].tagName.slice(1)) : 0;
}

function headingWrapper($, h) {
  const parent = $(h).parent();
  return parent.hasClass('mw-heading') ? parent : $(h);
}

/**
 * All top-level elements that belong to the section whose heading id matches
 * `id` (or whose text matches), stopping at the next heading of the same or
 * higher level. Returns a cheerio collection.
 */
export function section($, root, match) {
  const headings = $(root).find('h2,h3,h4,h5').toArray();
  const h = headings.find((el) => {
    const id = $(el).attr('id') ?? '';
    const text = $(el).text().trim();
    return typeof match === 'string' ? id === match || text === match : match.test(text) || match.test(id);
  });
  if (!h) return null;
  const level = Number(h.tagName.slice(1));
  const out = [];
  let node = headingWrapper($, h).next();
  while (node.length) {
    const l = headingLevel($, node[0]);
    if (l && l <= level) break;
    out.push(node[0]);
    node = node.next();
  }
  return $(out);
}

/** Sub-sections directly below `match` (e.g. the class blocks under "Report"). */
export function subsections($, root, parentMatch) {
  const body = section($, root, parentMatch);
  if (!body) return [];
  const result = [];
  body.each((_, el) => {
    const l = headingLevel($, el);
    if (!l) return;
    const h = $(el).is('h1,h2,h3,h4,h5,h6') ? $(el) : $(el).children().first();
    result.push({ id: h.attr('id'), title: h.text().trim(), level: l });
  });
  const top = Math.min(...result.map((r) => r.level));
  return result.filter((r) => r.level === top);
}

export function cleanText($, el) {
  const c = $(el).clone();
  c.find('sup.reference, .reference, style, .sortkey, [style*="display:none"]').remove();
  return c.text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/** Wikipedia article title a link points to, or null for red/external links. */
export function linkTitle($, a) {
  const href = $(a).attr('href') ?? '';
  if (!href.startsWith('/wiki/') || $(a).hasClass('new')) return null;
  const title = decodeURIComponent(href.slice(6).split('#')[0]).replace(/_/g, ' ');
  if (/^(File|Help|Template|Wikipedia|Special|Category):/.test(title)) return null;
  return title;
}

/** Country of a flag icon inside a cell, e.g. "Sweden". */
export function flagCountry($, el) {
  const flag = $(el).find('.flagicon').first();
  if (!flag.length) return null;
  const a = flag.find('a').first();
  const raw = a.attr('title') ?? flag.find('img').attr('alt') ?? '';
  return raw.replace(/^Flag of (the )?/i, '').trim() || null;
}

/**
 * Turns a <table> into rows of cells, copying cells that span several rows or
 * columns so every row has the same shape. Each cell: { el, text, header }.
 */
export function tableGrid($, table) {
  const grid = [];
  $(table).children('tbody, thead').children('tr').add($(table).children('tr')).each((r, tr) => {
    grid[r] ??= [];
    let c = 0;
    $(tr).children('th,td').each((_, cell) => {
      while (grid[r][c]) c++;
      const rows = Number($(cell).attr('rowspan') ?? 1) || 1;
      const cols = Number($(cell).attr('colspan') ?? 1) || 1;
      const value = { el: cell, text: cleanText($, cell), header: cell.tagName === 'th' };
      for (let dr = 0; dr < rows; dr++) {
        grid[r + dr] ??= [];
        for (let dc = 0; dc < cols; dc++) grid[r + dr][c + dc] = value;
      }
      c += cols;
    });
  });
  return grid.filter((row) => row && row.length);
}

/** Wikitables found inside a section (nested layout tables are skipped). */
export function wikitables($, nodes) {
  if (!nodes) return [];
  return nodes.find('table.wikitable').add(nodes.filter('table.wikitable')).toArray();
}

/** "3:21:08.9" or "48:13.9" → seconds (number), else null. */
export function toSeconds(text) {
  const m = /^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/.exec((text ?? '').trim());
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** "305.34 km" → 305.34 */
export function toKm(text) {
  const m = /([\d.,]+)\s*km/.exec(text ?? '');
  return m ? Number(m[1].replace(',', '')) : null;
}

/** Turn a name into a safe id for the database, e.g. "Sébastien Ogier" → "sebastien-ogier". */
export function slug(text) {
  return (text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * The article as a tree of sections: { title, id, level, nodes, children }.
 * `nodes` are the elements directly inside the section (before any sub-section).
 * The root (level 1) holds the intro, including the infobox.
 */
export function outline($) {
  const container = $('.mw-parser-output').first();
  const top = container.length ? container.children() : $.root().children();
  const root = { title: '', id: '', level: 1, nodes: [], children: [] };
  const stack = [root];
  top.each((_, el) => {
    const level = headingLevel($, el);
    if (level) {
      const h = $(el).is('h1,h2,h3,h4,h5,h6') ? $(el) : $(el).children('h1,h2,h3,h4,h5,h6').first();
      const node = { title: h.text().trim(), id: h.attr('id') ?? '', level, nodes: [], children: [] };
      while (stack.at(-1).level >= level) stack.pop();
      stack.at(-1).children.push(node);
      stack.push(node);
    } else {
      stack.at(-1).nodes.push(el);
    }
  });
  return root;
}

/** First child section (searching deeper too) whose title matches. */
export function findSection(tree, match) {
  for (const child of tree.children) {
    if (typeof match === 'string' ? child.title === match : match.test(child.title)) return child;
    const deeper = findSection(child, match);
    if (deeper) return deeper;
  }
  return null;
}

/** All wikitables directly in a section (not in its sub-sections). */
export function sectionTables($, sec) {
  if (!sec) return [];
  const nodes = $(sec.nodes);
  return nodes.filter('table.wikitable').add(nodes.find('table.wikitable')).toArray();
}
