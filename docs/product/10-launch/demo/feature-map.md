# Feature map (explored in the running app v1.0.0, source in app/src and backend/)

| Feature | Where | Shown in demo |
|---|---|---|
| Choose folder (native dialog, remembered in settings.json) | "Choose folder..." button | yes (dialog answered by the script, see note) |
| Folder scan: lists .flac/.mp3/.m4a/.mp4/.aac; auto-detects cover (cover, folder, album, art first) | list + cover row | yes |
| Cover preview and path; "Choose image..." to override | cover row | preview yes, override only hovered |
| Select files / Select all, count "N of M selected" | file list | yes (default all ticked) |
| Embed cover art; per-file state (Embedding/Done/Failed); overall bar; Log; summary "N of M file(s) updated." | below list | yes |
| Cancel between files | Cancel button | no |
| Open folder after run | summary | no |
| MP3 saved as ID3v2.3 so Explorer shows thumbnails | backend | shown indirectly (Explorer) |
| Replaces existing art; files modified in place | README | mentioned in narration (in place) |

Note: in the recording the native folder dialog is replaced by an answer returning `C:\demo\sample-music` (so personal folders never appear). The button, IPC, scan and embed code run unchanged.
