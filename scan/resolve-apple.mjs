// One-off helper: Apple Music album IDs, (1) by UPC (Deezer-verified, label Exploited), (2) by name search for the rest.
import { readFile, writeFile } from 'node:fs/promises';
const items = JSON.parse(await readFile(new URL('./upcs.json', import.meta.url), 'utf8'));
const prev = JSON.parse(await readFile(new URL('./apple.json', import.meta.url), 'utf8').catch(() => '{}'));
const out = { ...prev };
const get = async (u) => { try { return await (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } })).json(); } catch { return {}; } };
const SEARCH = { bj01: 'Black Jukebox 01', bj02: 'Black Jukebox 02', bj03: 'Black Jukebox 03', bj04: 'Black Jukebox 04', bj17: 'Black Jukebox 17', bj25: 'Black Jukebox 25', exp: 'Shir Khan presents Exploited', max: 'Shir Khan Maximize' };
const found = {};
for (const [k, term] of Object.entries(SEARCH)) {
  found[k] = [];
  for (const c of ['us', 'de', 'gb']) {
    const j = await get(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=50&country=${c}`);
    for (const r of j.results ?? []) if (/jukebox|exploited|maximize/i.test(r.collectionName) && !found[k].some((x) => x.id === r.collectionId)) found[k].push({ id: r.collectionId, name: r.collectionName, artist: r.artistName, label: r.copyright, country: c });
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(k, JSON.stringify(found[k].slice(0, 8)));
}
await writeFile(new URL('./apple-search.json', import.meta.url), JSON.stringify(found, null, 1) + '\n');
