# Running inside a business-ai-os brain

[business-ai-os](https://github.com/Felixxxxs/business-ai-os) is a markdown operating system for a company in Claude Code. When this skill runs inside one, it grounds the audit in the company's own knowledge and feeds the results into the briefings, so nothing lives only in a report.

## Detection

The working directory (or `git rev-parse --show-toplevel`) contains `knowledge_base/company/business.md` and `marketing-sales/`. If the root `CLAUDE.md` still says "NOT ONBOARDED", tell the user to run `/onboard` first and fall back to standalone mode.

## Pre-reads (on demand, not all at once)

| File | Used for |
|---|---|
| root `CLAUDE.md` | north-star KPI, currency, time zone, owner of marketing |
| `knowledge_base/company/business.md` | markets, legal entity, what the company is |
| `knowledge_base/company/products.md`, `pricing.md` | offers, prices, the break-even CPA; the ONLY source for prices in ad copy |
| `knowledge_base/company/target_groups.md` | personas: which queries are in or out, ad copy angle |
| `knowledge_base/company/funnel.md` | which conversion is the real one, conversion rates downstream |
| `knowledge_base/company/brand_guidelines.md` + `.claude/rules/style-customer-facing.md` | mandatory before any replacement ad copy |
| `knowledge_base/market/competitors.md` | competitor brand terms (negative or conquest decision) |
| `marketing-sales/crm/customers/customer-overview.md`, `leads/lead-pipeline-overview.md` | ground truth for leads and customers by source |

## Output location

```
marketing-sales/inbound/paid-search/google-ads/
  data/                                 dated pull files (.md + .json)
  YYYY-MM-DD-google-ads-audit.md        audit reports
  YYYY-MM-DD-google-ads-follow-up.md
  weekly/YYYY-MM-DD.md
  experiment-backlog.md                 living
  account-setup-checklist.md            living
  README.md                             channel state in 5 lines + pointer to the current working document
```

Create `README.md` on the first run: account ID, currency, monthly spend, campaigns live, current working document, last audit date, next review date.

## Waterfall (same response as the report)

1. `marketing-sales/inbound/README.md` (or `sources.md` if it exists): the paid search row with channel, monthly spend, conversions to the north-star event, link to the current audit.
2. Owner's master weekly briefing (`business/operations/weekly/<owner>/master-weekly-briefing.md`): every 🔴 and 🟡 to-do from the checklist as a manual to-do with a link back. Nothing beyond 14 days.
3. If an experiment starts within 14 days, it appears in the briefing too.

## Conventions

- Dates `YYYY-MM-DD`, the brain's internal language and currency format.
- Replacement ad copy is a draft: file it in the report appendix, the owner launches it.
- Claims in ad copy only from `products.md` and `pricing.md`; open brand decisions in `brand_guidelines.md` override older wording.
- If the brain also runs the `ga4-growth-strategy` skill, link both reports to each other and use the same date windows.
