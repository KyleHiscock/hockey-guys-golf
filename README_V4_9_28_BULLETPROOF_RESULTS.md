# HGGL v4.9.28 — Bulletproof Results Display

Fixes the Week 2 result display regression caused by re-scoring all 9 holes from score snapshots.

Key rules now enforced:

- Admin scoring still calculates the live match from entered scores.
- If all 9 holes are entered and the final match is AS, admin uses tiebreakers and saves an AS/TB result.
- If a match was mathematically closed earlier, non-AS results preserve official Squabbit-style output such as 3&2 or 2&1, even if all 9 gross scores are entered for stats.
- Public results now trust the saved official `MatchResult` / `Result Text` from Google Sheets instead of recalculating display labels from gross snapshots.
- Public tiebreaker rows are normalized to show `AS · TB ...` when the saved row has a tiebreaker signal.

Upload these files to GitHub, then hard refresh with:

https://kylehiscock.github.io/hockey-guys-golf/?v=4.9.28-bulletproof-results
https://kylehiscock.github.io/hockey-guys-golf/admin.html?v=4.9.28-bulletproof-results
