# HGGL 2026 Audit Package v4.8.6

Mobile polish release based on v4.8.5.

## Changes

- Restored the live ticker on mobile. It had been hidden by a mobile rule in `theme-polished.css`.
- Cleaned up the hero weather display on mobile so current weather and Tuesday forecast wrap as separate centered lines instead of running together.
- Bumped cache-busting references in `index.html` and `admin.html` from `v=4.8.5` to `v=4.8.6`.

## Preserved from prior release

- Correct match-play result display: `UP` after hole 9, `&` only for early closes.
- Separate total holes-won calculations for standings/seeding.
- Scorecard stroke dots and player stroke badges.
- Admin API key required.
- Admin dashboard extras, low net, net birdies, and expandable result scorecards.
