# HGGL audit patch v4.8.2

This package keeps the v4.8.1 admin API-key requirement and updates match-result display logic.

## What changed

- Results now display the actual final 9-hole margin when all 9 holes are scored.
  - Example: if Fairway Enforcers win holes 6, 7, 8, and 9 after losing holes 1 and 2, the result displays `2 UP`, not `3&1`.
- Traditional `3&1`, `2&1`, etc. remains available for matches that are not fully scored but are mathematically closed.
- Total holes won are still calculated separately and preserved for standings/seeding tiebreakers.
- Existing saved Google Sheets results with score snapshots will be displayed with the corrected 9-hole margin on the public/admin results pages, even if the stored MatchResult text still says `3&1`.
- Future saves from admin will store the corrected 9-hole margin when all 9 holes are scored.
- Cache busting was bumped to `v=4.8.2`.

## Upload files

Upload these files to the GitHub Pages repo root:

- `index.html`
- `admin.html`
- `public.js`
- `admin.js`
- `polish.js`
- `style.css`
- `theme-polished.css`

Do not upload files with parenthetical names such as `public(18).js`, `admin(16).js`, or `index(13).html`.
