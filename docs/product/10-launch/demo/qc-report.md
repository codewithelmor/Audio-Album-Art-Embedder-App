# QC report - audio-album-art-embedder-demo-v1.0.0.mp4 (app v1.0.0)

| Check | Result |
|---|---|
| H.264 High, yuv420p, 1920x1080, 30 fps, AAC 48 kHz, faststart, chapters (5) | PASS |
| Length 65.5 s (target 45-90 s) | PASS |
| Loudness -16.1 LUFS, true peak -1.4 dBTP (target -16 / -1.5), no clipping | PASS |
| Journey J1 complete, every step checked and passed, result visible (summary + Explorer thumbnail) | PASS |
| BEFORE state shown and truthful (APIC frames = 0 before the app run, mutagen) | PASS |
| AFTER state shown and truthful (APIC image/png 239557 bytes after the run; Explorer thumbnail) | PASS |
| Clear on-screen labels BEFORE / AFTER (+ BEFORE inset on the AFTER clip) | PASS |
| Captions .srt/.vtt: 16 cues, 1-6 s, <=20 chars/s, within video length, no overlaps (two sub-1 s cues merged) | PASS |
| Voice sync: voice placed at scene markers; narration never overlaps; silence gaps only on cards/hold (3 s each) | PASS (measured, not listened) |
| Private data on frames: only `C:\demo\...` paths and file tiles visible; Explorer nav pane, device names, user paths, taskbar cropped out; reviewed 20 sampled frames + all key frames | PASS |
| Version on screen (title and end card v1.0.0) | PASS |
| AI voice disclosure on end card | PASS |
| Vertical 9:16 cut | SKIPPED (content 65 s; narration cannot be cut under 60 s without dropping the CTA) |
| Human listen-check of voice naturalness | NOT DONE (no audio playback available to the agent; Kokoro am_michael, sentence pauses 0.32 s, speed 0.97; please listen once) |
