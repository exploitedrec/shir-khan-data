# shir-khan-data

Public data feed for **www.djshirkhan.com**. A GitHub Action runs twice a day, collects Shir Khan's
DJ mixes and releases, and commits JSON files the website reads at runtime. No keys, no secrets.

| File | Content | Source |
|---|---|---|
| `data/mixes.json` | All Apple Music DJ mixes, newest first (show date from the title) | iTunes lookup, artist 252870689 |
| `data/releases.json` | All Shir Khan releases incl. pre-orders, with store links | Bandcamp `shirkhanofficial`, Apple, exploitedghetto.de, Deezer (UPC) |
| `data/upcoming.json` | Announced releases not out yet (generated) | `upcoming.manual.json` + pre-orders |
| `data/upcoming.manual.json` | **Edit by hand** to announce a release early | you |

Website URLs (raw, cached by the site for 1 hour):

- https://raw.githubusercontent.com/exploitedrec/shir-khan-data/main/data/mixes.json
- https://raw.githubusercontent.com/exploitedrec/shir-khan-data/main/data/releases.json
- https://raw.githubusercontent.com/exploitedrec/shir-khan-data/main/data/upcoming.json

## How it behaves

- A new mix on Apple Music appears on the site within about 12 hours and becomes the featured mix under **Latest**.
- A new release appears once it is on Bandcamp, Apple Music, or posted on exploitedghetto.de (category *Releases*,
  title containing "Shir Khan"). Pre-orders show as **Coming soon** and move into the release list on release day.
- Store links: Deezer and Apple are resolved by title/UPC. Spotify, Beatport, and Traxsource start as search links;
  replace them with the exact URL in `releases.json` if you want.
- Nothing is deleted automatically. If a source fails, the previous data stays, and the run only fails (GitHub sends
  an e-mail) when every source fails.

## Announce a release by hand

Edit `data/upcoming.manual.json` on github.com (pencil icon) and commit; the Action runs immediately:

```json
[{ "title": "Shir Khan Presents Welt Am Draht 2026", "date": "2027-01-27", "label": "Exploited", "url": null, "cover": null }]
```

Run it manually any time: **Actions → Update data → Run workflow**.
