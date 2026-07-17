# Question Factory

A single-page tool for generating verified, bilingual exam MCQs (CTET / KVS / DSSSB / REET style) as website-ready CSV, using only the free DeepSeek chat. Runs entirely in the browser — no server, no data leaves the phone.

**Live app:** after enabling GitHub Pages this will be
`https://YOUR-USERNAME.github.io/question-factory/`

## What it does

1. **Build prompt** — pick a subject preset (Pedagogy, Mathematics, Reasoning, GS, English-only, Hindi-only). It generates a strict prompt for DeepSeek: topic column locked, formulas in plain Unicode, data-interpretation questions self-contained in text, correct language rules per subject.
2. **Check, fix & shuffle** — paste DeepSeek's CSV. The tool validates all 15 columns, fixes the topic column, normalizes `exam_type_year`, enforces the language rules, removes duplicates, and **shuffles answer positions locally** so correct answers are evenly spread across options 1–4.
3. **Verify** — a checker prompt (questions only, answers stripped) goes into a *new* DeepSeek chat. The tool compares both passes; mismatches can be fixed via a third "resolver" pass that also rewrites the explanation, or discarded.
4. **Export** — copy the final verified CSV to clipboard (mobile-friendly), download it as a file, or unlock with the app password (once per browser) and tap **"Auto-save to GitHub"** to push it straight into `pending-questions/` in this repo — no GitHub login or token needed by whoever's using the tool. Uploading from `pending-questions/` into your website's question bank is still a manual step; auto-save only removes the download-then-upload dance for getting the file into the repo.

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

## Enabling one-tap auto-save (owner-only, one time)

This uses the same encrypted-token setup as Notes Factory — see [`../notes-factory/README.md`](../notes-factory/README.md#0-github-token--app-password-enables-one-tap-auto-save-for-everyone-who-uses-the-tool) for the full steps. In short: generate a fine-grained GitHub token (Contents: Read & write, scoped to this repo), encrypt it with `../admin-encrypt-token.html` using an app password, paste the resulting blob into this file's `ENCRYPTED_GH_TOKEN` constant, and give the app password to whoever uses this tool. They never see or handle the GitHub token — just that one short password, typed once per browser.

## Updating the tool later

Open the repo → tap `index.html` → pencil icon (Edit) → paste the new version → Commit. The live link updates within a minute.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app (HTML + CSS + JS, no dependencies) |
| `manifest.json` | Lets phones install it to the home screen |
| `icon.svg` | App icon |
