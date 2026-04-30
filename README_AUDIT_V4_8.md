# HGGL audited package v4.8.1

This package updates the audited v4.8 files with the admin API key requirement restored.

## Key fixes

- Admin API key field is labeled required, not optional.
- Admin login now blocks access if the API key field is blank.
- The saved admin key fallback was removed from `getAdminKey()`.
- `saveAdminKey()` now rejects blank keys instead of saving an empty string.
- Admin script cache-busting is bumped to `v=4.8.1`.
- Scorecard stroke-dot and stroke-label updates from the recent public.js remain included.
- Admin scorecard/stroke calculations remain aligned with public scorecard calculations.

## Validation

- `node --check admin.js` passed.
- `node --check public.js` passed.
- `node --check polish.js` passed.

Upload the root files from this package to GitHub Pages, replacing the existing clean filenames.
