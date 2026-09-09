"""End-to-end automation: CSV topic list -> DeepSeek (browser) -> validated
pending-long-posts/<slug>.json -> git push -> existing publish-long-post.yml
GitHub Action drafts it to WordPress.

Everything runs from the terminal except the DeepSeek exchange itself,
which needs a real logged-in browser session (DeepSeek has no API key
issued here). Chrome is launched ONCE for the whole run; each topic opens
exactly one new tab to chat.deepseek.com and closes it before the next
topic opens its own - never more than one DeepSeek tab open at a time.

Prompt-building, reply-parsing, and hard-fail validation all run in Node
(automation/build-automation-prompt.mjs, automation/validate-bundle.mjs) -
this script only orchestrates: CSV -> prompt -> browser -> reply -> Node
validator -> file -> git. See automation/prompt-builder-automation.mjs for
the actual prompt content (same quality bar as the manual long-post-factory
tool, with the self-report/checklist scaffolding stripped out - this
script's Node validator does those checks in code instead, and only a
HARD FAIL blocks a topic; anything softer still publishes with a note).

Usage:
    python run_pipeline.py --sanity-test         # no browser, no DeepSeek, no git
    python run_pipeline.py --dry-run --limit 3   # build prompts only
    python run_pipeline.py --start 0 --limit 5   # the real thing
"""

import argparse
import json
import os
import random
import shutil
import subprocess
import sys
import time
from getpass import getpass
from pathlib import Path

from patchright.sync_api import sync_playwright, Page

REPO_ROOT = Path(__file__).resolve().parent.parent
AUTOMATION_DIR = REPO_ROOT / "automation"
PENDING_DIR = REPO_ROOT / "pending-long-posts"
PUBLISHED_INDEX = REPO_ROOT / "published-long-posts" / "index.json"

CSV_PATH = Path(__file__).parent / "input sylabuss" / "BPSC-TRE-4-Primary-Teacher-SEO-Topics-Hindi-v2.csv"

SOURCE_USER_DATA_ROOT = Path.home() / "AppData" / "Local" / "Google" / "Chrome" / "User Data"
CLONE_ROOT = Path.home() / "AppData" / "Local" / "NotesAutomateChromeProfile"
PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "Profile 14")  # missku35@gmail.com
FORCE_RECLONE = os.environ.get("FORCE_RECLONE") == "1"
IGNORE_PATTERNS = shutil.ignore_patterns("Singleton*", "lockfile", "*.lock", "LOCK")

DEEPSEEK_URL = "https://chat.deepseek.com/"
TEXTAREA_PLACEHOLDER = "Message DeepSeek"
SEND_BUTTON_SVG_D_PREFIX = "M8.3125 0.981587C8.66767 1.0545"

YEAR = 2026
SUBJECT_MAP = {
    "हिंदी": ("Hindi", 100),
    "अंग्रेजी": ("English", 80),
    "गणित": ("Maths", 80),
}
DEFAULT_SUBJECT = ("Auto-detect", 80)

_session_git_token = None  # prompted once per run, held in memory only


# ---------------------------------------------------------------- topics --

def load_topics(start: int, limit):
    rows = []
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        import csv
        reader = csv.reader(f)
        next(reader)  # malformed header, read by position instead
        for row in reader:
            if len(row) < 4 or not row[0].strip():
                continue
            subject_raw = row[1].strip()
            topic = row[2].strip()
            exam = row[3].strip()
            subject, hindi_pct = SUBJECT_MAP.get(subject_raw, DEFAULT_SUBJECT)
            rows.append({
                "no": row[0].strip(), "subject_raw": subject_raw, "subject": subject,
                "hindi_pct": hindi_pct, "topic": topic, "exam": exam,
            })
    rows = rows[start:]
    if limit:
        rows = rows[:limit]
    return rows


def slugify(s: str) -> str:
    import re
    s = (s or "").lower().strip()
    s = re.sub(r"^/+|/+$", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def candidate_slug(topic: str, exam: str) -> str:
    return slugify(f"{topic} {exam} notes {YEAR}")


def load_existing_topics():
    """Returns (published_slugs: set[str], pending_pairs: set[(topic, exam)])."""
    published_slugs = set()
    if PUBLISHED_INDEX.exists():
        try:
            published_slugs = set(json.loads(PUBLISHED_INDEX.read_text(encoding="utf-8")))
        except Exception:
            pass

    pending_pairs = set()
    if PENDING_DIR.exists():
        for f in PENDING_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                t = (data.get("topic") or "").strip().lower()
                e = (data.get("examType") or "").strip().lower()
                if t and e:
                    pending_pairs.add((t, e))
                slug = (data.get("seo") or {}).get("slug")
                if slug:
                    published_slugs.add(slug)
            except Exception:
                continue
    return published_slugs, pending_pairs


def is_duplicate(topic, exam, published_slugs, pending_pairs) -> bool:
    if (topic.strip().lower(), exam.strip().lower()) in pending_pairs:
        return True
    if candidate_slug(topic, exam) in published_slugs:
        return True
    return False


# ------------------------------------------------------------ node calls --

def run_node(script: str, args: list, stdin_text: str = None) -> str:
    result = subprocess.run(
        ["node", str(AUTOMATION_DIR / script), *args],
        input=stdin_text, capture_output=True, text=True, encoding="utf-8",
        cwd=str(AUTOMATION_DIR),
    )
    if result.returncode != 0:
        raise RuntimeError(f"node {script} failed: {result.stderr}")
    return result.stdout


def build_prompt(topic, exam, subject, hindi_pct) -> str:
    return run_node("build-automation-prompt.mjs", [
        "--topic", topic, "--exam", exam, "--subject", subject,
        "--hindi", str(hindi_pct), "--year", str(YEAR),
    ])


def validate_and_bundle(raw_reply, topic, exam, subject, hindi_pct) -> dict:
    out = run_node("validate-bundle.mjs", [
        "--topic", topic, "--exam", exam, "--subject", subject,
        "--hindi", str(hindi_pct), "--year", str(YEAR),
    ], stdin_text=raw_reply)
    return json.loads(out)


# ---------------------------------------------------------------- chrome --

def ensure_clone() -> Path:
    clone_profile_dir = CLONE_ROOT / PROFILE_DIR
    if clone_profile_dir.exists() and not FORCE_RECLONE:
        print(f"Using existing profile clone: {clone_profile_dir}")
        return CLONE_ROOT
    print(f"Cloning profile '{PROFILE_DIR}' into {CLONE_ROOT} ...")
    CLONE_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE_USER_DATA_ROOT / "Local State", CLONE_ROOT / "Local State")
    shutil.copytree(SOURCE_USER_DATA_ROOT / PROFILE_DIR, clone_profile_dir,
                     ignore=IGNORE_PATTERNS, dirs_exist_ok=True)
    print("Clone ready.")
    return CLONE_ROOT


def jitter(a, b):
    return random.uniform(a, b)


def run_topic_through_deepseek(context, prompt_text: str) -> str:
    """Opens one new tab, sends the prompt, waits for the reply, returns the
    raw text, then closes that tab. Never more than one DeepSeek tab open."""
    ds_page = context.new_page()
    try:
        ds_page.goto(DEEPSEEK_URL, wait_until="domcontentloaded")
        ds_page.wait_for_timeout(int(jitter(4000, 9000)))  # extra random wait

        textarea = ds_page.get_by_placeholder(TEXTAREA_PLACEHOLDER)
        textarea.wait_for(state="visible", timeout=60000)
        textarea.click()

        # put the prompt on the OS clipboard from inside this tab, then paste
        # (a real trusted paste, not a JS-injected value)
        ds_page.evaluate("(t) => navigator.clipboard.writeText(t)", prompt_text)
        ds_page.wait_for_timeout(int(jitter(300, 700)))
        ds_page.keyboard.press("Control+V")
        ds_page.wait_for_timeout(int(jitter(500, 1200)))

        pasted = textarea.input_value()
        if len(pasted.strip()) < len(prompt_text.strip()) * 0.5:
            textarea.fill(prompt_text)  # fallback if clipboard paste didn't take

        ds_page.wait_for_timeout(int(jitter(800, 2200)))

        send_btn = ds_page.locator(f'path[d^="{SEND_BUTTON_SVG_D_PREFIX[:40]}"]').locator("xpath=ancestor::button[1]")
        try:
            send_btn.click(timeout=5000)
        except Exception:
            textarea.press("Enter")

        # wait for the reply to finish streaming - poll for text stability
        stable_reads, last_len = 0, -1
        deadline = time.time() + 600
        while time.time() < deadline:
            ds_page.wait_for_timeout(2000)
            cur_len = len(ds_page.inner_text("body"))
            stable_reads = stable_reads + 1 if cur_len == last_len else 0
            last_len = cur_len
            if stable_reads >= 4:
                break

        return ds_page.inner_text("body")
    finally:
        ds_page.close()  # destroy this tab before the next topic opens a new one


# ------------------------------------------------------------------ git --

def get_git_token():
    global _session_git_token
    if _session_git_token is None:
        _session_git_token = getpass(
            "GitHub App Password / Personal Access Token (used only for this terminal session, never written to disk): "
        )
    return _session_git_token


def git_commit_and_push(file_path: Path, message: str):
    subprocess.run(["git", "add", str(file_path)], cwd=str(REPO_ROOT), check=True)
    result = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=str(REPO_ROOT))
    if result.returncode == 0:
        print("  Nothing to commit (file unchanged?).")
        return
    subprocess.run(["git", "commit", "-m", message], cwd=str(REPO_ROOT), check=True)

    remote_url = subprocess.run(
        ["git", "config", "--get", "remote.origin.url"], cwd=str(REPO_ROOT),
        capture_output=True, text=True, check=True,
    ).stdout.strip()

    push_target = remote_url
    if remote_url.startswith("https://") and "@" not in remote_url:
        token = get_git_token()
        push_target = remote_url.replace("https://", f"https://x-access-token:{token}@", 1)

    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=str(REPO_ROOT),
        capture_output=True, text=True, check=True,
    ).stdout.strip()

    subprocess.run(["git", "push", push_target, f"HEAD:{branch}"], cwd=str(REPO_ROOT), check=True)
    print(f"  Pushed — publish-long-post.yml will pick this up and draft it to WordPress.")


# --------------------------------------------------------------- sanity --

def sanity_test():
    print("Sanity test: parse -> validate -> bundle, no browser, no DeepSeek, no git.\n")

    seo = {
        "focusKeyword": "Sanity Test BPSC Notes 2026", "seoTitle": "Sanity Test BPSC Notes 2026: Complete Guide",
        "slug": "sanity-test-bpsc-notes-2026", "metaDescription": "A sanity-check fixture, not real content.",
        "h1": "Sanity Test", "imageAltText": "Sanity Test BPSC Notes 2026 diagram", "imagePrompt": "n/a",
    }
    filler = "यह एक सैनिटी-टेस्ट वाक्य है जो केवल शब्द-गणना जाँचने के लिए दोहराया गया है। "
    body = "{* h2: Section One *}\n" + ("<p>" + filler * 25 + "</p>\n") * 12 + "{* END *}\n"
    raw = (
        "<<<SEO_JSON>>>\n```json\n" + json.dumps(seo) + "\n```\n<<<END_SEO_JSON>>>\n\n"
        "<<<NOTES_BODY_HTML>>>\n```\n" + body + "```\n<<<END_NOTES_BODY_HTML>>>\n\n"
        "<<<PUBLISHER_NOTES>>>\n```\n- Seed: 1 (sanity fixture)\n```\n<<<END_PUBLISHER_NOTES>>>\n"
    )

    result = validate_and_bundle(raw, "Sanity Test", "BPSC TRE 4", "Hindi", 100)
    print(json.dumps({k: v for k, v in result.items() if k != "bundle"}, indent=2, ensure_ascii=False))

    if not result["pass"]:
        print("\nSANITY TEST FAILED — the fixture itself should always pass. Check validate-bundle.mjs.")
        sys.exit(1)

    out_path = PENDING_DIR / "__sanity_test__.json"
    out_path.write_text(json.dumps(result["bundle"], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {out_path} (delete this — it's a fixture, not a real post).")
    print("Sanity test PASSED: parse, hard-fail validation, and bundle-writing all work without any LLM.")


# ---------------------------------------------------------------- main --

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true", help="Build + validate prompts only, no DeepSeek/git")
    ap.add_argument("--sanity-test", action="store_true", help="No LLM, no browser, no git — proves the code path")
    args = ap.parse_args()

    if args.sanity_test:
        sanity_test()
        return

    topics = load_topics(args.start, args.limit)
    published_slugs, pending_pairs = load_existing_topics()
    print(f"Loaded {len(topics)} topics. {len(published_slugs)} already published, {len(pending_pairs)} pending.")

    if args.dry_run:
        run_topics(topics, published_slugs, pending_pairs, context=None, dry_run=True)
        return

    user_data_root = ensure_clone()
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            str(user_data_root), channel="chrome", headless=False,
            args=[f"--profile-directory={PROFILE_DIR}"], viewport=None,
        )
        run_topics(topics, published_slugs, pending_pairs, context=context, dry_run=False)
        context.close()


def run_topics(topics, published_slugs, pending_pairs, context, dry_run: bool):
    done, skipped, failed = 0, 0, 0
    for i, row in enumerate(topics, 1):
        topic, exam, subject, hindi_pct = row["topic"], row["exam"], row["subject"], row["hindi_pct"]
        print(f"\n[{i}/{len(topics)}] #{row['no']} {row['subject_raw']} -> {subject} "
              f"({hindi_pct}% Hindi) | {topic[:60]}...")

        if is_duplicate(topic, exam, published_slugs, pending_pairs):
            print("  Skipping — already published or pending.")
            skipped += 1
            continue

        prompt_text = build_prompt(topic, exam, subject, hindi_pct)
        print(f"  Prompt built: {len(prompt_text.split())} words")

        if dry_run:
            continue

        raw_reply = run_topic_through_deepseek(context, prompt_text)
        print(f"  DeepSeek reply captured: {len(raw_reply)} chars")

        result = validate_and_bundle(raw_reply, topic, exam, subject, hindi_pct)
        if not result["pass"]:
            print(f"  HARD FAIL — skipping this topic:")
            for f in result["hardFails"]:
                print(f"    - {f}")
            failed += 1
            continue

        if result["warnings"]:
            print(f"  Passed with {len(result['warnings'])} warning(s) (non-blocking):")
            for w in result["warnings"]:
                print(f"    - {w}")

        slug = result["bundle"]["seo"]["slug"]
        out_path = PENDING_DIR / f"{slug}.json"
        out_path.write_text(json.dumps(result["bundle"], ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  Wrote {out_path.name} ({result['wordCount']} words)")

        git_commit_and_push(out_path, f"Add long post: {slug} [automation]")

        pending_pairs.add((topic.strip().lower(), exam.strip().lower()))
        done += 1

        cooldown = jitter(15, 40)
        print(f"  Cooling down {cooldown:.1f}s before next topic...")
        time.sleep(cooldown)

    print(f"\nBatch done: {done} published, {skipped} skipped (duplicate), {failed} hard-failed.")


if __name__ == "__main__":
    main()
