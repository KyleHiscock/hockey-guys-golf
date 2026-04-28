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


## V4.5 Sheet + Scorecard Fix

This package includes a required Apps Script update. Replace Code.gs with `apps-script/Code.gs`, save it, and deploy a new web app version before testing new score entries.

What changed:
- Results sheet headers are repaired automatically by Apps Script.
- Each saved match writes both JSON score snapshots and flat player/hole columns: P1Name, P1GHIN, P1H1...P4H18.
- Public/admin stats can read either the JSON score snapshot or the flat P1H# columns.
- Result cards can expand to show the full hole-by-hole scorecard.

Recommended test:
1. Deploy Apps Script as a new version.
2. Upload these GitHub files.
3. Enter one dummy Week 1 score through admin.
4. Confirm the Results tab now has P1/P2/P3/P4 player columns and hole scores.
5. Confirm Player Stats show each player as one result only.
6. Delete the dummy result from Admin > Manage.
