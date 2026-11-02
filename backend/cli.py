#!/usr/bin/env python3
"""Interactive command-line front end: asks for a folder and a cover image, then embeds it."""

import os
import sys

import core


def main():
    print("--- Audio Album Art Embedder ---\n")

    dir_input = input(
        "Enter the path to the music directory (Press Enter for current directory): "
    ).strip()
    directory = os.path.abspath(dir_input or ".")
    if not os.path.isdir(directory):
        sys.exit(f"Error: The directory '{directory}' does not exist.")

    auto_image = core.find_cover_image(directory)
    prompt = "Enter the path to the cover image"
    if auto_image:
        prompt += f" (Press Enter to auto-detect: {os.path.basename(auto_image)})"
    image_input = input(prompt + ": ").strip()
    image_path = image_input or auto_image

    files = core.list_audio_files(directory)
    if files:
        print(f"\nFound {len(files)} audio file(s). Processing...\n")

    summary = core.embed_cover(directory, image_path)
    if summary["error"]:
        sys.exit(f"Error: {summary['error']}")
    print(
        f"\nDone. {len(summary['ok'])} file(s) updated, {len(summary['failed'])} failed."
    )


if __name__ == "__main__":
    main()
