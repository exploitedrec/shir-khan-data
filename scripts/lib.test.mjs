import test from 'node:test';
import assert from 'node:assert/strict';
import { showDate, splitApple, mergeMixes, parseBandcampMusic, parseExploitedPosts, releaseKey, titleCase, isShirKhanRelease } from './lib.mjs';

test('showDate reads the show date from mix titles', () => {
  assert.equal(showDate('World On A Wire With Shir Khan: Jul 10, 2026 (DJ Mix)'), '2026-07-10');
  assert.equal(showDate('World On A Wire With Shir Khan: Dec, 10, 2023 (DJ Mix)'), '2023-12-10');
  assert.equal(showDate('World On A Wire With Shir Khan: July 10, 2024 (DJ Mix)'), '2024-07-10');
  assert.equal(showDate('EXPLOITED Radio: Shir Khan (DJ Mix)'), null);
});

test('splitApple separates DJ mixes from releases and drops storefronts', () => {
  const { mixes, albums } = splitApple({ results: [
    { wrapperType: 'artist', artistName: 'Shir Khan' },
    { wrapperType: 'collection', collectionType: 'Album', collectionId: 1, collectionName: 'World On A Wire With Shir Khan: Nov 13, 2026 (DJ Mix)', releaseDate: '2026-11-20T08:00:00Z', collectionViewUrl: 'https://music.apple.com/de/album/world-on-a-wire-nov-13-2026-dj-mix/1?uo=4', artworkUrl100: 'https://is1-ssl.mzstatic.com/x/100x100bb.jpg' },
    { wrapperType: 'collection', collectionType: 'Album', collectionId: 2, collectionName: 'Shir Khan Presents Welt Am Draht 2026', releaseDate: '2027-01-27T08:00:00Z', collectionViewUrl: 'https://music.apple.com/us/album/welt/2', artworkUrl100: 'https://is1-ssl.mzstatic.com/y/100x100bb.jpg' },
  ] });
  assert.deepEqual(mixes, [{ title: 'World On A Wire With Shir Khan: Nov 13, 2026 (DJ Mix)', date: '2026-11-13', collectionId: '1', path: 'world-on-a-wire-nov-13-2026-dj-mix/1', url: 'https://music.apple.com/album/world-on-a-wire-nov-13-2026-dj-mix/1', cover: 'https://is1-ssl.mzstatic.com/x/600x600bb.jpg' }]);
  assert.equal(albums[0].date, '2027-01-27');
  assert.equal(albums[0].url, 'https://music.apple.com/album/2');
  assert.throws(() => splitApple({ nope: true }));
});

test('mergeMixes keeps old mixes and sorts newest first', () => {
  const merged = mergeMixes([{ collectionId: 'a', date: '2026-01-09' }], [{ collectionId: 'b', date: '2026-11-13' }, { collectionId: 'a', date: '2026-01-09', title: 'updated' }]);
  assert.deepEqual(merged.map((m) => m.collectionId), ['b', 'a']);
  assert.equal(merged[1].title, 'updated');
});

test('parseBandcampMusic reads the grid JSON', () => {
  const json = JSON.stringify([
    { type: 'album', title: 'Shir Khan Presents Welt Am Draht 2026', page_url: '/album/shir-khan-presents-welt-am-draht-2026', art_id: 123, release_date: '27 Jan 2027 00:00:00 GMT', publish_date: '01 Dec 2026 10:00:00 GMT' },
    { type: 'album', title: 'Private', page_url: '/album/x', private: true },
  ]).replace(/"/g, '&quot;').replace(/&(?!quot;)/g, '&amp;');
  const items = parseBandcampMusic(`<ol id="music-grid" data-initial-values="${json}"></ol>`);
  assert.deepEqual(items, [{ title: 'Shir Khan Presents Welt Am Draht 2026', slug: 'shir-khan-presents-welt-am-draht-2026', url: 'https://shirkhanofficial.bandcamp.com/album/shir-khan-presents-welt-am-draht-2026', art: '0000000123', date: '2027-01-27' }]);
  assert.throws(() => parseBandcampMusic('<html></html>'));
});

test('parseExploitedPosts keeps Shir Khan release posts and cleans titles', () => {
  const posts = [
    { title: { rendered: 'OUT TODAY: SHIR KHAN PRESENTS WELT AM DRAHT 2026' }, categories: [28, 31], link: 'https://exploitedghetto.de/w/', date: '2027-01-27T10:00:00' },
    { title: { rendered: 'OUT TODAY ON BEATPORT: SHIR KHAN PRESENTS EXPLOITED GHETTO TRAX VOL. 3' }, categories: [31], link: 'https://exploitedghetto.de/g/', date: '2017-11-13T10:00:00' },
    { title: { rendered: 'SHIR KHAN WATERGATE SET' }, categories: [5], link: 'x', date: '2018-06-13T10:00:00' },
    { title: { rendered: 'Joyce Muniz &#8211; Crystalline' }, categories: [31], link: 'y', date: '2021-04-06T10:00:00' },
  ];
  assert.deepEqual(parseExploitedPosts(posts).map((p) => p.title), ['Shir Khan Presents Welt Am Draht 2026', 'Shir Khan Presents Exploited Ghetto Trax vol. 3']);
});

test('releaseKey matches the same release across stores', () => {
  assert.equal(releaseKey('Shir Khan Presents Black Jukebox 35 (Ralph Session)'), releaseKey('SHIR KHAN PRESENTS BLACK JUKEBOX 35'));
  assert.equal(releaseKey('Shir Khan Presents Exploited Ghetto Trax, Vol. 2'), releaseKey('Shir Khan Presents Exploited Ghetto Trax Vol. 02'));
  assert.equal(releaseKey('Shir Khan Presents Secret Gold, Vol. 7'), releaseKey('Shir Khan Presents Secret Gold 07'));
  assert.equal(releaseKey('Shir Khan Presents Dancing &amp; Romancing (Double CD)'), releaseKey('Shir Khan Presents Dancing & Romancing'));
  assert.notEqual(releaseKey('Shir Khan Presents Welt Am Draht 2025'), releaseKey('Shir Khan Presents Welt Am Draht 2026'));
});

test('titleCase and isShirKhanRelease', () => {
  assert.equal(titleCase('SHIR KHAN PRESENTS EXPLOITED 2017 FFWD RWD'), 'Shir Khan Presents Exploited 2017 FFWD RWD');
  assert.equal(titleCase('Mixed Case stays'), 'Mixed Case stays');
  assert.ok(isShirKhanRelease('#EXPLOITED 2014 FFWD RWD'));
  assert.ok(!isShirKhanRelease('Joyce Muniz – Crystalline'));
});
