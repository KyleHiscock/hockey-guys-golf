# HGGL v4.9.22 — Match Strokes + Net HDCP Fields

This update separates two Squabbit values:

- Match Strokes: used for match-play dots and hole wins.
- Net HDCP: used for actual net totals and combined-net tiebreakers.

This fixes the Pin Sharks / Foot Wedge variance where Pin Sharks were calculated as 96 instead of Squabbit's 94 because the site was calculating their net HDCP from GHIN instead of using Squabbit's Net-tab HDCP values.

For the example match:
- Drexy Net HDCP: 5
- Nick Net HDCP: 5
- Tank Net HDCP: 14
- Bob Net HDCP: 7

Combined net should show Pin Sharks 94 and Foot Wedge Crew 89.
