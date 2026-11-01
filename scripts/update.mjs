#!/usr/bin/env node
// Daily data job for djshirkhan.com. Runs in GitHub Actions (see .github/workflows/update.yml).
// Writes data/mixes.json, data/releases.json and data/upcoming.json. Every source is optional:
// if one fails, the previous data for it is kept and the run still succeeds.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { APPLE_ARTIST_ID, splitApple, mergeMixes, parseBandcampMusic, parseExploitedPosts, releaseKey, isShirKhanRelease, searchLinks } from './lib.mjs';

const DATA = new URL('../data/', import.meta.url);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const today = new Date().toISOString().slice(0, 10);
const log = (...a) => console.log('[update]', ...a);
const warnings = [];
const warn = (msg, err) => { warnings.push(msg); console.warn('[update] WARN', msg, err?.message ?? ''); };

async function get(url, { json = true, tries = 3 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/html' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return json ? await res.json() : await res.text();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

async function readJson(name, fallback) {
  try { return JSON.parse(await readFile(new URL(name, DATA), 'utf8')); } catch { return fallback; }
}
async function writeJson(name, value) {
  await writeFile(new URL(name, DATA), `${JSON.stringify(value, null, 2)}\n`);
}

await mkdir(DATA, { recursive: true });
const prevMixes = await readJson('mixes.json', { mixes: [] });
const prevReleases = await readJson('releases.json', { releases: [] });
const manualUpcoming = await readJson('upcoming.manual.json', []);

// 1) Apple Music: DJ mixes + albums (albums help with links/dates and pre-orders).
let apple = { mixes: [], albums: [] };
for (const country of ['us', 'de', 'gb']) {
  try {
    apple = splitApple(await get(`https://itunes.apple.com/lookup?id=${APPLE_ARTIST_ID}&entity=album&limit=200&country=${country}`));
    log(`apple ${country}: ${apple.mixes.length} mixes, ${apple.albums.length} albums`);
    break;
  } catch (err) { warn(`apple lookup (${country}) failed`, err); }
}
const mixes = mergeMixes(prevMixes.mixes ?? [], apple.mixes);

// 2) Bandcamp: the canonical release list.
let bandcamp = [];
try {
  bandcamp = parseBandcampMusic(await get('https://shirkhanofficial.bandcamp.com/music', { json: false }));
  log(`bandcamp: ${bandcamp.length} items`);
} catch (err) { warn('bandcamp scan failed', err); }

// 3) exploitedghetto.de (WordPress): release announcements mentioning Shir Khan.
let exploited = [];
try {
  const posts = await get('https://exploitedghetto.de/wp-json/wp/v2/posts?search=shir%20khan&categories=31&per_page=50&_fields=id,date,link,title,categories');
  exploited = parseExploitedPosts(posts);
  log(`exploitedghetto.de: ${exploited.length} release posts`);
} catch (err) { warn('exploitedghetto.de scan failed', err); }

// Merge everything by normalised title. Existing entries keep their resolved store links.
const byKey = new Map();
for (const r of prevReleases.releases ?? []) byKey.set(releaseKey(r.title), { ...r });
const touch = (title) => {
  const key = releaseKey(title);
  if (!byKey.has(key)) byKey.set(key, { title, slug: null, date: null, url: null, cover: null, upc: null, stores: { apple: null, spotify: null, deezer: null, beatport: null, traxsource: null }, sources: [], firstSeen: today });
  return byKey.get(key);
};
const addSource = (r, s) => { r.sources = [...new Set([...(r.sources ?? []), s])]; };

for (const b of bandcamp) {
  if (!isShirKhanRelease(b.title)) continue;
  const r = touch(b.title);
  r.slug ??= b.slug; r.url ??= b.url; r.date ??= b.date;
  if (b.art) r.cover ??= `https://f4.bcbits.com/img/a${b.art}_16.jpg`;
  addSource(r, 'bandcamp');
}
// Apple and the Exploited site also list old catalogue; from them only new titles (2026 on) are taken.
const NEW_FROM = '2026-01-01';
const isNew = (title, date) => byKey.has(releaseKey(title)) || (date ?? '') >= NEW_FROM;
for (const a of apple.albums) {
  if (!isShirKhanRelease(a.title) || !isNew(a.title, a.date)) continue;
  const r = touch(a.title);
  r.stores.apple ??= a.url; r.date ??= a.date; r.cover ??= a.cover || null;
  addSource(r, 'apple');
}
for (const p of exploited) {
  if (!isNew(p.title, p.date)) continue;
  const r = touch(p.title);
  r.exploitedUrl ??= p.url; r.date ??= p.date; r.url ??= p.url;
  addSource(r, 'exploitedghetto');
}

// Resolve missing store links for releases we have not completed yet (new ones, mostly).
async function resolveStores(r) {
  try {
    if (!r.stores.deezer || !r.upc) {
      const found = await get(`https://api.deezer.com/search/album?q=${encodeURIComponent(r.title)}&limit=10`);
      const hit = (found.data ?? []).find((d) => releaseKey(d.title) === releaseKey(r.title));
      if (hit) {
        r.stores.deezer ??= `https://www.deezer.com/album/${hit.id}`;
        const album = await get(`https://api.deezer.com/album/${hit.id}`);
        if (album.upc) r.upc ??= album.upc;
        if (!r.date && album.release_date) r.date = album.release_date;
      }
    }
    if (!r.stores.apple && r.upc) {
      const lookup = await get(`https://itunes.apple.com/lookup?upc=${r.upc}&country=us`);
      const hit = (lookup.results ?? []).find((x) => x.collectionId);
      if (hit) r.stores.apple = `https://music.apple.com/album/${hit.collectionId}`;
    }
  } catch (err) { warn(`store lookup failed for ${r.title}`, err); }
  const search = searchLinks(r.title);
  r.stores.spotify ??= search.spotify;
  r.stores.beatport ??= search.beatport;
  r.stores.traxsource ??= search.traxsource;
}
// Each release is resolved once (seeded ones already are); a null store afterwards means "not on that store".
// Unreleased titles are retried daily until release day, because stores often list them late.
for (const r of byKey.values()) {
  if (r.resolved && !(r.date && r.date >= today)) continue;
  await resolveStores(r);
  if (r.date && r.date < today) r.resolved = true;
}

// Includes future-dated pre-orders: the website shows a release from its date on, without waiting for this job.
const releases = [...byKey.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title));

// Upcoming: manual entries (until the release appears on a store) + pre-orders found on Apple/Bandcamp.
const released = new Set(releases.filter((r) => r.date && r.date <= today && (r.sources ?? []).some((s) => s !== 'seed')).map((r) => releaseKey(r.title)));
const upcomingMap = new Map();
for (const u of manualUpcoming) if (u.date >= today && !released.has(releaseKey(u.title))) upcomingMap.set(releaseKey(u.title), { ...u, source: 'manual' });
for (const r of byKey.values()) if (r.date && r.date > today) {
  const key = releaseKey(r.title);
  upcomingMap.set(key, { ...(upcomingMap.get(key) ?? {}), title: r.title, date: r.date, url: r.url ?? upcomingMap.get(key)?.url ?? null, cover: r.cover ?? upcomingMap.get(key)?.cover ?? null, stores: r.stores, source: (r.sources ?? []).join(',') });
}
const upcoming = [...upcomingMap.values()].sort((a, b) => a.date.localeCompare(b.date));

// Only rewrite a file when its content changed, so the job does not create empty daily commits.
async function save(name, key, list, previous) {
  const same = JSON.stringify(previous?.[key] ?? null) === JSON.stringify(list);
  if (same) return log(`${name}: unchanged`);
  await writeJson(name, { updated: new Date().toISOString(), count: list.length, [key]: list });
  log(`${name}: written (${list.length})`);
}
await save('mixes.json', 'mixes', mixes, prevMixes);
await save('releases.json', 'releases', releases, prevReleases);
await save('upcoming.json', 'upcoming', upcoming, await readJson('upcoming.json', null));
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [`### Shir Khan data — ${today}`, `- Mixes: ${mixes.length} (newest: ${mixes[0]?.title ?? '–'})`, `- Releases: ${releases.length}`, `- Upcoming: ${upcoming.map((u) => `${u.title} (${u.date})`).join(', ') || '–'}`, ...warnings.map((w) => `- ⚠️ ${w}`)];
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, { flag: 'a' });
}
// Fail loudly (GitHub e-mails the repo owner) when every source broke, so a silent outage gets noticed.
if (!apple.mixes.length && !bandcamp.length && !exploited.length) { console.error('[update] all sources failed'); process.exit(1); }
log(`done: ${mixes.length} mixes, ${releases.length} releases, ${upcoming.length} upcoming, ${warnings.length} warnings`);
