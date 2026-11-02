# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Embeds a cover image (`.jpg`/`.jpeg`/`.png`) as album art into the audio files of a folder: FLAC, MP3, M4A/MP4 and AAC. Existing cover art is replaced. Tagging is done with `mutagen`; there is no network access, no credentials and no FFmpeg. There are no tests and no linter configured.

Two front ends share one Python core:
- CLI: `python backend/cli.py` (interactive prompts)
- Electron + TypeScript desktop app in `app/`, which spawns the Python backend as a subprocess

## Commands

```bash
pip install -r backend/requirements.txt    # Python 3.10+
python backend/cli.py                      # interactive CLI

# JSON-lines backend, as the Electron app drives it
python -X utf8 -u backend/backend.py --dir <folder> --scan
python -X utf8 -u backend/backend.py --dir <folder> --image <cover.jpg> [--file <name>]...

cd app && npm install && npm start         # dev: compiles TS, launches Electron (needs python on PATH)
cd app && npm run typecheck                # tsc --noEmit; the only static check available

# Full installer (PyInstaller backend + electron-builder); output in app/dist/
powershell -ExecutionPolicy Bypass -File scripts\build-all.ps1 [-Clean]   # Windows
scripts/build-all.sh [--clean]                                            # Linux / macOS
```

PyInstaller cannot cross-compile: each OS must build on itself (`.github/workflows/build.yml` does all three). `build-all.*` runs `build-backend` -> `npm run dist` and writes to the git-ignored `build/` (frozen backend in `build/backend`), which `app/package.json` `extraResources` copies into the package.

## Architecture

**`backend/core.py`** holds all logic: `find_cover_image` (prefers `cover`/`folder`/`album`/`art`), `list_audio_files`, `scan_directory`, the per-format embedders (`embed_flac`, `embed_mp3`, `embed_mp4`, `embed_aac`) and `embed_cover`, which loops over the files and reports per-file results. MP3s are saved as ID3v2.3 on purpose: Windows Explorer does not reliably read mutagen's default v2.4 art. Raw `.aac` (ADTS) cannot hold art, so only `.aac` files that are really MP4 containers succeed.

**The core must stay UI-agnostic.** It reports through `log()` and `emit(event, **data)`. With no listener set (`set_listener`), `log` prints and `emit` is a no-op, which is the CLI mode. `backend.py` installs a listener that serializes events as JSON lines. Cancellation is a `threading.Event` checked between files. Do not add `print()`/`input()` to `core.py`; prompts belong in `cli.py`.

**Event contract spans three files.** `backend/backend.py` writes the events (`scan`, `start`, `file_start`, `file_done`, `file_error`, `log`, `done`, `error`), `app/src/types.d.ts` types them (`BackendEvent`, `DoneEvent`), and `app/src/main.ts` and `app/src/renderer/renderer.ts` consume them. Changing an event means updating all of them. `types.d.ts` is deliberately ambient (no imports/exports) so `renderer.ts` compiles to a plain browser script under the CSP in `index.html`; adding an `import`/`export` to the renderer breaks it at runtime (`exports is not defined`).

**Electron process split.** `main.ts` spawns the backend (`python3`/`python backend.py` in dev, `resources/backend/backend[.exe]` when packaged), parses stdout lines, and forwards them to the renderer over IPC. `preload.ts` exposes the `Api` interface as `window.api`. The CSP blocks `file://` images, so cover previews are sent from `main.ts` as data URLs. Cancel writes `cancel\n` to the backend's stdin, then force-kills after 8s. Compiled output goes to `app/out/` (git-ignored); `npm run build` also copies `index.html` and `style.css` there via `scripts/copy-static.js`.

## Gotchas

- Always run the backend with `-X utf8 -u` (unbuffered stdout, UTF-8 file names); Electron also sets `PYTHONIOENCODING`.
- Files are processed in place; there is no backup. Only the top level of the chosen folder is scanned (no recursion).
- `appId`/`homepage` in `app/package.json` are placeholders.
- On this repo's Windows setup under Node 26, Electron's postinstall silently fails to extract its binary. `build-all.*` repairs it; for plain `npm start` extract the zip from `%LOCALAPPDATA%\electron\Cache` into `node_modules/electron/dist` and write `electron.exe` to `node_modules/electron/path.txt`.
- Linux/macOS packaging scripts and the CI workflow have not been run yet; only the Windows build was ever verified.
