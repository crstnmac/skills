#!/usr/bin/env python3
import argparse
import re
from pathlib import Path
import xml.etree.ElementTree as ET

SVG = "{http://www.w3.org/2000/svg}"
ALLOWED_ELEMENTS = {
    "svg", "title", "desc", "metadata", "defs", "g", "path", "rect",
    "circle", "ellipse", "line", "polyline", "polygon", "mask", "clipPath",
    "use", "linearGradient", "radialGradient", "stop",
}
STRICT_FORBIDDEN_ELEMENTS = {"linearGradient", "radialGradient", "text"}
URL_PATTERN = re.compile(r"url\(([^)]*)\)", re.I)


def local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1].split(":", 1)[-1]


def namespace(name: str) -> str:
    return name[1:].split("}", 1)[0] if name.startswith("{") else ""


def safe_local_url(value: str) -> bool:
    value = value.strip().strip('"\'')
    return bool(re.fullmatch(r"#[A-Za-z_][\w:.-]*", value))

def validate(path: Path, strict: bool) -> list[str]:
    errors = []
    try:
        root = ET.parse(path).getroot()
    except Exception as exc:
        return [f"invalid XML: {exc}"]
    if root.tag != SVG + "svg":
        errors.append("root element is not a namespaced <svg>")
    if not root.get("viewBox"):
        errors.append("missing viewBox")
    ids = [e.get("id") for e in root.iter() if e.get("id")]
    if len(ids) != len(set(ids)):
        errors.append("duplicate id values")

    titles = [child for child in root if local_name(child.tag) == "title"]
    if not any("".join(title.itertext()).strip() for title in titles):
        errors.append("missing non-empty direct <title>")

    known_ids = set(ids)
    for element in root.iter():
        element_name = local_name(element.tag)
        if namespace(element.tag) != SVG[1:-1]:
            errors.append(f"element <{element_name}> is outside the SVG namespace")
        if element_name not in ALLOWED_ELEMENTS:
            errors.append(f"forbidden element <{element_name}>")
        if strict and element_name in STRICT_FORBIDDEN_ELEMENTS:
            errors.append(f"strict-flat forbids <{element_name}>")

        for raw_name, raw_value in element.attrib.items():
            name = local_name(raw_name)
            value = raw_value.strip()
            if name.lower().startswith("on"):
                errors.append(f"forbidden event attribute {name}")
            if name == "style":
                errors.append("inline style attributes are forbidden")
            if name == "href" and not safe_local_url(value):
                errors.append("href must be a local fragment reference")
            for match in URL_PATTERN.finditer(value):
                reference = match.group(1).strip().strip('"\'')
                if not safe_local_url(reference):
                    errors.append(f"external or invalid URL reference in {name}")
                elif reference[1:] not in known_ids:
                    errors.append(f"unresolved URL reference {reference}")
            if strict and name == "stroke" and value.lower() != "none":
                errors.append("strict-flat forbids strokes")

    for element in root.iter():
        href = next(
            (value for name, value in element.attrib.items() if local_name(name) == "href"),
            None,
        )
        if href and safe_local_url(href) and href.strip()[1:] not in known_ids:
            errors.append(f"unresolved href reference {href.strip()}")

    errors = list(dict.fromkeys(errors))
    return errors

def main():
    p = argparse.ArgumentParser()
    p.add_argument("files", nargs="+")
    p.add_argument("--strict-flat", action="store_true")
    a = p.parse_args(); failed = False
    for raw in a.files:
        path = Path(raw); errs = validate(path, a.strict_flat)
        if errs:
            failed = True
            for e in errs: print(f"ERROR {path}: {e}")
        else: print(f"OK {path}")
    raise SystemExit(1 if failed else 0)

if __name__ == "__main__": main()
