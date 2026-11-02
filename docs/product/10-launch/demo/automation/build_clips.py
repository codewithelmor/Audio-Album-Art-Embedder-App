"""Prepares the clips for assemble.py: labelled Explorer BEFORE/AFTER clips (cropped to the file pane,
no nav pane / device names), title card and end card. Run from the demo folder: python automation/build_clips.py"""

import json
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

D = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
R = f"{D}/recordings/explorer"
FONT_B = "C\:/Windows/Fonts/segoeuib.ttf"


def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-2500:])


CROP = "crop=1000:562:215:136,scale=1920:1080:flags=lanczos"


def label(text, color, x=40, y=940, size=64):
    return (
        f"drawbox=x={x - 20}:y={y - 12}:w={len(text) * size * 0.56 + 40:.0f}:h={size + 34}:color={color}@0.92:t=fill,"
        f"drawtext=fontfile='{FONT_B}':text='{text}':fontsize={size}:fontcolor=white:x={x}:y={y}"
    )


# BEFORE
run(
    [
        "ffmpeg",
        "-y",
        "-i",
        f"{R}/before-raw.mp4",
        "-vf",
        f"{CROP},{label('BEFORE - no cover art', '0xC0392B')},fps=30",
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-an",
        f"{R}/before.mp4",
    ]
)
run(
    [
        "ffmpeg",
        "-y",
        "-ss",
        "3",
        "-i",
        f"{R}/before-raw.mp4",
        "-frames:v",
        "1",
        "-vf",
        CROP,
        f"{R}/before-still.png",
    ]
)
# AFTER with the BEFORE frame as an inset from 3 s on
fc = (
    f"[0:v]{CROP},{label('AFTER - cover art embedded', '0x1E8449')}[a];"
    f"[1:v]scale=560:316,pad=560:360:0:44:color=0xC0392B,drawbox=x=0:y=0:w=iw:h=ih:color=white:t=4,"
    f"drawtext=fontfile='{FONT_B}':text='BEFORE':fontsize=30:fontcolor=white:x=14:y=6[b];"
    f"[a][b]overlay=x=W-w-40:y=H-h-40:enable='gte(t,3.5)',fps=30[v]"
)
run(
    [
        "ffmpeg",
        "-y",
        "-i",
        f"{R}/after-raw.mp4",
        "-i",
        f"{R}/before-still.png",
        "-filter_complex",
        fc,
        "-map",
        "[v]",
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-an",
        f"{R}/after.mp4",
    ]
)


# cards
def card(path, lines):
    im = Image.new("RGB", (1920, 1080), (18, 18, 18))
    d = ImageDraw.Draw(im)
    icon = (
        Image.open(f"{D}/../../../../app/assets/icon.png")
        .convert("RGBA")
        .resize((220, 220))
    )
    im.paste(icon, (850, 230), icon)
    y = 520
    for txt, size, col in lines:
        f = ImageFont.truetype(
            "C:/Windows/Fonts/segoeuib.ttf"
            if size > 40
            else "C:/Windows/Fonts/segoeui.ttf",
            size,
        )
        w = d.textlength(txt, font=f)
        d.text(((1920 - w) / 2, y), txt, font=f, fill=col)
        y += size + 26
    im.save(path)


os.makedirs(f"{D}/thumbnail", exist_ok=True)
card(
    f"{D}/thumbnail/title.png",
    [
        ("Embed cover art into your music", 72, (255, 255, 255)),
        ("Audio Album Art Embedder  v1.0.0", 40, (130, 170, 255)),
    ],
)
card(
    f"{D}/thumbnail/end.png",
    [
        ("Audio Album Art Embedder  v1.0.0", 64, (255, 255, 255)),
        (
            "MP3, FLAC, M4A and AAC  |  Try it on a copy of your music folder",
            36,
            (130, 170, 255),
        ),
        ("Narration: AI-generated voice (Kokoro, am_michael)", 28, (160, 160, 160)),
    ],
)
# end card as a clip so s07 can be voiced over it
run(
    [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-t",
        "9",
        "-i",
        f"{D}/thumbnail/end.png",
        "-vf",
        "fps=30,format=yuv420p",
        "-c:v",
        "libx264",
        "-crf",
        "18",
        f"{D}/recordings/endcard.mp4",
    ]
)
json.dump(
    {"scenes": [{"id": "s01", "start": 0.4}]}, open(f"{R}/before-markers.json", "w")
)
json.dump(
    {"scenes": [{"id": "s06", "start": 0.5}]}, open(f"{R}/after-markers.json", "w")
)
json.dump(
    {"scenes": [{"id": "s07", "start": 0.3}]},
    open(f"{D}/recordings/endcard-markers.json", "w"),
)
print("clips ok")
