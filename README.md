# google-ads-audit

**A Claude skill that audits your Google Ads account like a senior PPC consultant and tells you exactly what to change, test and set up next.**

It pulls your account data (read only), works through a 7-stream check catalogue with explicit decision rules, verifies its own findings, and writes:

- an **audit report** with a one-sentence diagnosis, findings by severity and a phased action plan (A stop the bleeding, B fix the foundation, C rebuild, D grow), every action with its exact UI path and value;
- a **to-do checklist** grouped by today, this week and the next 14 days;
- a living **experiment backlog** with hypotheses, decision rules and minimum runtimes that fit your conversion volume;
- a living **account-setup checklist** ticked with evidence from your data;
- **paste-ready lists**: negative keywords, pause lists, geo include list, conversion-action settings, replacement ad copy.

It never changes your account. You stay in control of every edit.

> Status: **v0.1, early.** The method comes from real audits of a small Search account over several rounds; the generic version is new. Feedback and pull requests welcome.

## Quick start

```text
/google-ads-audit setup      connect your data once
/google-ads-audit            full audit (20 to 40 minutes)
/google-ads-audit weekly     Monday KPI check (5 minutes)
/google-ads-audit follow-up  14 days after the first fixes
```

You can also just ask: "audit my Google Ads account" or "what should I test next in Ads".

## Install

**Option 1: Claude Code plugin (recommended)**

```text
/plugin marketplace add Felixxxxs/google-ads-audit
/plugin install google-ads-audit@google-ads-audit
```

**Option 2: copy the skill folder**

```bash
git clone https://github.com/Felixxxxs/google-ads-audit
# for one project, for example your business-ai-os brain:
cp -r google-ads-audit/skills/google-ads-audit <your-project>/.claude/skills/
# or for every project:
cp -r google-ads-audit/skills/google-ads-audit ~/.claude/skills/
```

**Option 3: Claude.ai or Claude Desktop.** Zip the folder `skills/google-ads-audit` and upload it under Settings > Capabilities > Skills. There the scripts cannot reach the Google Ads API, so use the Google Ads Script or CSV path and upload the export to the chat.

## Getting your data in

| Path | Needs | Best for |
|---|---|---|
| **API** (`ads-pull.mjs`) | Developer token (free, needs Google's approval), OAuth client, Node 18+ | Regular use; Claude pulls fresh data on its own |
| **Google Ads Script** (`google-ads-script-export.js`) | Access to the account, 5 minutes | Trying it out, no developer token |
| **CSV exports** | Access to the account | Anyone, any environment |

Step-by-step: [docs/api-access.md](docs/api-access.md) (includes a design-document template for the developer-token application) and [skills/google-ads-audit/references/data-access.md](skills/google-ads-audit/references/data-access.md).

The pull scripts have no dependencies, only call read endpoints (`searchStream`, `listAccessibleCustomers`), keep credentials in `~/.config/google-ads-audit/` outside every repository, and never print a secret.

## With or without business-ai-os

The skill works on its own: on the first run it asks five questions about your business (what you sell, what a conversion is worth, where the truth about sales lives) and saves the answers, so the audit is judged against your economics, not generic benchmarks.

It was built to run inside **[business-ai-os](https://github.com/Felixxxxs/business-ai-os)**, the open-source AI Business Operating System for Claude Code. There it:

- reads your products, prices, personas, funnel and brand rules from the knowledge base instead of asking;
- uses your CRM as ground truth for leads and customers;
- files reports under `marketing-sales/inbound/paid-search/google-ads/`;
- pushes every urgent to-do into the owner's weekly briefing (the waterfall), so nothing lives only in a report.

Pairs with **[ga4-growth-strategy](https://github.com/Felixxxxs/ga4-growth-strategy)**, which evaluates all channels in Google Analytics 4 and builds the marketing and sales strategy around them.

## What is inside

```
skills/google-ads-audit/
  SKILL.md                              the procedure Claude follows
  scripts/ads-pull.mjs                  read-only API export (Markdown + JSON)
  scripts/ads-auth.mjs                  one-time OAuth sign-in
  scripts/google-ads-script-export.js   no-token export via Google Ads Scripts
  references/methodology.md             check catalogue with decision rules
  references/account-setup-checklist.md
  references/experiments.md             test design for small and large accounts
  references/data-access.md
  references/business-ai-os.md          integration contract
  templates/audit-report.md
  templates/experiment-backlog.md
docs/api-access.md
```

## What the audit checks

Conversion tracking (which actions really feed Smart Bidding, goal traps, leftover actions, values, counting), search terms and negatives (brand share, cannibalisation, served match types and AI Max, invisible spend), budgets and bidding (data thresholds for Smart Bidding, budget vs rank as the binding constraint, budget-pinned days), targeting (presence vs interest, include lists, languages, search partners, Display), keywords and Quality Score components, ads, assets and landing pages, change history and hygiene, then unit economics and the scaling ceiling. Details: [methodology.md](skills/google-ads-audit/references/methodology.md).

## Maintainer

- **Felix Zeeb** ([@Felixxxxs](https://github.com/Felixxxxs))

## License

[MIT](LICENSE). Not affiliated with or endorsed by Google. Google Ads is a trademark of Google LLC.
