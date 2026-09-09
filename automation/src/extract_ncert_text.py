"""
Extracts raw chapter text out of the downloaded NCERT epub/zip files in
../NCERT_Hindi_Books/ into automation/ncert-corpus/_raw/<subject>/chNN.txt.

This is a LOCAL, GITIGNORED working step — the raw extracted text is a
near-verbatim copy of copyrighted NCERT textbook content, so it must never be
committed. summarize_ncert_gists.mjs reads these raw files afterwards and
asks Claude to write an original condensed gist per chapter (not a copy) —
those gists are what actually lands in ncert-corpus/ and gets committed.

Each downloaded "book" is a zip containing one nested mini-epub per chapter
(e.g. Science/5451_1.epub, Science/5451_2.epub, ...). This script opens the
outer zip, then opens each inner epub as its own zip, pulls every
.xhtml/.html/.htm entry out of it, strips tags with BeautifulSoup, and
concatenates the result as that chapter's raw text. Chapters that yield under
MIN_CHAPTER_WORDS words (covers, blank nav pages, copyright pages) are
skipped rather than written as noise.

Usage:
    python extract_ncert_text.py
"""

from __future__ import annotations

import re
import shutil
import sys
import zipfile
from io import BytesIO
from pathlib import Path

from bs4 import BeautifulSoup

BOOKS_DIR = Path(__file__).resolve().parent.parent / "input" / "book-library"
RAW_OUT_DIR = Path(__file__).resolve().parent.parent / "output" / "ncert-corpus" / "_raw"
MIN_CHAPTER_WORDS = 80


def slugify(s: str) -> str:
    s = re.sub(r"\s*[–-]\s*अंग्रेजी\s*$", "", s)  # strip the "– अंग्रेजी" suffix the downloader adds
    s = re.sub(r"\s*\(\d+\)$", "", s)              # strip "(1)" duplicate-download suffixes
    s = s.strip()
    s = re.sub(r"[^\w\s()-]", "", s, flags=re.UNICODE)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s.lower() or "book"


def chapter_number(inner_name: str) -> int:
    m = re.search(r"_(\d+)\.epub$", inner_name)
    return int(m.group(1)) if m else 0


def extract_inner_epub_text(inner_bytes: bytes) -> str:
    parts: list[str] = []
    try:
        with zipfile.ZipFile(BytesIO(inner_bytes)) as inner_zf:
            html_names = [n for n in inner_zf.namelist() if re.search(r"\.(xhtml|html|htm)$", n, re.I)]
            html_names.sort()
            for name in html_names:
                try:
                    raw = inner_zf.read(name)
                    soup = BeautifulSoup(raw, "html.parser")
                    text = soup.get_text("\n", strip=True)
                    if text:
                        parts.append(text)
                except Exception:
                    continue
    except zipfile.BadZipFile:
        return ""
    return "\n\n".join(parts)


def process_archive(path: Path) -> int:
    subject_slug = slugify(path.stem)
    out_dir = RAW_OUT_DIR / subject_slug
    written = 0
    try:
        with zipfile.ZipFile(path) as zf:
            inner_epubs = [n for n in zf.namelist() if n.lower().endswith(".epub")]
            inner_epubs.sort(key=chapter_number)
            if not inner_epubs:
                print(f"  [skip] {path.name} — no nested .epub chapter files found")
                return 0
            out_dir.mkdir(parents=True, exist_ok=True)
            for name in inner_epubs:
                n = chapter_number(name)
                text = extract_inner_epub_text(zf.read(name))
                word_count = len(text.split())
                if word_count < MIN_CHAPTER_WORDS:
                    continue
                out_path = out_dir / f"ch{n:02d}.txt"
                out_path.write_text(text, encoding="utf-8")
                written += 1
    except zipfile.BadZipFile:
        print(f"  [skip] {path.name} — not a valid zip/epub")
        return 0
    print(f"  {path.name} -> {subject_slug}/ ({written} chapter file(s))")
    return written


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    if not BOOKS_DIR.exists():
        print(f"No {BOOKS_DIR} directory found — nothing to extract.")
        return
    archives = sorted(
        p for p in BOOKS_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in (".epub", ".zip")
    )
    if not archives:
        print(f"No .epub/.zip files found directly in {BOOKS_DIR}.")
        return

    # Rebuild _raw/ from scratch each run so an archive removed/renamed in
    # NCERT_Hindi_Books/ doesn't leave a stale orphaned book folder behind.
    if RAW_OUT_DIR.exists():
        shutil.rmtree(RAW_OUT_DIR)

    print(f"Extracting {len(archives)} archive(s) into {RAW_OUT_DIR} (gitignored, local-only)...")
    total = 0
    for archive in archives:
        total += process_archive(archive)
    print(f"Done. {total} raw chapter file(s) written. Next: node decode_krutidev.mjs")


if __name__ == "__main__":
    main()
