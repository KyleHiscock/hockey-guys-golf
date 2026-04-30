# HGGL 2026 Audit Patch v4.8.5

Fixes applied after admin-side review:

- Restored admin Results week expansion by adding missing `toggleResultsWeek()` to `admin.js`.
- Added Skins/CTP dashboard extras support to admin by syncing `SKINS_DATA` and `CTP_DATA` from Google Sheets and adding `buildExtrasPanel()`.
- Fixed admin League Leaders so Low Net and Net Birdies calculate from the same scorecard net-stroke logic shown in the match scorecards.
- Updated public and admin player-stat logic to use unique result rows and match-play scorecard net values consistently.
- Preserved v4.8.4 match-result display rules: 1 UP/2 UP after nine holes; 3&2/5&4 only when closed with holes remaining.
- Preserved required Admin API key behavior.
- Bumped cache busting to `v=4.8.5`.
