import importlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

validate_svg = importlib.import_module("validate_svg")
render_variants = importlib.import_module("render_variants")
build_macos_icons = importlib.import_module("build_macos_icons")


def write_svg(directory: Path, body: str) -> Path:
    path = directory / "test.svg"
    path.write_text(body, encoding="utf-8")
    return path


class ValidateSvgTests(unittest.TestCase):
    def validate(self, body: str, strict: bool = True):
        with tempfile.TemporaryDirectory() as raw:
            return validate_svg.validate(write_svg(Path(raw), body), strict)

    def test_accepts_safe_flat_svg(self):
        errors = self.validate(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
            '<title>Safe mark</title><path fill="currentColor" d="M0 0h10v10z"/></svg>'
        )
        self.assertEqual(errors, [])

    def test_rejects_active_and_external_content(self):
        payloads = [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><title>x</title></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>x</title><a href="javascript:alert(1)"/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>x</title><path style="stroke:red"/></svg>',
        ]
        for payload in payloads:
            with self.subTest(payload=payload):
                self.assertTrue(self.validate(payload))

    def test_comment_does_not_satisfy_title_requirement(self):
        errors = self.validate(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
            '<!-- <title>fake</title> --><path d="M0 0h10v10z"/></svg>'
        )
        self.assertIn("missing non-empty direct <title>", errors)

    def test_rejects_unresolved_local_reference(self):
        errors = self.validate(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
            '<title>x</title><use href="#missing"/></svg>',
            strict=False,
        )
        self.assertIn("unresolved href reference #missing", errors)

    def test_rejects_elements_from_foreign_namespaces(self):
        errors = self.validate(
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:evil="https://example.com">'
            '<title>x</title><evil:path d="M0 0h10v10z"/></svg>'
        )
        self.assertIn("element <path> is outside the SVG namespace", errors)


class RenderTests(unittest.TestCase):
    def test_empty_directory_is_an_error(self):
        with tempfile.TemporaryDirectory() as raw:
            with self.assertRaisesRegex(ValueError, "No SVG files"):
                render_variants.sources(Path(raw))

    def test_rejects_non_positive_width(self):
        with tempfile.TemporaryDirectory() as raw:
            src = write_svg(Path(raw), "<svg/>")
            with self.assertRaisesRegex(ValueError, "greater than zero"):
                render_variants.render(src, Path(raw) / "out.png", 0, False)

    @mock.patch.object(render_variants.subprocess, "run")
    @mock.patch.object(render_variants.shutil, "which")
    def test_npx_renderer_is_version_pinned(self, which, run):
        which.side_effect = lambda name: "/usr/bin/npx" if name == "npx" else None
        with tempfile.TemporaryDirectory() as raw:
            src = write_svg(Path(raw), "<svg/>")
            render_variants.render(src, Path(raw) / "out.png", 32, True)
        command = run.call_args.args[0]
        self.assertIn("@resvg/resvg-js-cli@2.6.2-beta.1", command)


class IconBuildTests(unittest.TestCase):
    @mock.patch.object(build_macos_icons, "renderer_available", return_value=True)
    @mock.patch.object(build_macos_icons, "render", side_effect=RuntimeError("render failed"))
    def test_failed_render_preserves_existing_iconset(self, _render, _available):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            svg = write_svg(root, "<svg/>")
            output = root / "icons"
            iconset = output / "icon.iconset"
            iconset.mkdir(parents=True)
            sentinel = iconset / "keep.txt"
            sentinel.write_text("keep", encoding="utf-8")
            with mock.patch.object(
                sys,
                "argv",
                ["build_macos_icons.py", str(svg), "--output-dir", str(output), "--force"],
            ):
                with self.assertRaisesRegex(RuntimeError, "render failed"):
                    build_macos_icons.main()
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "keep")

    @mock.patch.object(build_macos_icons, "renderer_available", return_value=True)
    @mock.patch.object(build_macos_icons.shutil, "which", return_value=None)
    def test_commit_failure_restores_existing_iconset(self, _which, _available):
        real_replace = build_macos_icons.os.replace

        def fake_render(_src, dst, _width, _allow_npx):
            dst.write_bytes(b"png")

        def fail_install(src, dst):
            if Path(src).name == "icon.iconset" and Path(src).parent.name.startswith(".icon-build-"):
                raise OSError("install failed")
            return real_replace(src, dst)

        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            svg = write_svg(root, "<svg/>")
            output = root / "icons"
            iconset = output / "icon.iconset"
            iconset.mkdir(parents=True)
            sentinel = iconset / "keep.txt"
            sentinel.write_text("keep", encoding="utf-8")
            with mock.patch.object(build_macos_icons, "render", side_effect=fake_render), mock.patch.object(
                build_macos_icons.os, "replace", side_effect=fail_install
            ), mock.patch.object(
                sys,
                "argv",
                ["build_macos_icons.py", str(svg), "--output-dir", str(output), "--force"],
            ):
                with self.assertRaisesRegex(OSError, "install failed"):
                    build_macos_icons.main()
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "keep")


if __name__ == "__main__":
    unittest.main()
