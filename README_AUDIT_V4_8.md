# HGGL 2026 — Audited v4.8 Package

Upload these clean filenames to the GitHub Pages repository root:

- `index.html`
- `admin.html`
- `public.js`
- `admin.js`
- `polish.js`
- `style.css`
- `theme-polished.css`

## What was audited/fixed

- `public.js` is based on the newer `recent public.js`, not the older `public(18).js`.
- The newer public scorecard feature is included:
  - Multiple stroke dots on holes when a player gets more than one stroke on that hole.
  - Player stroke badge in the expanded scorecard row.
- Public scorecard/net calculations now use the full stroke count, not just a yes/no stroke flag.
- `admin.js` was brought into alignment with the newer public handicap/stroke logic:
  - 90% adjusted relative strokes.
  - Stroke holes stored as a hole-to-stroke-count map.
  - Admin live scorecard, match status, tiebreakers, hole-win totals, result summaries, and expanded scorecards now use full stroke counts.
- Admin score entry still keeps the focus/Enter-key improvements from the uploaded admin file.
- HTML cache-busting was updated from `v=4.7` to `v=4.8-audit`.

## Validation performed

- JavaScript syntax check passed for:
  - `public.js`
  - `admin.js`
  - `polish.js`
- Public/admin HTML script references point to clean production filenames.
- No duplicate HTML IDs were found in the uploaded public/admin pages.
- All inline `onclick` function names used by the public/admin HTML were found in the loaded JS files.

## Upload note

Replace the existing root files with these clean names. Do not upload the parenthetical filenames such as `public(18).js`, `admin(16).js`, or `index(13).html`.
