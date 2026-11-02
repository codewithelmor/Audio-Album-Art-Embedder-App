"""
Core logic: embed a cover image as album art into audio files
(FLAC, MP3, M4A/MP4, AAC) using mutagen.

This module is UI-agnostic: it never prints or prompts. It reports through
log() and emit(event, **data). With no listener set (set_listener), log prints
and emit is a no-op, which is the CLI mode. backend.py installs a listener that
serializes events as JSON lines for the Electron app.
"""

import os
import threading

from mutagen.flac import FLAC, Picture
from mutagen.id3 import APIC, ID3, ID3NoHeaderError
from mutagen.mp4 import MP4, MP4Cover

IMAGE_EXTS = (".jpg", ".jpeg", ".png")
AUDIO_EXTS = (".flac", ".mp3", ".m4a", ".mp4", ".aac")
PREFERRED_COVER_NAMES = ("cover", "folder", "album", "art")

# ---- reporting ---------------------------------------------------------------

_listener = None


def set_listener(listener):
    """listener(event, data_dict) receives every emitted event; None restores CLI mode."""
    global _listener
    _listener = listener


def log(message):
    if _listener:
        _listener("log", {"message": message})
    else:
        print(message)


def emit(event, **data):
    if _listener:
        _listener(event, data)


# ---- discovery ---------------------------------------------------------------


def find_cover_image(directory):
    """Path of the best image in the directory (cover/folder/album/art first), or None."""
    candidates = [
        n
        for n in os.listdir(directory)
        if n.lower().endswith(IMAGE_EXTS) and os.path.isfile(os.path.join(directory, n))
    ]
    if not candidates:
        return None
    for preferred in PREFERRED_COVER_NAMES:
        for name in candidates:
            if os.path.splitext(name)[0].lower() == preferred:
                return os.path.join(directory, name)
    return os.path.join(directory, min(candidates))


def list_audio_files(directory):
    """Names of the supported audio files directly inside the directory, sorted."""
    return sorted(
        n
        for n in os.listdir(directory)
        if n.lower().endswith(AUDIO_EXTS) and os.path.isfile(os.path.join(directory, n))
    )


def guess_mime(image_path):
    return (
        "image/png"
        if os.path.splitext(image_path)[1].lower() == ".png"
        else "image/jpeg"
    )


def scan_directory(directory):
    """What the UI shows after a folder is chosen."""
    if not os.path.isdir(directory):
        raise ValueError(f"The folder '{directory}' does not exist.")
    return {
        "directory": os.path.abspath(directory),
        "files": list_audio_files(directory),
        "cover": find_cover_image(directory),
    }


# ---- embedding ---------------------------------------------------------------


def embed_flac(path, image_data, mime):
    audio = FLAC(path)
    audio.clear_pictures()
    pic = Picture()
    pic.data = image_data
    pic.type = 3  # front cover
    pic.mime = mime
    pic.desc = "Cover"
    audio.add_picture(pic)
    audio.save()


def embed_mp3(path, image_data, mime):
    try:
        audio = ID3(path)
    except ID3NoHeaderError:
        audio = ID3()
    audio.delall("APIC")  # remove existing cover art
    audio.add(
        APIC(
            encoding=1,  # UTF-16 (v2.3-safe; v2.4-only UTF-8 breaks Explorer)
            mime=mime,
            type=3,  # front cover
            desc="Cover",
            data=image_data,
        )
    )
    # ID3v2.3: Windows Explorer's thumbnail/property handler doesn't reliably read
    # mutagen's default v2.4, while VLC, foobar2000 etc. read v2.3 fine.
    audio.save(path, v2_version=3)


def embed_mp4(path, image_data, mime):
    audio = MP4(path)
    fmt = MP4Cover.FORMAT_PNG if mime == "image/png" else MP4Cover.FORMAT_JPEG
    audio["covr"] = [MP4Cover(image_data, imageformat=fmt)]
    audio.save()


def embed_aac(path, image_data, mime):
    # Raw .aac (ADTS) streams generally can't hold tags/art; only an MP4 container works.
    try:
        embed_mp4(path, image_data, mime)
    except Exception:  # noqa: BLE001 - any mutagen failure means "not an MP4 container"
        raise RuntimeError(
            "Raw .aac files (ADTS streams) don't support embedded album art. "
            "Convert to .m4a first if you need cover art."
        )


def process_file(path, image_data, mime):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".flac":
        embed_flac(path, image_data, mime)
    elif ext == ".mp3":
        embed_mp3(path, image_data, mime)
    elif ext in (".m4a", ".mp4"):
        embed_mp4(path, image_data, mime)
    elif ext == ".aac":
        embed_aac(path, image_data, mime)
    else:
        raise ValueError(f"Unsupported extension: {ext}")


def embed_cover(directory, image_path, files=None, cancel=None):
    """
    Embed image_path into the audio files of directory (all of them, or only the names in
    files). cancel is an optional threading.Event checked between files.
    Returns {'ok': [...], 'failed': [{'track', 'error'}], 'folder', 'cancelled', 'error'}.
    """
    summary = {
        "ok": [],
        "failed": [],
        "folder": None,
        "cancelled": False,
        "error": None,
    }
    cancel = cancel or threading.Event()

    if not os.path.isdir(directory):
        summary["error"] = f"The folder '{directory}' does not exist."
        return summary
    directory = os.path.abspath(directory)
    summary["folder"] = directory
    if not image_path or not os.path.isfile(image_path):
        summary["error"] = "No valid cover image found or specified."
        return summary
    if not image_path.lower().endswith(IMAGE_EXTS):
        summary["error"] = "The cover image must be a .jpg, .jpeg or .png file."
        return summary

    available = list_audio_files(directory)
    names = [n for n in available if files is None or n in files]
    if not names:
        summary["error"] = "No supported audio files found in the folder."
        return summary

    with open(image_path, "rb") as f:
        image_data = f.read()
    mime = guess_mime(image_path)

    log(f"Using cover image: {image_path} ({mime})")
    emit("start", total=len(names), folder=directory)

    for index, name in enumerate(names, start=1):
        if cancel.is_set():
            summary["cancelled"] = True
            log("Cancelled.")
            break
        emit("file_start", index=index, total=len(names), name=name)
        try:
            process_file(os.path.join(directory, name), image_data, mime)
        except Exception as e:  # noqa: BLE001 - one bad file must not stop the batch
            summary["failed"].append({"track": name, "error": str(e)})
            emit("file_error", index=index, name=name, error=str(e))
            log(f"[FAIL] {name}: {e}")
        else:
            summary["ok"].append(name)
            emit("file_done", index=index, name=name)
            log(f"[OK]   {name}")
    return summary
