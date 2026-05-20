# HGGL v4.9.21 Manual Strokes + Tiebreaker Fix

This update changes score entry so official match strokes are copied from Squabbit instead of calculated by the website.

## What changed

- Admin scorecard now has a `Strokes Received` field for each player.
- Sub player fields now include `Sub strokes`.
- The scorecard dots and match result calculation use those manually entered strokes when all active players have values.
- Saving a match now requires Strokes Received for every active player.
- Saved result snapshots include `manualStrokes` and `matchStrokes`, so public scorecard/result review uses the same official strokes later.
- Existing GHIN fields remain for reference only.

## Workflow

1. Set up the match in Squabbit.
2. Copy each player’s playing handicap/strokes received from Squabbit.
3. Enter those numbers into the HGGL admin `Strokes Received` fields.
4. Enter gross scores.
5. Save the match.

## Upload files

Replace the existing GitHub files with the files in this ZIP. The HTML uses `v=4.9.21-manual-strokes-tiebreaker-fix` cache-busting so desktop and mobile should pull the new JS/CSS.
