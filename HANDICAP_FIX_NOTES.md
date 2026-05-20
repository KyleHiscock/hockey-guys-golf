# HGGL v4.9.18 Handicap Fix

This update fixes the Week 3 score-entry handicap mismatch against the scoring app.

## Main change
The old scorecard calculation rounded the full 18-hole course handicap first, divided by 2, then applied the 90% allowance. That was producing CJ 14 / Justyn 18 in the Week 3 example.

The updated calculation follows the scoring-app flow:

1. Calculate raw 9-hole course handicap using 9-hole rating/par.
2. Compare each player to the lowest raw 9-hole handicap in the match.
3. Apply 90%.
4. Round to final playing strokes.

## Week 3 example
- CJ 37.0 → 20.2 raw front-nine course handicap → 15 playing strokes.
- Justyn 44.3 → 24.2 raw front-nine course handicap → 19 playing strokes.

This should now match the Squabbit/GHIN screenshot.

## Files updated
- admin.js
- public.js
- index.html / admin.html cache-busted to v4.9.18-handicap-fix
