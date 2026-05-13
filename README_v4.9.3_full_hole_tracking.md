# Hockey Guys Golf League — v4.9.3 Full-Hole Tracking Fix

Upload these files to the root of the GitHub Pages repository:

- admin.html
- index.html
- admin.js
- public.js
- polish.js
- style.css
- theme-polished.css
- robots.txt

## What changed

- The live scorecard match row now keeps calculating every hole after the match is mathematically closed.
- The match result label still properly locks at the match-play result, such as 3&2.
- Full-round hole wins continue to be saved for season standings and holes-won tiebreakers.
- Cache-busting references were updated to `v=4.9.3-full-hole-tracking`.

No Apps Script redeploy is required.
