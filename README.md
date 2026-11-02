# Audio Album Art Embedder

Embed a cover image (`.jpg`, `.jpeg` or `.png`) as album art into the audio files of a folder. Works with **FLAC**, **MP3**, **M4A/MP4** and **AAC**, and replaces any cover art already there. Use it from the command line or the Electron desktop app. No account, API key or network access needed.

## Demo

**[▶ Watch: Audio Album Art Embedder: Add Cover Art to Your Music in Seconds](https://www.loom.com/share/1372a2ca701842a1982d7209af099c70)**

See the desktop app turn a song with no artwork into one with its cover. Choose the folder, check the auto-detected cover image, and click Embed cover art. The video shows the file before and after, so you can see the thumbnail change. It works with FLAC, MP3, M4A/MP4 and AAC files.

## Features

- **Wide format support:** `.flac`, `.mp3`, `.m4a`, `.mp4` and `.aac`.
- **Windows-friendly MP3 tagging:** MP3s are saved as ID3v2.3, so thumbnails show up in Windows Explorer.
- **Auto-detect the cover:** if you don't pick an image, the folder is searched for one, preferring the names `cover`, `folder`, `album` and `art`.
- **Desktop app:** choose a folder, preview the cover, tick the files you want, embed, and watch per-file progress. Cancel stops between files.

## Installation

| Requirement | Notes |
|---|---|
| Python 3.10+ | Runs the backend |
| Node.js | Only for developing or packaging the desktop app |

```bash
python -m venv venv            # activate it for your shell
pip install -r backend/requirements.txt
```

## Usage

### Command line

```bash
python backend/cli.py
```

You are asked for the music folder (Enter = current folder) and the cover image (Enter = auto-detect).

### Desktop app

```bash
cd app
npm install
npm start          # compiles TypeScript and launches Electron (needs python on PATH)
npm run typecheck
```

Choose a folder, check or change the cover image, select the files, and click **Embed cover art**.

### JSON-lines backend

This is how the Electron app drives Python. Always run it with `-X utf8 -u`.

```bash
python -X utf8 -u backend/backend.py --dir <folder> --scan
python -X utf8 -u backend/backend.py --dir <folder> --image <cover.jpg> [--file <name>]...
```

## Building Installers

PyInstaller cannot cross-compile, so build on the OS you are targeting.

| OS | Command | Output in `app/dist/` |
|----|---------|-----------------------|
| Windows | `powershell -ExecutionPolicy Bypass -File scriptsuild-all.ps1` | `*Setup*.exe` |
| Linux | `scripts/build-all.sh` | `*.AppImage`, `*.deb` |
| macOS | `scripts/build-all.sh` | `*.dmg` |

Add `-Clean` / `--clean` for a fresh build. Builds are unsigned.

## Project Structure

```text
Audio-Album-Art-Embeder-App/
├── .agents
│   └── skills
│       ├── app-icon-restyle
│       │   ├── scripts
│       │   │   └── export_icons.py
│       │   └── SKILL.md
│       └── skill-creator
│           ├── agents
│           │   ├── analyzer.md
│           │   ├── comparator.md
│           │   └── grader.md
│           ├── assets
│           │   └── eval_review.html
│           ├── eval-viewer
│           │   ├── generate_review.py
│           │   └── viewer.html
│           ├── references
│           │   └── schemas.md
│           ├── scripts
│           │   ├── __init__.py
│           │   ├── aggregate_benchmark.py
│           │   ├── generate_report.py
│           │   ├── improve_description.py
│           │   ├── package_skill.py
│           │   ├── quick_validate.py
│           │   ├── run_eval.py
│           │   ├── run_loop.py
│           │   └── utils.py
│           ├── LICENSE.txt
│           └── SKILL.md
├── .claude
│   ├── commands
│   │   └── commit.md
│   ├── skills
│   │   ├── app-icon-restyle
│   │   │   ├── scripts
│   │   │   │   └── export_icons.py
│   │   │   └── SKILL.md
│   │   └── skill-creator
│   │       ├── agents
│   │       │   ├── analyzer.md
│   │       │   ├── comparator.md
│   │       │   └── grader.md
│   │       ├── assets
│   │       │   └── eval_review.html
│   │       ├── eval-viewer
│   │       │   ├── generate_review.py
│   │       │   └── viewer.html
│   │       ├── references
│   │       │   └── schemas.md
│   │       ├── scripts
│   │       │   ├── __init__.py
│   │       │   ├── aggregate_benchmark.py
│   │       │   ├── generate_report.py
│   │       │   ├── improve_description.py
│   │       │   ├── package_skill.py
│   │       │   ├── quick_validate.py
│   │       │   ├── run_eval.py
│   │       │   ├── run_loop.py
│   │       │   └── utils.py
│   │       ├── LICENSE.txt
│   │       └── SKILL.md
│   └── settings.json
├── .github
│   └── workflows
│       └── build.yml
├── app
│   ├── assets
│   │   ├── icons
│   │   │   ├── 128x128.png
│   │   │   ├── 16x16.png
│   │   │   ├── 256x256.png
│   │   │   ├── 32x32.png
│   │   │   ├── 48x48.png
│   │   │   ├── 512x512.png
│   │   │   └── 64x64.png
│   │   ├── icon.ico
│   │   └── icon.png
│   ├── scripts
│   │   └── copy-static.js
│   ├── src
│   │   ├── renderer
│   │   │   ├── index.html
│   │   │   ├── renderer.ts
│   │   │   └── style.css
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   └── types.d.ts
│   ├── package-lock.json
│   ├── package.json
│   └── tsconfig.json
├── backend
│   ├── backend.py
│   ├── cli.py
│   ├── core.py
│   └── requirements.txt
├── docs
│   └── product
│       └── 10-launch
│           └── demo
│               ├── audio
│               │   ├── durations.json
│               │   ├── s01.wav
│               │   ├── s02.wav
│               │   ├── s03.wav
│               │   ├── s04.wav
│               │   ├── s05.wav
│               │   ├── s06.wav
│               │   └── s07.wav
│               ├── automation
│               │   ├── build_clips.py
│               │   ├── explorer-demo.ps1
│               │   ├── normalize.sh
│               │   ├── package-lock.json
│               │   ├── package.json
│               │   ├── prepare-demo-folder.py
│               │   ├── pw-demo-helpers.mjs
│               │   ├── record-app.mjs
│               │   └── tts_kokoro.py
│               ├── captions
│               │   ├── audio-album-art-embedder-demo-v1.0.0.srt
│               │   └── audio-album-art-embedder-demo-v1.0.0.vtt
│               ├── exports
│               │   ├── tmp
│               │   │   ├── meta.txt
│               │   │   ├── seg0-v.mp4
│               │   │   ├── seg0.mp4
│               │   │   ├── seg1-v.mp4
│               │   │   ├── seg1.mp4
│               │   │   ├── seg2-v.mp4
│               │   │   ├── seg2.mp4
│               │   │   ├── seg3-v.mp4
│               │   │   ├── seg3.mp4
│               │   │   └── title.mp4
│               │   ├── chapters.txt
│               │   └── timeline.json
│               ├── recordings
│               │   ├── explorer
│               │   │   ├── a0.5.png
│               │   │   ├── a3.png
│               │   │   ├── a9.png
│               │   │   ├── after-markers.json
│               │   │   ├── after-raw.mp4
│               │   │   ├── after.mp4
│               │   │   ├── b3.png
│               │   │   ├── before-markers.json
│               │   │   ├── before-raw.mp4
│               │   │   ├── before-still.png
│               │   │   ├── before.mp4
│               │   │   └── test-before.png
│               │   ├── j1-app
│               │   │   ├── markers.json
│               │   │   └── page@6f05da3048443d88cd8ac91b2e320916.webm
│               │   ├── endcard-markers.json
│               │   └── endcard.mp4
│               ├── screenshots
│               │   ├── 01-app-start-no-folder.png
│               │   ├── 02-cover-detected.png
│               │   ├── 03-embed-done.png
│               │   ├── 04-explorer-before.png
│               │   └── 05-explorer-after.png
│               ├── thumbnail
│               │   ├── alt-text.md
│               │   ├── end.png
│               │   ├── thumbnail-1280x720.png
│               │   └── title.png
│               ├── demo-plan.md
│               ├── edit.json
│               ├── feature-map.md
│               ├── journeys.md
│               ├── qc-report.md
│               ├── scenes.json
│               └── script.md
├── scripts
│   ├── build-all.ps1
│   ├── build-all.sh
│   ├── build-backend.ps1
│   ├── build-backend.sh
│   └── update_readme_tree.py
├── .gitattributes
├── .gitignore
├── CLAUDE.md
├── README.md
└── skills-lock.json
```

`core.py` is UI-agnostic: it reports through `log()` and `emit()` and never prints or prompts, so both front ends can share it.

## Notes

- **Files are modified in place.** Keep a backup if the originals matter.
- **Only the chosen folder is scanned**, not its subfolders.
- **Raw `.aac` files** (ADTS streams) cannot hold embedded art. They are reported as failed; convert them to `.m4a` first.

## License

No license file has been added yet. Until one is, all rights are reserved by the author.
