# HGGL v4.8.3 Audit Patch

This patch corrects match-play result labels while preserving full hole-win totals for standings/seeding.

## Result display rule
- If a match becomes mathematically over before hole 9, the Results section shows the official match-play closeout label, such as `5&4`, `3&2`, or `2&1`.
- If the match is not decided until all 9 holes are complete, the Results section shows the final margin, such as `1 UP` or `2 UP`.
- All hole winners across the completed scorecard are still counted separately in `team1HolesWon` / `team2HolesWon` for standings and seeding.

## Also retained
- Admin API key is still required.
- Multiple stroke dots and stroke labels remain active in scorecards.
- Full stroke counts are used anywhere net scoring is calculated.
- Cache busting updated to `v=4.8.3`.
