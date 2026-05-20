# HGGL v4.9.27 Admin Autofill + AS Display Fix

This build restores the clean manual Match Strokes / Net HDCP admin entry UI from v4.9.23 and patches the full 9-hole all-square display logic.

Fixes:
- Restores Team 1 / Team 2 player auto-fill from Google Sheets roster.
- Restores GHIN Index pull from the Players tab.
- Keeps Match Strokes and Net HDCP manual Squabbit fields.
- If all 9 holes are entered and the match is AS, the public/admin display shows `AS · TB ...` instead of an earlier locked result such as `1 UP` or `2&1`.
- Preserves the current public dashboard/style files.
