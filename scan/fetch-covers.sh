#!/usr/bin/env bash
# One-off: download vinyl-only artwork sources so they can be cropped to uniform square tiles.
set -euo pipefail
cd "$(dirname "$0")/covers"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36"
get() { curl -fsSL -A "$UA" -e "$3" -o "$1" "$2" && echo "ok $1 $(stat -c %s "$1")" || echo "FAIL $1"; }
get bj02.jpg https://exploitedghetto.de/wp-content/uploads/2020/11/EXPDIGITAL208_EXPLOITED_GHETTO_VOL6-26.jpg https://exploitedghetto.de/
get bj03.jpg https://exploitedghetto.de/wp-content/uploads/2020/11/EXPDIGITAL208_EXPLOITED_GHETTO_VOL6-25.jpg https://exploitedghetto.de/
get bj04.jpg https://exploitedghetto.de/wp-content/uploads/2012/08/EXPDIGITAL208_EXPLOITED_GHETTO_VOL6-30.jpg https://exploitedghetto.de/
get bj17.jpg https://exploitedghetto.de/wp-content/uploads/2017/02/EXPDIGITAL208_EXPLOITED_GHETTO_VOL6-28.jpg https://exploitedghetto.de/
get bj25.jpg https://exploitedghetto.de/wp-content/uploads/2020/11/EXPDIGITAL208_EXPLOITED_GHETTO_VOL6-6.jpg https://exploitedghetto.de/
get maximize.jpg https://exploitedghetto.de/wp-content/uploads/3.jpg https://exploitedghetto.de/
get bj34.jpg https://gfx9.decks.de/decks/gfx/co_large/front/end_8/cjy-18.jpg https://www.decks.de/
