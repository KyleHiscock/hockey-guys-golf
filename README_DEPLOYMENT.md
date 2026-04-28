# Hockey Guys Golf League 2026 — Fixed GitHub Pages Package

This package is ready to upload to a clean GitHub Pages repository/root.

## Upload these root files to GitHub

- `index.html`
- `admin.html`
- `public.js`
- `admin.js`
- `polish.js`
- `style.css`
- `theme-polished.css`
- `robots.txt`

The `apps-script/Code.gs` file is included only in case you want to replace/redeploy the Google Apps Script backend. Do not upload that file to Apps Script unless you are intentionally updating the backend deployment.

## What was corrected

- Clean production filenames are included. No `(1)`, `(2)`, `(3)`, or `(4)` filenames are used.
- Public/admin pages reference the clean files with `?v=4.3-fixed` cache-busting.
- Google Sheets requests now use true JSONP script/callback loading instead of browser `fetch()`.
- Public site write/admin actions are disabled so `public.js` does not expose or use the default admin key.
- Scorecard tie handling now follows your posted tiebreaker structure instead of saving a completed all-square match as a half point.
- If the match is still tied after automatic tiebreakers, the admin is blocked from saving until reviewed manually.
- CSS selector typos were cleaned up for better mobile rendering consistency.
- `sync-hotfix.js` and older patch notes are intentionally excluded from the live GitHub package.

## Important

If you are creating a brand-new Google Apps Script deployment, update `LEAGUE_API_URL` near the top of both `public.js` and `admin.js` with the new `/exec` deployment URL.

If you keep using the same Google Sheet/App Script deployment, upload the GitHub files as-is.

## Suggested test after upload

1. Open the public page on desktop and mobile.
2. Confirm standings/schedule/results load from Google Sheets.
3. Open `admin.html` on mobile.
4. Sign in.
5. Save one test match.
6. Refresh the public page on mobile and confirm the result/standings update.
7. Delete the test result from the admin Manage tab.
