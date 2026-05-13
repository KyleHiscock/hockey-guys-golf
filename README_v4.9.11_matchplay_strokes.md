# v4.9.11 Match-Play Stroke Fix

This update corrects the match-play / best-ball stroke calculation so it matches the GHIN-style scoring app behavior shown in the screenshots.

## Correct split

- Individual net/stat totals use the player's own rounded 9-hole handicap.
- Match-play best-ball scoring applies the 90% allowance to each player's raw 9-hole course handicap, rounds that playing allowance, then compares everyone to the lowest player in the match.

This fixes the Zambogeys vs Pin Sharks result where Nick was incorrectly getting +1 relative stroke and the result displayed differently than the scoring app.
