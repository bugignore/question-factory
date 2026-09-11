"""
Takes the raw extracted chapters in ncert-corpus/_raw/<book-folder>/chNN.txt
(written by extract_ncert_text.py) and:

1. Cleans obvious extraction noise (repeated running headers, bare page
   numbers, stray whitespace).
2. Re-groups everything into ONE coherent folder tree by subject, written to
   the shared Automation/ncert-knowledge-base/ folder at the repo root (not
   here in Automation/core/ — that's where any tool reads the finished corpus from):
       ../../../ncert-knowledge-base/by-subject/<Subject>/<book-slug>__chNN.txt
3. Writes a single flat CSV covering the whole corpus (stays in Automation/core/ —
   a convenience export, not part of the shared knowledge base):
       ncert-corpus/ncert_corpus.csv
   columns: subject, book, chapter, title, word_count, text

Both outputs are the input to build-index.mjs (TF-IDF, no API key needed —
see Automation/core/README.md for why this path needs no key, unlike the
AI-rewritten-gist path in summarize_ncert_gists.mjs).

Usage:
    python organize_ncert_corpus.py
"""

from __future__ import annotations

import csv
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
KB_DIR = REPO_ROOT / "Automation" / "ncert-knowledge-base"
RAW_DIR = OUTPUT_DIR / "ncert-corpus" / "_raw"
BY_SUBJECT_DIR = KB_DIR / "by-subject"
CSV_PATH = OUTPUT_DIR / "ncert-corpus" / "ncert_corpus.csv"


def guess_subject(folder_slug: str) -> str:
    s = folder_slug.lower()
    if "hindi" in s or re.search(r"हद|कषतज|अतर|बल-रम", s):
        return "Hindi"
    if "geography" in s or "paryaavaran" in s or "habitat" in s or "bhugol" in s or "भगल" in s:
        return "Geography"
    if "history" in s or "atit" in s or "adhith" in s or "past" in s or "इतहस" in s:
        return "History"
    if "science" in s and "social" not in s:
        return "Science"
    if "social" in s or "rajneeti" in s or "samanik" in s or "shaamajik" in s or "nagrik" in s:
        return "Political Science"
    if "math" in s or "ganit" in s or "गणत" in s:
        return "Maths"
    if "biology" in s or "jeev" in s or "जव" in s:
        return "Biology"
    if "chemistry" in s or "rasayan" in s or "रसयन" in s:
        return "Chemistry"
    if "economics" in s or "arthashastra" in s or "aarthik" in s or "अरथशसतर" in s:
        return "Economics"
    return "General"


def clean_text(text: str) -> str:
    lines = text.split("\n")
    cleaned_lines = []
    freq = Counter(l.strip() for l in lines if l.strip())
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.fullmatch(r"\d{1,4}", stripped):  # bare page number
            continue
        # a line repeated 4+ times across the chapter is almost certainly a
        # running header/footer, not chapter content
        if freq[stripped] >= 4 and len(stripped) < 60:
            continue
        cleaned_lines.append(stripped)

    # Chapters extracted from these epubs open with a dumped table-of-contents
    # (a run of short "N.M  Subsection Title" lines) before the real prose
    # starts — noise that isn't part of the actual chapter content. Drop
    # leading short lines (< TOC_LINE_WORD_LIMIT words) until the first line
    # that reads like a real sentence, capped so a genuinely short-lined
    # chapter opening can't be stripped away entirely.
    TOC_LINE_WORD_LIMIT = 8
    MAX_LINES_TO_SKIP = 30
    first_real_line = 0
    for i, line in enumerate(cleaned_lines[:MAX_LINES_TO_SKIP]):
        if len(line.split()) >= TOC_LINE_WORD_LIMIT:
            first_real_line = i
            break
    else:
        first_real_line = 0  # never found a long line in the cap — leave everything, don't guess further
    cleaned_lines = cleaned_lines[first_real_line:]

    out = "\n".join(cleaned_lines)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def title_from_folder(folder_slug: str) -> str:
    return folder_slug.replace("-", " ").replace("(", "").replace(")", "").strip()


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if not RAW_DIR.exists():
        print(f"No {RAW_DIR} — run extract_ncert_text.py first.")
        return

    # Rebuild by-subject/ from scratch each run so a book removed/renamed in
    # _raw doesn't leave a stale orphaned chapter file behind here.
    if BY_SUBJECT_DIR.exists():
        shutil.rmtree(BY_SUBJECT_DIR)

    rows = []
    written = 0
    for book_folder in sorted(p for p in RAW_DIR.iterdir() if p.is_dir()):
        subject = guess_subject(book_folder.name)
        subject_dir = BY_SUBJECT_DIR / subject
        subject_dir.mkdir(parents=True, exist_ok=True)
        title = title_from_folder(book_folder.name)

        for chapter_file in sorted(book_folder.glob("ch*.txt")):
            raw = chapter_file.read_text(encoding="utf-8")
            cleaned = clean_text(raw)
            word_count = len(cleaned.split())
            if word_count < 60:
                continue

            chapter_num = re.search(r"ch(\d+)", chapter_file.stem)
            chapter_num = chapter_num.group(1) if chapter_num else "00"

            out_name = f"{book_folder.name}__ch{chapter_num}.txt"
            (subject_dir / out_name).write_text(cleaned, encoding="utf-8")
            written += 1

            rows.append({
                "subject": subject,
                "book": title,
                "chapter": chapter_num,
                "title": f"{title} — Chapter {int(chapter_num)}",
                "word_count": word_count,
                "text": cleaned
            })

    BY_SUBJECT_DIR.mkdir(parents=True, exist_ok=True)
    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["subject", "book", "chapter", "title", "word_count", "text"])
        writer.writeheader()
        writer.writerows(rows)

    by_subject_counts = Counter(r["subject"] for r in rows)
    print(f"Organized {written} chapter file(s) into {BY_SUBJECT_DIR}:")
    for subj, count in sorted(by_subject_counts.items()):
        print(f"  {subj}: {count} chapter(s)")
    print(f"Wrote {CSV_PATH} ({len(rows)} rows). Next: node build-index.mjs")


if __name__ == "__main__":
    main()
