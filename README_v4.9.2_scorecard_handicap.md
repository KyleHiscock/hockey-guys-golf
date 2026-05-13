# Hockey Guys Golf League — v4.9.2 Scorecard Handicap Fix

Upload/rename these files in the root of your GitHub Pages repo:

- `admin-v4.9.2.html` → `admin.html`
- `index-v4.9.2.html` → `index.html`
- `admin-v4.9.2.js` → `admin.js`
- `public-v4.9.2.js` → `public.js`
- `style-v4.9.2.css` → `style.css`
- `theme-polished-v4.9.2.css` → `theme-polished.css`

What changed:

1. Gracey/Ryan Grace now gets 2 strokes against Kyle when using the Week 2 back-nine setup: Kyle should show 2, Gracey should show 4 (+2).
2. Stroke holes for Gracey on the back nine should be holes 14 and 18.
3. The scrambled scorecard HCP row was caused by a CSS class collision: the table row used `hcp-row`, and the dashboard Handicap Tracker also used `.hcp-row` as a grid layout. The scorecard row is now `scorecard-hcp-row`, and the CSS is scoped to the scorecard table.
4. Cache-busting query strings are bumped to `v=4.9.2-scorecard-handicap`.

Quick verification after upload:

- Open `admin.html` in an incognito/private window.
- Select the Week 2 back nine matchup.
- The scorecard handicap header should say `9-HCP`, not the old scrambled `HCP` row.
- Kyle should be `2`; Gracey should be `4 (+2)`.
- Gracey should have stroke dots on holes 14 and 18.
