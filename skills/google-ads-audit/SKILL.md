---
name: google-ads-audit
description: Pull Google Ads data (API, Google Ads Script or CSV exports), audit the account, and deliver a prioritised optimisation plan with a to-do checklist, an experiment backlog and an account-setup checklist. Read only, a human makes every change. Use when someone wants to analyse, audit, optimise, fix, set up or review a Google Ads account or Search campaigns, e.g. "audit my Google Ads", "why is my CPA so high", "what should I test next in Ads", "is my Ads account set up correctly", "weekly Ads check".
argument-hint: "[audit | weekly | follow-up | setup] [--days N]"
---

# Google Ads audit

Input: $ARGUMENTS. Mode is the first word, default `audit`:

| Mode | What it produces | Time |
|---|---|---|
| `audit` | Full audit: findings, phased action plan, to-do checklist, experiment backlog, setup checklist | 20 to 40 min |
| `weekly` | 7-day KPI line against target corridors plus anything that needs action this week | 5 min |
| `follow-up` | Target vs actual against the last audit, open items re-sorted by leverage, new findings | 15 min |
| `setup` | Walks the user through data access (API, Ads Script or CSV) and nothing else | 10 min |

This skill directory (shown as "Base directory" when the skill loads) contains `scripts/`, `references/` and `templates/`. Below, `<skill>` means that directory. Always double-quote paths.

## Hard rules

- **Read only.** Never call a mutate endpoint, never ask for write access. Every recommendation names the exact UI path and value so a human can apply it.
- Credentials stay outside every repo (`~/.config/google-ads-audit/`). Never print, paste or commit a token. If the user pastes one into the chat, tell them to rotate it.
- Never invent numbers. Every figure in the report traces to a pulled file. Estimates are tagged `[estimate]` with their formula.
- Confirm the account currency before quoting any amount.

## Step 1: Context (who is this for)

Detect the environment first:

- **Inside a business-ai-os brain** (the repo has `knowledge_base/company/business.md` and `marketing-sales/`): read `business.md`, `products.md`, `pricing.md`, `target_groups.md`, `funnel.md` and the root `CLAUDE.md` north-star KPI. Load them on demand, never bulk-read the rest. Output folder: `marketing-sales/inbound/paid-search/google-ads/`. Details: `<skill>/references/business-ai-os.md`.
- **Standalone:** look for `google-ads-audit/context.md` in the working directory. If it is missing, ask these questions in ONE message, then save the answers there so they are never asked again:
  1. What do you sell, to whom, in which countries and languages?
  2. What is one real conversion worth to you (average order value, margin, or lead-to-customer rate)? What may one customer cost at most?
  3. What counts as a real conversion (purchase, qualified lead, booked call)? Where is the ground truth (shop backend, CRM)?
  4. Which changes did you make in the account in the last 60 days?
  5. Anything that must not change (brand rules, legal claims, campaigns someone else owns)?
  Output folder: `google-ads-audit/` in the working directory.

If an earlier audit exists in the output folder, read its action plan first: the new run must say what was done and what is still open.

## Step 2: Data

Pick the first source that works. `setup` mode explains each one; `<skill>/references/data-access.md` has the details.

1. **API (best):** `node "<skill>/scripts/ads-pull.mjs" --customer <id> --days 30 --out "<output>/data"`. List accounts with `--list`. Needs a developer token and a one-time `node "<skill>/scripts/ads-auth.mjs"`. Run it twice for the audit: `--days 30` and `--days 365` (the long window is the baseline for low-volume conversions). Ad hoc questions: `--gaql "SELECT ..."` prints without writing.
2. **Google Ads Script (no developer token):** the user pastes `<skill>/scripts/google-ads-script-export.js` into Tools > Bulk actions > Scripts, runs it, and downloads the resulting Google Sheet as `.xlsx` or CSV into `<output>/data/`.
3. **CSV exports from the UI:** the list of reports to download is in `references/data-access.md`.

Read the generated `.md` report. The `.json` beside it is the raw archive: query it with `jq` or `grep`, never read it whole into context.

## Step 3: Analysis

Follow `<skill>/references/methodology.md` in order. It is the check catalogue with decision rules and thresholds. The seven streams:

1. Conversion tracking (always first: if the signal is broken, every CPA below is fiction)
2. Search terms, waste and negatives
3. Structure, budgets and bidding
4. Targeting: locations, languages, networks, devices, schedule
5. Keywords and Quality Score
6. Ads, assets and landing pages
7. Trend, change history and hygiene

Then the cross-checks: ground truth (backend orders or CRM vs Ads conversions), unit economics (break-even CPA), and the scaling ceiling. If the user has GA4 data or the `ga4-growth-strategy` skill output, use it to compare attribution, never to replace Ads numbers.

**Verify before you report.** For every finding of severity HIGH or above, argue against it once from three angles: `data` (recompute the number from the file), `business` (does the fix fit the context from step 1), `bidding` (how will Smart Bidding react). Drop refuted findings, weaken qualified ones in place. For a large account, delegate the streams and the verification to subagents if the environment offers them.

## Step 4: Deliverables

Write `<output>/YYYY-MM-DD-google-ads-audit.md` from `<skill>/templates/audit-report.md`. It contains:

- **Executive summary:** one-sentence diagnosis, 5 to 12 numbered findings, the core advice.
- **How to read the numbers:** which actions count, which data is a floor, windows, change boundaries.
- **Findings by area**, each with severity, evidence, diagnosis, recommendation (UI path + exact value), impact, effort, confidence.
- **Action plan in phases:** A stop the bleeding (one sitting) · B fix the foundation (this week) · C rebuild (2 weeks) · D grow (only after tracking is proven). Rows in execution order. Coupled changes (for example negatives plus a budget cut) stay in one row.
- **To-do checklist:** every action as `- [ ]` with owner, due date and UI path, grouped 🔴 today · 🟡 this week · 📅 next 14 days.
- **What not to do** (from `methodology.md` plus account-specific items).
- **Paste-ready appendices:** negative keyword lists, pause lists, geo include list, conversion-action settings table, replacement ad copy within character limits.
- **Measurement plan:** weekly KPI line, monthly and quarterly checks, the date of the first re-measurement.
- **Open questions** only the owner can answer.

Also create or update two living files in the output folder:

- `experiment-backlog.md` from `<skill>/templates/experiment-backlog.md`, following `<skill>/references/experiments.md`. Every test has hypothesis, metric, decision rule, minimum runtime and prerequisites, written before it starts.
- `account-setup-checklist.md`: copy `<skill>/references/account-setup-checklist.md` on the first run, then tick items with evidence from the data and date them. Unknowns stay unticked with a note.

## Step 5: Close

- **business-ai-os:** run the waterfall in the same response: add or update the paid-search row in `marketing-sales/inbound/README.md` (or its `sources.md`), and put every 🔴 and 🟡 to-do into the owner's master weekly briefing. Details in `references/business-ai-os.md`.
- **Standalone:** end with the five most important to-dos in the chat and the path to the report.
- Suggest the next run: `weekly` every Monday, `follow-up` 14 days after phase A, a full `audit` every quarter.

## Mode specifics

- `weekly`: pull `--days 7`, compare with the corridors in the last audit's measurement plan, write `<output>/weekly/YYYY-MM-DD.md` (one KPI table, max 5 bullets, only actions due this week). No full audit.
- `follow-up`: pull `--days 30`, read the last audit and the change history, build a target-vs-actual table for every action, re-sort open items by leverage, add only new findings. Write `<output>/YYYY-MM-DD-google-ads-follow-up.md`.
- `setup`: walk through `references/data-access.md` step by step, test with `--list`, stop when one pull works.
