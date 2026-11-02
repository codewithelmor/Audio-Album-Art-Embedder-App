"""
JSON-lines front end for the Electron app. One JSON object per stdout line:
  {"event": "scan", "directory": ..., "files": [...], "cover": ...}     (--scan)
  {"event": "start" | "file_start" | "file_done" | "file_error" | "log", ...}
  {"event": "done", "ok": [...], "failed": [...], "folder": ..., "cancelled": bool, "error": ...}
  {"event": "error", "message": ...}
A line "cancel" on stdin stops the run between files (the host can also just kill the process).
"""

import argparse
import json
import sys
import threading

import core


def send(event, **data):
    sys.stdout.write(json.dumps({"event": event, **data}, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def watch_stdin_for_cancel(cancel):
    for line in sys.stdin:
        if line.strip().lower() == "cancel":
            cancel.set()
            return


def main():
    parser = argparse.ArgumentParser(
        description="Audio Album Art Embedder backend (JSON lines on stdout)"
    )
    parser.add_argument(
        "--dir", required=True, help="folder containing the audio files"
    )
    parser.add_argument(
        "--scan",
        action="store_true",
        help="list the audio files and the auto-detected cover, then exit",
    )
    parser.add_argument("--image", help="cover image (.jpg/.jpeg/.png)")
    parser.add_argument(
        "--file",
        action="append",
        dest="files",
        help="only embed into this file name (repeatable; default: all audio files)",
    )
    args = parser.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    if args.scan:
        try:
            result = core.scan_directory(args.dir)
        except (ValueError, OSError) as e:
            send("error", message=str(e))
            return 1
        send("scan", **result)
        return 0

    cancel = threading.Event()
    threading.Thread(target=watch_stdin_for_cancel, args=(cancel,), daemon=True).start()
    core.set_listener(lambda event, data: send(event, **data))

    summary = core.embed_cover(args.dir, args.image, files=args.files, cancel=cancel)
    send("done", **summary)
    return 1 if summary["error"] else 0


if __name__ == "__main__":
    sys.exit(main())
