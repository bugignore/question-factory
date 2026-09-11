"""
Sanity-checks the whole NCERT RAG corpus after the extract -> decode ->
organize -> index pipeline, so you don't have to eyeball 298 files by hand.

Checks per chapter file in ncert-corpus/by-subject/:
  - word count (flags anything suspiciously short -> likely a bad extraction)
  - Devanagari character density (flags anything that still looks like
    un-converted Kruti Dev garbage, or accidentally-empty content)
  - leftover Kruti Dev signature tokens (esa/gSa/osQ/fd as whole words) that
    would mean decode_krutidev.mjs missed this file
Cross-checks:
  - by-subject/ file count matches ncert_corpus.csv row count
  - ncert_corpus.csv row count matches ncert-index.json docCount
  - every book folder from ncert-corpus/_raw/ is represented in the CSV

Usage:
    python verify_corpus.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "output"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
KB_DIR = REPO_ROOT / "Automation" / "ncert-knowledge-base"
RAW_DIR = BASE / "ncert-corpus" / "_raw"
BY_SUBJECT_DIR = KB_DIR / "by-subject"
CSV_PATH = BASE / "ncert-corpus" / "ncert_corpus.csv"
INDEX_PATH = KB_DIR / "index.json"

MIN_WORDS = 100
MIN_DEVANAGARI_RATIO = 0.5
KRUTI_DEV_SIGNATURE = re.compile(r"\b(esa|gSa|osQ|fd|dks|gS)\b")


def devanagari_ratio(text: str) -> float:
    letters = [c for c in text if not c.isspace()]
    if not letters:
        return 1.0
    devanagari = sum(1 for c in letters if "ऀ" <= c <= "ॿ")
    return devanagari / len(letters)


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if not BY_SUBJECT_DIR.exists():
        print("ncert-corpus/by-subject/ not found — run organize_ncert_corpus.py first.")
        return

    flags = []
    per_subject = {}
    total_files = 0
    total_words = 0

    for subject_dir in sorted(BY_SUBJECT_DIR.iterdir()):
        if not subject_dir.is_dir():
            continue
        subject = subject_dir.name
        stats = per_subject.setdefault(subject, {"files": 0, "words": 0, "flagged": 0})
        for f in sorted(subject_dir.glob("*.txt")):
            text = f.read_text(encoding="utf-8")
            words = len(text.split())
            ratio = devanagari_ratio(text)
            kruti_hits = len(KRUTI_DEV_SIGNATURE.findall(text))

            total_files += 1
            total_words += words
            stats["files"] += 1
            stats["words"] += words

            reasons = []
            if words < MIN_WORDS:
                reasons.append(f"too short ({words} words)")
            if ratio < MIN_DEVANAGARI_RATIO:
                reasons.append(f"low Devanagari density ({ratio:.0%})")
            if kruti_hits >= 3:
                reasons.append(f"possible un-converted Kruti Dev text ({kruti_hits} signature hits)")
            if reasons:
                stats["flagged"] += 1
                flags.append((f"{subject}/{f.name}", reasons))

    print("=== Per-subject summary ===")
    for subject, stats in sorted(per_subject.items()):
        avg_words = stats["words"] // stats["files"] if stats["files"] else 0
        flag_note = f"  ⚠ {stats['flagged']} flagged" if stats["flagged"] else ""
        print(f"  {subject:20s} {stats['files']:3d} files, avg {avg_words:5d} words{flag_note}")

    print(f"\nTotal: {total_files} files, {total_words} words, {len(flags)} flagged file(s).")

    if flags:
        print("\n=== Flagged files (inspect these) ===")
        for name, reasons in flags:
            print(f"  {name}: {'; '.join(reasons)}")
    else:
        print("No files flagged — all chapters passed the word-count and Devanagari-density checks.")

    # cross-checks
    print("\n=== Cross-checks ===")
    csv_rows = 0
    if CSV_PATH.exists():
        with open(CSV_PATH, encoding="utf-8") as fh:
            csv_rows = sum(1 for _ in csv.DictReader(fh))
    print(f"  by-subject/ files: {total_files}   ncert_corpus.csv rows: {csv_rows}   {'OK' if total_files == csv_rows else '** MISMATCH **'}")

    index_docs = 0
    if INDEX_PATH.exists():
        with open(INDEX_PATH, encoding="utf-8") as fh:
            index_docs = json.load(fh).get("docCount", 0)
    print(f"  ncert_corpus.csv rows: {csv_rows}   ncert-index.json docCount: {index_docs}   {'OK' if csv_rows == index_docs else '** MISMATCH — re-run build-index.mjs **'}")

    if RAW_DIR.exists():
        raw_books = {p.name for p in RAW_DIR.iterdir() if p.is_dir()}
        csv_books = set()
        if CSV_PATH.exists():
            with open(CSV_PATH, encoding="utf-8") as fh:
                for row in csv.DictReader(fh):
                    csv_books.add(row["book"])
        missing = []
        for book in raw_books:
            book_title = book.replace("-", " ").replace("(", "").replace(")", "").strip()
            if book_title not in csv_books:
                missing.append(book)
        if missing:
            print(f"  ** {len(missing)} raw book folder(s) not represented in the CSV: {missing}")
        else:
            print(f"  All {len(raw_books)} raw book folders are represented in the CSV.   OK")


if __name__ == "__main__":
    main()
