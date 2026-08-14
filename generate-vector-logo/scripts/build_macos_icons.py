#!/usr/bin/env python3
import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from render_variants import render, renderer_available

SIZES = [(16,"16x16"),(32,"16x16@2x"),(32,"32x32"),(64,"32x32@2x"),(128,"128x128"),(256,"128x128@2x"),(256,"256x256"),(512,"256x256@2x"),(512,"512x512"),(1024,"512x512@2x")]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("svg", type=Path)
    p.add_argument("--output-dir", type=Path, required=True)
    p.add_argument("--allow-npx", action="store_true")
    p.add_argument("--force", action="store_true")
    a = p.parse_args()
    if not a.svg.is_file() or a.svg.suffix.lower() != ".svg":
        p.error(f"SVG input does not exist or is not an SVG file: {a.svg}")
    if not renderer_available(a.allow_npx):
        p.error("No SVG renderer found. Install rsvg-convert/resvg or pass --allow-npx.")

    a.output_dir.mkdir(parents=True, exist_ok=True)
    iconset = a.output_dir / "icon.iconset"
    icns = a.output_dir / "icon.icns"
    has_iconutil = bool(shutil.which("iconutil"))
    targets = (iconset, icns) if has_iconutil else (iconset,)
    existing = [path for path in targets if path.exists() or path.is_symlink()]
    if existing and not a.force:
        raise SystemExit(f"Refusing to replace {', '.join(map(str, existing))}; pass --force")

    with tempfile.TemporaryDirectory(prefix=".icon-build-", dir=a.output_dir) as temp_raw:
        temp_dir = Path(temp_raw)
        staged_iconset = temp_dir / "icon.iconset"
        staged_iconset.mkdir()
        for px, label in SIZES:
            render(a.svg, staged_iconset / f"icon_{label}.png", px, a.allow_npx)

        staged_icns = temp_dir / "icon.icns"
        if has_iconutil:
            subprocess.run(
                ["iconutil", "-c", "icns", str(staged_iconset), "-o", str(staged_icns)],
                check=True,
            )

        backups = temp_dir / "backups"
        backups.mkdir()
        installed = []
        try:
            for path in existing:
                os.replace(path, backups / path.name)
            os.replace(staged_iconset, iconset)
            installed.append(iconset)
            if has_iconutil:
                os.replace(staged_icns, icns)
                installed.append(icns)
            else:
                print("iconutil unavailable; PNG iconset created")
        except Exception:
            for path in installed:
                if path.is_dir() and not path.is_symlink():
                    shutil.rmtree(path)
                elif path.exists() or path.is_symlink():
                    path.unlink()
            for backup in backups.iterdir():
                os.replace(backup, a.output_dir / backup.name)
            raise

if __name__ == "__main__": main()
