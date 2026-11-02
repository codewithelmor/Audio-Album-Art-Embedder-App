# Journeys

## J1 - Add cover art to a song (PASS)
Start state: `C:\demo\sample-music\` has `Mariah Carey - Bye Bye.mp3` (no APIC frame, verified with mutagen) and `cover.png`.

| Step | Check | Result |
|---|---|---|
| B1 Explorer shows the MP3 with a generic icon (BEFORE) | clip recorded; APIC list empty after clip | PASS |
| 1 Click "Choose folder..." | folder label = `C:\demo\sample-music`, list visible | PASS |
| 2 List shows the MP3 | 1 file, name contains "Bye Bye" | PASS |
| 3 Cover preview visible, auto-detected | path ends `cover.png`, image loaded | PASS |
| 4 Hover "Choose image..." (alternative) | no error | PASS |
| 5 Embed button enabled | not disabled | PASS |
| 6 Click "Embed cover art" | summary visible (222 ms click-to-summary in the final take) | PASS |
| 7 Summary | "1 of 1 file(s) updated.", row "Done", "Finished" | PASS |
| A1 Explorer shows the same MP3 with the cover as thumbnail (AFTER) | frame review; mutagen: APIC image/png 239557 bytes | PASS |
