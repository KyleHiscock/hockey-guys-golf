# Hockey Guys Golf League v4.9.8 — 9-Hole Handicap / Net Score Fix

This update corrects the 9-hole handicap calculation used for individual net scores, stat cards, and latest-results player totals.

## Fix

The prior build was taking the displayed 18-hole course handicap, halving it for 9 holes, and rounding. For a 10.0 index on Twin Hills Black, that produced:

`9.5 / 2 = 4.75 → 5`

The corrected build mirrors the league/GHIN-style playing-handicap flow shown in the screenshots:

`displayed 18-hole course handicap → halve for 9 holes → apply 90% allowance → round`

Examples:

- 6.0 index: `5.0 / 2 × .90 = 2.25 → 2`
- 8.6 index: `7.9 / 2 × .90 = 3.555 → 4`
- 10.0 index: `9.5 / 2 × .90 = 4.275 → 4`
- 11.3 index: `10.9 / 2 × .90 = 4.905 → 5`

So Drexy/Bobby Drexler at a 10.0 index receives 4 strokes, and a 39 gross displays as 35 net.

## Included

- Keeps v4.9.7 full league Bar Attendance and Handicap Tracker
- Keeps latest results team logo support
- Keeps faster cached loading
- Updates cache-busting query strings to v4.9.8

No Apps Script redeploy required.
