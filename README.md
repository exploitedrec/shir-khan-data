# shir-khan-data

Public data feed for **www.djshirkhan.com**. A GitHub Action runs twice a day, collects Shir Khan's
DJ mixes and releases, and commits JSON files the website reads at runtime. No keys, no secrets.

| File | Content | Source |
|---|---|---|
| `data/mixes.json` | All Apple Music DJ mixes, newest first (show date from the title) | iTunes lookup, artist 252870689 |
| `data/releases.json` | All Shir Khan releases incl. pre-orders, with exact store links | exploitedghetto.de release pages (Beatport, Apple, Spotify, Traxsource, Bandcamp), Apple Music, Deezer (UPC); Bandcamp when it lets the runner in |
| `data/upcoming.json` | Announced releases not out yet (generated) | `upcoming.manual.json` + pre-orders |
| `data/upcoming.manual.json` | **Edit by hand** to announce a release early | you |

Website URLs (raw, cached by the site for 1 hour):

- https://raw.githubusercontent.com/exploitedrec/shir-khan-data/main/data/mixes.json
- https://raw.githubusercontent.com/exploitedrec/shir-khan-data/main/data/releases.json
- https://raw.githubusercontent.com/exploitedrec/shir-khan-data/main/data/upcoming.json

## How it behaves

- A new mix on Apple Music appears on the site within about 12 hours and becomes the featured mix under **Latest**.
- A new release appears on its release day once it is on exploitedghetto.de/releases, Apple Music or Bandcamp
  (title containing "Shir Khan Presents"). Future-dated releases are kept in the data but not shown on the site.
- Store links are exact release links only, never search pages: taken from the release page on exploitedghetto.de
  (the "Buy on" list), plus Apple and Deezer by title/UPC. A store without an exact link is simply not shown.
- Nothing is deleted automatically. If a source fails, the previous data stays, and the run only fails (GitHub sends
  an e-mail) when every source fails.

## Announce a release by hand

Edit `data/upcoming.manual.json` on github.com (pencil icon) and commit; the Action runs immediately:

```json
[{ "title": "Shir Khan Presents Welt Am Draht 2026", "date": "2027-01-27", "label": "Exploited", "url": null, "cover": null }]
```

Run it manually any time: **Actions → Update data → Run workflow**.
