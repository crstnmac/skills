#!/usr/bin/env python3
import argparse
import shutil
import subprocess
from pathlib import Path

RESVG_NPM_PACKAGE = "@resvg/resvg-js-cli@2.6.2-beta.1"


def sources(path: Path):
    if not path.exists():
        raise ValueError(f"Input does not exist: {path}")
    if path.is_dir():
        found = sorted(path.glob("*.svg"))
        if not found:
            raise ValueError(f"No SVG files found in: {path}")
        return found
    if path.suffix.lower() != ".svg":
        raise ValueError(f"Input is not an SVG file: {path}")
    return [path]


def renderer_available(allow_npx: bool) -> bool:
    return bool(
        shutil.which("rsvg-convert")
        or shutil.which("resvg")
        or (allow_npx and shutil.which("npx"))
    )

def render(src: Path, dst: Path, width: int, allow_npx: bool):
    if width <= 0:
        raise ValueError("Render width must be greater than zero")
    if not src.is_file():
        raise ValueError(f"SVG input does not exist: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    if shutil.which("rsvg-convert"):
        cmd = ["rsvg-convert", "-w", str(width), "-h", str(width), "-o", str(dst), str(src)]
    elif shutil.which("resvg"):
        cmd = ["resvg", "--width", str(width), "--height", str(width), str(src), str(dst)]
    elif allow_npx and shutil.which("npx"):
        cmd = ["npx", "--yes", RESVG_NPM_PACKAGE, "--fit-width", str(width), str(src), str(dst)]
    else:
        raise RuntimeError("No SVG renderer found. Install rsvg-convert/resvg or pass --allow-npx.")
    subprocess.run(cmd, check=True)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", type=Path)
    p.add_argument("--output-dir", type=Path, required=True)
    p.add_argument("--width", type=int, default=512)
    p.add_argument("--allow-npx", action="store_true")
    a = p.parse_args()
    try:
        inputs = sources(a.input)
        if a.width <= 0:
            raise ValueError("Render width must be greater than zero")
        if not renderer_available(a.allow_npx):
            raise RuntimeError("No SVG renderer found. Install rsvg-convert/resvg or pass --allow-npx.")
    except (ValueError, RuntimeError) as exc:
        p.error(str(exc))
    for src in inputs:
        dst = a.output_dir / f"{src.stem}-{a.width}.png"
        render(src, dst, a.width, a.allow_npx); print(dst)

if __name__ == "__main__": main()
