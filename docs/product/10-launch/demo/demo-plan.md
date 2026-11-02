# Demo plan - Audio Album Art Embedder v1.0.0

- **Type:** Quick overview, 16:9 1920x1080 at 30 fps. Actual length 65.5 s (target 45-90 s). No vertical cut (see qc-report.md).
- **Audience / call to action:** people with MP3/FLAC/M4A/AAC files that lack cover art; try it on a copy of their music folder.
- **Shared where:** not decided; nothing is uploaded. Review by `market-reviewer`, upload only by `market-publisher` after user approval.
- **Voice-over:** local neural TTS, Kokoro-82M (Apache-2.0), stock American male voice `am_michael`, speed 0.97. No cloning. AI voice is disclosed on the end card.
- **Story:** Problem (BEFORE: the MP3 has no cover, Explorer shows a generic icon) -> Solution (choose the folder, cover auto-detected, Embed cover art) -> Result (AFTER: same file, cover is its thumbnail in Explorer, with the BEFORE image as an inset) -> CTA.
- **Demo data:** copies in `C:\demo\sample-music\` (neutral path; originals in Downloads are untouched). The copy's embedded art is stripped before the BEFORE shot. Cover image is copied as `cover.png` so auto-detection finds it.
- **Chapters:** Before (0:03), Embed in the app (0:16), After (0:47), Wrap-up (0:57).

| Scene | Journey | Target |
|---|---|---|
| s01 | J1 before-state in Explorer | 12.5 s |
| s02-s05 | J1 choose folder, cover detected, embed, summary | 31 s |
| s06 | J1 after-state in Explorer with BEFORE inset | 10 s |
| s07 | end card + call to action | 9 s |
