// One-off: are these Apple album IDs still available in the store? (lookup only returns live albums)
import { writeFile } from 'node:fs/promises';
const ids = { bj36: [1686917553, 1686892897], bj22: [1380662002, 1379805787], bj20: [1300635938, 1565837570], gt03: [1296198500, 1565810213], bj19: [1261300392, 1565837867], bj13: [1005631199, 1566009394], bj12: [1001606534, 1566037179], bj09: [903866078, 1566037053], bj07: [652839601, 1565809738], bj01: [1565837922], exp: [1566044441], bj05: [565097306, 1565838184] };
const out = {};
for (const [k, list] of Object.entries(ids)) {
  out[k] = {};
  for (const id of list) {
    const live = [];
    for (const c of ['us', 'de', 'gb', 'th', 'jp']) {
      try { const j = await (await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${c}`)).json(); if ((j.results ?? []).length) live.push(c); } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    out[k][id] = live;
    console.log(k, id, live.join(',') || 'NOT AVAILABLE');
  }
}
await writeFile(new URL('./apple-check.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
