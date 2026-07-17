# Notes Factory

Generates premium exam notes from the `MASTER-PROMPT-ExamNotesPDF v6.md` master prompt using any **free** chat AI (DeepSeek recommended — the prompt is large), then publishes them to WordPress as drafts. The GitHub save step can be one-click automatic (a GitHub token you provide is stored only in your browser) or fully manual with no token at all — your choice. WordPress credentials never enter the browser or the repo either way.

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
4. Tap "Auto-save to GitHub" → the tool pushes <slug>.json straight into
   pending-notes/ using a GitHub token you set up once (step 0 below).
   No download, no manual upload page. (Prefer no token stored in the
   browser? Use the manual download + GitHub upload page fallback instead —
   still one tap away.)

GitHub Actions (automatic, seconds later):
5. The workflow posts the note to your WordPress site as a DRAFT and
   moves the file to published-notes/ with the new post's id + link.

You, in WordPress:
6. Open the draft — title, slug, content, AND all Rank Math fields (Focus
   Keyword, SEO Title, Meta Description) already filled — review, hit Publish.
```

If step 5 fails, the file simply stays in `pending-notes/`, the failure is visible in the **Actions** tab, and you can re-run it from there once the cause is fixed. Nothing is ever lost — the JSON in the repo is the permanent backup of every note.

## One-time setup

### 0. GitHub token (only if you want one-tap auto-save — skip for the manual fallback)

1. Go to **[github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)** (fine-grained tokens).
2. **Resource owner:** your account/org. **Repository access:** "Only select repositories" → pick this repo.
3. **Permissions → Repository permissions → Contents:** Read and write. Leave everything else as "No access."
4. Generate, copy the token (starts `github_pat_…`), paste it into the app's "GitHub token" field in Step 4. It's saved only in this browser's local storage and sent only to `api.github.com` when you tap "Auto-save."
5. Tokens can be revoked any time from the same GitHub settings page if you ever want to invalidate it.

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

### 3. Rank Math REST snippet (one time, ~2 minutes — makes SEO fields fully automatic)

WordPress's REST API refuses to write post meta that isn't registered for REST, and Rank Math doesn't register its fields. Install the snippet in [`wp-snippet-rank-math-rest.php`](wp-snippet-rank-math-rest.php) once (easiest: the **Code Snippets** plugin → Add New → paste → Activate; the file's header lists two other install options). After that, every draft arrives with Focus Keyword, SEO Title, and Meta Description already set in Rank Math — true one-click publish.

**Without the snippet nothing breaks:** the workflow detects the rejection, retries without the SEO meta so the draft still lands, and prints a warning telling you to paste the Rank Math fields manually for that post (the tool's "Copy Rank Math fields" button covers that).

### 4. That's it

The workflow (`.github/workflows/publish-note.yml`) and folders (`pending-notes/`, `published-notes/`) are already in the repo.

## Caveats you should know

- **Ad scripts require `unfiltered_html`.** WordPress strips `<script>` tags (the AdSense slots) from post content unless the authenticated user has the `unfiltered_html` capability — on a normal single-site install that means an **Administrator**. If drafts arrive with the ad code missing, that's why.
- **Rank Math automation needs the snippet from setup step 3.** Without it, drafts still publish but SEO fields must be pasted manually (the workflow warns you when this happens); with it, everything is set automatically.
- **Duplicate protection:** re-uploading a `<slug>.json` that was already published is skipped automatically (the workflow sees `published-notes/<slug>.json` exists). To genuinely republish, delete that file first.
- **The upload page needs the folder to exist** — it does (`pending-notes/.gitkeep`), don't delete it.
- **Paste the notes body into a Custom HTML block** in WordPress if you ever paste manually — a Paragraph block will escape the HTML and show tags as text. (Via the pipeline this doesn't matter: REST inserts the raw HTML directly.)

## Privacy model (what lives where)

| Data | Where it lives | Secret? |
|---|---|---|
| Master prompt | repo file, public | no |
| Generated notes | `pending-notes/` → `published-notes/`, public repo | no (they're going on a public website anyway) |
| GitHub username/repo | browser `localStorage` only | no |
| GitHub token (optional, for auto-save) | browser `localStorage` only, sent only to `api.github.com` | yes — scope it to Contents-only on this one repo, skip it entirely if you'd rather use the manual fallback |
| WP credentials | GitHub Actions encrypted secrets only | **yes — never anywhere else** |
| AI chat account | your own DeepSeek/ChatGPT session | never touches this tool |
