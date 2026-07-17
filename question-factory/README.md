# Question Factory

A single-page tool for generating verified, bilingual exam MCQs (CTET / KVS / DSSSB / REET style) as website-ready CSV, using only the free DeepSeek chat. Runs entirely in the browser — no server, no data leaves the phone.

**Live app:** after enabling GitHub Pages this will be
`https://YOUR-USERNAME.github.io/question-factory/`

## What it does

1. **Build prompt** — pick a subject preset (Pedagogy, Mathematics, Reasoning, GS, English-only, Hindi-only). It generates a strict prompt for DeepSeek: topic column locked, formulas in plain Unicode, data-interpretation questions self-contained in text, correct language rules per subject.
2. **Check, fix & shuffle** — paste DeepSeek's CSV. The tool validates all 15 columns, fixes the topic column, normalizes `exam_type_year`, enforces the language rules, removes duplicates, and **shuffles answer positions locally** so correct answers are evenly spread across options 1–4.
3. **Verify** — a checker prompt (questions only, answers stripped) goes into a *new* DeepSeek chat. The tool compares both passes; mismatches can be fixed via a third "resolver" pass that also rewrites the explanation, or discarded.
4. **Export** — copy the final verified CSV to clipboard (mobile-friendly), download it as a file, or tap **"Auto-save to GitHub"** to push it straight into `pending-questions/` in this repo using a GitHub token stored only in your browser (same one-time token setup as Notes Factory — see below). Uploading from `pending-questions/` into your website's question bank is still a manual step; auto-save only removes the download-then-upload dance for getting the file into the repo.

## CSV format

```
topic,question_en,question_hi,option1_en,option1_hi,option2_en,option2_hi,
option3_en,option3_hi,option4_en,option4_hi,correct,explanation_en,
explanation_hi,exam_type_year
```

## Hosting setup (one time, ~3 minutes, works from a phone)

1. Create a free account at github.com.
2. Tap **+** → **New repository** → name it `question-factory` → keep it **Public** → Create.
3. On the repo page tap **uploading an existing file** → upload `index.html`, `manifest.json`, `icon.svg` → **Commit changes**.
4. Go to **Settings → Pages** → under *Branch* choose `main` and `/ (root)` → **Save**.
5. Wait ~1 minute. The link appears at the top of the Pages settings.

Share that link. On the phone, open it in Chrome → menu (⋮) → **Add to Home screen** → it now opens full-screen like an app.

## GitHub token (only if you want one-tap auto-save)

1. Go to **[github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)** (fine-grained tokens).
2. **Resource owner:** your account/org. **Repository access:** "Only select repositories" → pick this repo.
3. **Permissions → Repository permissions → Contents:** Read and write. Leave everything else as "No access."
4. Generate, copy the token, paste it into the app's "GitHub token" field in Step 4. It's saved only in this browser's local storage and sent only to `api.github.com` when you tap "Auto-save to GitHub."
5. Don't want to store a token in the browser at all? Skip this — "Download file" still works exactly as before.

## Updating the tool later

Open the repo → tap `index.html` → pencil icon (Edit) → paste the new version → Commit. The live link updates within a minute.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app (HTML + CSS + JS, no dependencies) |
| `manifest.json` | Lets phones install it to the home screen |
| `icon.svg` | App icon |
