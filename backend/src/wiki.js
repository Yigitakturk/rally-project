// Talks to Wikipedia's official API. Every request goes through here so we
// stay polite: one request at a time, a short pause between them, and a
// User-Agent that says who we are (Wikipedia asks all programs to do this).

const API = 'https://en.wikipedia.org/w/api.php';
const REST = 'https://en.wikipedia.org/api/rest_v1';
const USER_AGENT = 'rally-project/0.1 (https://github.com/Yigitakturk/rally-project)';
const PAUSE_MS = 1000;

let lastRequest = 0;

async function politeFetch(url) {
  const wait = lastRequest + PAUSE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  for (let attempt = 1; attempt <= 3; attempt++) {
    lastRequest = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) });
    } catch (err) {
      // Network hiccup or timeout: wait a bit and try again.
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, attempt * 5000));
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    // 429 = "too many requests", 5xx = Wikipedia is busy: wait and retry.
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
      continue;
    }
    throw new Error(`Wikipedia answered ${res.status} for ${url}`);
  }
  throw new Error(`Wikipedia did not answer after 3 tries: ${url}`);
}

/** The finished HTML of an article, or null if the article does not exist. */
export async function getArticleHtml(title) {
  const url = `${API}?action=parse&format=json&formatversion=2&redirects=1` +
    `&prop=text|revid&disableeditsection=1&page=${encodeURIComponent(title)}`;
  const data = await politeFetch(url);
  if (!data || data.error) return null;
  return { title: data.parse.title, revid: data.parse.revid, html: data.parse.text };
}

/** Short intro text and picture of an article (used for profiles). */
export async function getSummary(title) {
  const data = await politeFetch(`${REST}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!data || data.type === 'disambiguation') return null;
  return {
    title: data.title,
    description: data.description ?? null,
    extract: data.extract ?? null,
    image: data.thumbnail?.source ?? null,
    url: data.content_urls?.desktop?.page ?? null,
  };
}
