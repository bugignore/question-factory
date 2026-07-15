# Notes Factory

Generates premium exam notes from the `MASTER-PROMPT-ExamNotesPDF v6.md` master prompt using any **free** chat AI (DeepSeek recommended — the prompt is large), then publishes them to WordPress as drafts — **without any password or API key ever entering the browser or the repo**.

**Live app:** `https://bugignore.github.io/question-factory/notes-factory/`

## How a note flows through the pipeline

```
You, in the browser tool (phone or desktop):
1. Pick TOPIC / EXAM TYPE / SUBJECT → tool copies the full master prompt,
   configured, to your clipboard. The master prompt file itself is never edited.
2. Paste into a new DeepSeek/ChatGPT/Claude chat → copy the whole reply back.
   (If the AI stopped midway: "Copy continue prompt" → paste in the same chat →
   paste the new reply with the continuation checkbox ticked.)
3. Review the parsed SEO fields + HTML preview, fix anything.
4. Download <slug>.json → tool opens GitHub's own upload page →
   drop the file into pending-notes/ and commit (your own GitHub login).

GitHub Actions (automatic, seconds later):
5. The workflow posts the note to your WordPress site as a DRAFT and
   moves the file to published-notes/ with the new post's id + link.

You, in WordPress:
6. Open the draft, paste the Focus Keyword + Meta Description into Rank Math's
   panel (see "Why Rank Math is manual" below), review, hit Publish.
```

If step 5 fails, the file simply stays in `pending-notes/`, the failure is visible in the **Actions** tab, and you can re-run it from there once the cause is fixed. Nothing is ever lost — the JSON in the repo is the permanent backup of every note.

## One-time setup

### 1. WordPress Application Password (no plugin needed)

1. Log in to WordPress as a user who can create posts. **For notes containing ad `<script>` tags this must be an Administrator** — see the caveat below.
2. Go to **Users → Profile → Application Passwords** (built into WordPress 5.6+).
3. Name it `notes-factory`, click **Add New Application Password**.
4. Copy the generated password (spaces are fine, keep them or strip them — both work).

### 2. GitHub Actions secrets

In this repo: **Settings → Secrets and variables → Actions → New repository secret**. Add all three:

| Secret name | Value |
|---|---|
| `WP_SITE_URL` | `https://examnotespdf.in` (your site, no trailing slash needed) |
| `WP_USERNAME` | the WordPress username the app password belongs to |
| `WP_APP_PASSWORD` | the application password from step 1 |

These are encrypted, never appear in any file, are masked in logs, and are safe even on a public repo. **Never** put them anywhere else — not in the tool, not in a committed file.

### 3. That's it

The workflow (`.github/workflows/publish-note.yml`) and folders (`pending-notes/`, `published-notes/`) are already in the repo.

## Caveats you should know

- **Ad scripts require `unfiltered_html`.** WordPress strips `<script>` tags (the AdSense slots) from post content unless the authenticated user has the `unfiltered_html` capability — on a normal single-site install that means an **Administrator**. If drafts arrive with the ad code missing, that's why.
- **Why Rank Math is manual:** Rank Math's fields (`rank_math_focus_keyword`, description) are not exposed through the core REST API by default, so the pipeline can't set them. The tool's Step 4 has a "Copy Rank Math fields" button — one paste into the Rank Math panel per post. (Automating it needs a `register_post_meta` snippet on the WP side; ask if you want that later.)
- **Duplicate protection:** re-uploading a `<slug>.json` that was already published is skipped automatically (the workflow sees `published-notes/<slug>.json` exists). To genuinely republish, delete that file first.
- **The upload page needs the folder to exist** — it does (`pending-notes/.gitkeep`), don't delete it.
- **Paste the notes body into a Custom HTML block** in WordPress if you ever paste manually — a Paragraph block will escape the HTML and show tags as text. (Via the pipeline this doesn't matter: REST inserts the raw HTML directly.)

## Privacy model (what lives where)

| Data | Where it lives | Secret? |
|---|---|---|
| Master prompt | repo file, public | no |
| Generated notes | `pending-notes/` → `published-notes/`, public repo | no (they're going on a public website anyway) |
| GitHub username/repo | browser `localStorage` only | no |
| WP credentials | GitHub Actions encrypted secrets only | **yes — never anywhere else** |
| AI chat account | your own DeepSeek/ChatGPT session | never touches this tool |
