# HGGL v4.9.21 Manual Strokes + Tiebreaker Fix

This build keeps the Squabbit manual **Strokes Received** fields for match-play scoring and fixes match tiebreakers so combined net, hardest-hole net, and net birdies use each player’s actual 9-hole net handicap calculation rather than the relative match-play strokes.

Upload all files to GitHub and test with:

- `/admin.html?v=4.9.21-test`
- `/?v=4.9.21-test`

Expected behavior:

- Admin still shows Strokes Received fields copied from Squabbit.
- Match-play dots use those manual Squabbit strokes.
- If the match is tied after 9 holes, Combined Net uses actual net scores, not relative match strokes.
