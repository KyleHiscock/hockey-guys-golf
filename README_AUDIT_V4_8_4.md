# HGGL Audit Package v4.8.4

This patch corrects the final-hole match-play display edge case introduced in v4.8.3.

## Fix included

- A match is now considered an early match-play close only when there is at least one hole remaining.
- Results that finish on hole 9 now display as `1 UP`, `2 UP`, etc. instead of `1&0` or `2&0`.
- Early closed matches still display properly as `5&4`, `3&2`, `2&1`, etc.
- Hole-win totals remain calculated separately for standings/seeding.
- Admin API key requirement from v4.8.1 remains intact.
- Cache busting updated to `v=4.8.4`.

## Files to upload

Upload these root filenames to GitHub Pages:

- index.html
- admin.html
- public.js
- admin.js
- polish.js
- style.css
- theme-polished.css
