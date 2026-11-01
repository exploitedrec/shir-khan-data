// Pure parsing helpers for the Shir Khan data pipeline (no network; unit-tested in scripts/lib.test.mjs).

export const APPLE_ARTIST_ID = 252870689;
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Apple's releaseDate is sometimes the upload date; the show date in the title is the real one. */
export function showDate(title) {
  const m = /(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{1,2}),?\s+(\d{4})/i.exec(title);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
}

const isoDay = (value) => {
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
};

/** Storefront-free Apple path, e.g. "world-on-a-wire-…-dj-mix/1876606872". */
export function applePath(viewUrl) {
  try {
    const url = new URL(viewUrl);
    if (url.hostname !== 'music.apple.com') return null;
    return url.pathname.split('/album/')[1]?.replace(/\/$/, '') || null;
  } catch {
    return null;
  }
}

/** Splits an iTunes lookup payload into DJ mixes and other releases. */
export function splitApple(payload) {
  if (!payload || !Array.isArray(payload.results)) throw new Error('Invalid Apple response');
  const mixes = [];
  const albums = [];
  for (const r of payload.results) {
    if (r.wrapperType !== 'collection' && r.collectionType !== 'Album') continue;
    const { collectionName: name, releaseDate, collectionId: id, collectionViewUrl, artworkUrl100: art } = r;
    if (typeof name !== 'string' || typeof id !== 'number' || typeof collectionViewUrl !== 'string') continue;
    const path = applePath(collectionViewUrl);
    const date = isoDay(releaseDate);
    if (!path || !date) continue;
    const cover = typeof art === 'string' ? art.replace('100x100bb', '600x600bb').replace('100x100', '600x600') : '';
    if (name.includes('(DJ Mix)')) {
      mixes.push({ title: name, date: showDate(name) ?? date, collectionId: String(id), path, url: `https://music.apple.com/album/${path}`, cover });
    } else {
      albums.push({ title: name, date, collectionId: String(id), url: `https://music.apple.com/album/${id}`, cover });
    }
  }
  return { mixes, albums };
}

/** Keeps every mix ever seen (Apple occasionally hides items), newest first. */
export function mergeMixes(previous, live) {
  const byId = new Map(previous.map((m) => [m.collectionId, m]));
  live.forEach((m) => byId.set(m.collectionId, m));
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || b.collectionId.localeCompare(a.collectionId));
}

/** Bandcamp /music page: the grid carries a JSON list in data-initial-values. */
export function parseBandcampMusic(html, base = 'https://shirkhanofficial.bandcamp.com') {
  const m = /data-initial-values=["']([^"']*)["']/.exec(html);
  if (!m) {
    // Older/lighter page variant: plain grid items without the JSON blob.
    const items = [...html.matchAll(/<li[^>]*data-item-id="(?:album|track)-\d+"[^>]*>[\s\S]*?<a href="([^"]+)"[\s\S]*?(?:data-original|src)="[^"]*\/img\/a(\d+)_\d+\.jpg"[\s\S]*?<p class="title">\s*([\s\S]*?)\s*(?:<br|<\/p>)/g)];
    if (!items.length) throw new Error(`Bandcamp grid not found (${html.length} bytes, title: ${/<title>([^<]*)/.exec(html)?.[1] ?? '?'})`);
    return items.map(([, href, art, title]) => ({ title: decodeEntities(title.replace(/<[^>]+>/g, '').trim()), slug: href.split('/').filter(Boolean).at(-1), url: new URL(href, base).href, art, date: null }));
  }
  const json = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const items = JSON.parse(json);
  return items
    .filter((i) => i && (i.type === 'album' || i.type === 'track') && !i.private && typeof i.page_url === 'string')
    .map((i) => ({
      title: String(i.title).trim(),
      slug: i.page_url.split('/').filter(Boolean).at(-1),
      url: new URL(i.page_url, base).href,
      art: i.art_id ? String(i.art_id).padStart(10, '0') : null,
      date: isoDay(i.release_date) ?? isoDay(i.publish_date),
    }));
}

/** Bandcamp mobile API (band_details): discography with release dates, no page URLs. */
export function parseBandcampDiscography(payload, base = 'https://shirkhanofficial.bandcamp.com') {
  if (!payload || !Array.isArray(payload.discography)) throw new Error('Invalid Bandcamp discography');
  return payload.discography
    .filter((d) => d && d.title && (d.item_type === 'album' || d.item_type === 'track'))
    .map((d) => {
      const slug = String(d.title).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return { title: String(d.title).trim(), slug, url: `${base}/${d.item_type}/${slug}`, art: d.art_id ? String(d.art_id).padStart(10, '0') : null, date: isoDay(d.release_date) };
    });
}

const ENTITIES = { '&amp;': '&', '&#038;': '&', '&#8211;': '–', '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”', '&#8230;': '…', '&quot;': '"', '&#039;': "'" };
export const decodeEntities = (s) => String(s).replace(/&(?:amp|quot|#0?38|#039|#82(?:11|16|17|20|21|30));/g, (e) => ENTITIES[e] ?? e);

const SMALL = new Set(['a', 'am', 'and', 'of', 'the', 'on', 'in', 'vol.']);
/** "SHIR KHAN PRESENTS WELT AM DRAHT 2026" → "Shir Khan Presents Welt Am Draht 2026"; mixed-case titles stay as they are. */
export function titleCase(s) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(' ').map((w, i) => (i > 0 && SMALL.has(w) && w !== 'am' ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase()))).join(' ')
    .replace(/\bFfwd Rwd\b/, 'FFWD RWD');
}

/** Exploited WordPress posts → Shir Khan release announcements. */
export function parseExploitedPosts(posts, releaseCategoryId = 31) {
  if (!Array.isArray(posts)) return [];
  return posts
    .filter((p) => /shir\s*khan/i.test(decodeEntities(p?.title?.rendered ?? '')) && Array.isArray(p.categories) && p.categories.includes(releaseCategoryId))
    .map((p) => {
      const raw = decodeEntities(p.title.rendered).trim();
      const stripped = raw.replace(/^(?:OUT\s+(?:TODAY|NOW)|NEW(?:\s+RELEASE)?|COMING\s+SOON)(?:\s+ON\s+\w+)?\s*[:\-–]\s*/i, '').trim();
      return { title: titleCase(stripped), url: p.link, date: isoDay(p.date) };
    });
}

/** Normalised key for de-duplicating the same release across stores. */
export function releaseKey(title) {
  return decodeEntities(title)
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/^#/, '')
    .replace(/\bvol(?:ume)?\b\.?/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(\d)\b/g, '0$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^shir khan presents /, '');
}

/** Only titles that are Shir Khan releases (not other Exploited artists). */
export const isShirKhanRelease = (title) => /shir\s*khan|exploited\s+20\d\d\s+ffwd/i.test(title);

export const searchLinks = (title) => {
  const q = encodeURIComponent(title);
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    beatport: `https://www.beatport.com/search/releases?q=${q}`,
    traxsource: `https://www.traxsource.com/search?term=${q}`,
  };
};
