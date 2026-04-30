# HGGL v4.8.7 Mobile Stability Patch

This patch keeps all v4.8.5/v4.8.6 scoring and admin fixes intact. Changes are limited to mobile ticker behavior and first-load rendering stability.

## Changes

- Public and admin pages no longer render local fallback data first and then immediately re-render Google Sheets data on load. This reduces the quick flash/jump where results appear, disappear, or re-render quickly.
- The ticker no longer rewrites its DOM when the content has not changed. This helps prevent mobile ticker resets/jumps during rebuilds.
- Added smoother mobile ticker CSS using translate3d, will-change, min-width:max-content, and longer mobile animation durations.
- Cache busting bumped to v=4.8.7.

## Files

Upload these root filenames:

- index.html
- admin.html
- public.js
- admin.js
- polish.js
- style.css
- theme-polished.css

Do not upload the versioned helper filenames; those are included only for review/download convenience.
