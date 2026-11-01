// One-off helper: Apple Music album IDs for a list of UPCs (Deezer-verified, label Exploited). Writes scan/apple.json.
import { readFile, writeFile } from 'node:fs/promises';
const items = JSON.parse(await readFile(new URL('./upcs.json', import.meta.url), 'utf8'));
const out = {};
for (const it of items) {
  let hit = null;
  for (const c of ['us', 'de', 'gb', 'th']) {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?upc=${it.upc}&country=${c}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
      const j = await r.json();
      hit = (j.results ?? []).find((x) => x.collectionId);
      if (hit) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  out[it.key] = hit ? { id: hit.collectionId, name: hit.collectionName, artist: hit.artistName, url: `https://music.apple.com/album/${hit.collectionId}` } : null;
  console.log(it.key, hit ? `${hit.collectionId} ${hit.collectionName}` : 'none');
}
await writeFile(new URL('./apple.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
