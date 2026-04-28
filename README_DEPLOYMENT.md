# Hockey Guys Golf League 2026 — Fixed GitHub Pages Package

## Upload these files to the root of your GitHub Pages repository

- `index.html`
- `admin.html`
- `public.js`
- `admin.js`
- `polish.js`
- `style.css`
- `theme-polished.css`
- `robots.txt`

## Apps Script

The Apps Script backend file is included here for reference:

- `apps-script/Code.gs`

If your existing Apps Script deployment is already saving scores and standings correctly, you do not need to redeploy it for this player-stats fix. The fix is in `public.js` and `admin.js`.

## v4.4 stats fix

This package fixes player stats after Week 1:

- A weekly head-to-head matchup only counts once for each player in the Stats tab.
- Duplicate saved Google Sheet result rows for the same Week/team matchup no longer make players show records like 2-0 or 0-2 after only one match.
- Player score snapshots are parsed more aggressively from Google Sheets, including `PlayerScoresJSON`, `Player Scores JSON`, and `Score Snapshot JSON` style fields.
- Avg/Hole, Best Round, Rounds Played, Holes Played, score distribution, and hole breakdown now use the score snapshot when available.
- Cache-busting references were updated to `v=4.4-stats-fix` so mobile browsers pull the new files.

## Important note

If the Google Sheet has old duplicate test rows, the Stats tab will no longer double-count them when they represent the same Week/team matchup. The Manage tab may still show old rows so you can delete cleanup/test rows if needed.
