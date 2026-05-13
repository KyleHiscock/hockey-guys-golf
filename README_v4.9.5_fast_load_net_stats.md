# v4.9.5 — Fast Load + Net Stats Fix

This update fixes two items:

1. **Initial load speed**
   - The site now renders immediately from the last cached copy in the browser.
   - It still refreshes silently from Google Sheets / Apps Script in the background.
   - After a successful Sheets refresh, it saves that fresh data locally for the next visit.

2. **Player stats net calculation**
   - Public-site player stat cards now use the same relative match-play stroke allocation as the scorecard.
   - This corrects Drexy's low net from 34 to 35 when his gross was 39 and he received 4 match strokes.

No Apps Script redeploy is required.
