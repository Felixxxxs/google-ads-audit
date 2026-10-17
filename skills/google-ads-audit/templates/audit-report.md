# Google Ads audit YYYY-MM-DD

> Account: NAME (123-456-7890) · Currency: XXX · Owner: NAME
> Data: `data/YYYY-MM-DD.md` (30 days, ending yesterday), `data/YYYY-MM-DD-365d.md` (baseline), plus: backend orders / CRM / GA4 (name what was used)
> Method: google-ads-audit skill, 7 streams, HIGH+ findings verified from data, business and bidding angles. N findings: X confirmed, Y qualified, Z dropped.
> Supersedes: previous audit or "first audit"

## How to read the numbers

- Biddable conversion actions: list them. Everything else is in "All conversions" only.
- Floors: Ads conversions vs backend orders (capture rate if known).
- Windows: exact dates. Change boundaries inside the window: dates and what changed.
- Impression share below 10 % is reported as 10 %.

## 1. Executive summary

**Diagnosis in one sentence.**

1. Finding (severity) with the number that proves it.
2. ...

**Core advice:** the 2 to 3 moves that matter most, in order.

| Signal | Baseline per 30 days | Last 30 days | Reading |
|---|---|---|---|
| Spend | | | |
| Biddable conversions | | | |
| Cost per conversion | | | |
| Brand share of brand spend | | | |

## 2. The account in numbers

Per campaign: budget, spend, conversions by type, value, CPA, IS with the binding constraint (budget or rank), previous 30 vs last 30.

## 3. Findings by area

### 3.1 Conversion tracking
### 3.2 Search terms and negatives
### 3.3 Structure, budgets and bidding
### 3.4 Targeting
### 3.5 Keywords and Quality Score
### 3.6 Ads, assets and landing pages
### 3.7 Trend and hygiene

Per finding:

> **[SEVERITY] Title** · confidence · effort
> Evidence: numbers with the source section. Diagnosis: why it happens. Recommendation: UI path and exact value. Impact: per month, `[estimate]` with formula. Verification note: what changed after the check, if anything.

Considered and not supported by the data: list.

## 4. Action plan

### Phase A: stop the bleeding (one sitting, about 60 minutes)

| # | Action | Where (UI path) | Exact value | Why | Effect per month |
|---|---|---|---|---|---|

### Phase B: fix the foundation (this week)
### Phase C: rebuild (next two weeks, after B)
### Phase D: grow (only after tracking is proven)

## 5. To-do checklist

🔴 Today
- [ ] A1 ... · owner · YYYY-MM-DD · UI path

🟡 This week
- [ ] B1 ...

📅 Next 14 days
- [ ] C1 ...

## 6. What not to do

## 7. Measurement plan

| KPI | Today | Corridor / target | Check date |
|---|---|---|---|

Weekly line, monthly checks, quarterly audit. First re-measurement on YYYY-MM-DD with the decision rule: ...

## 8. Experiments

Top 3 from `experiment-backlog.md` that should start next, with prerequisites.

## 9. Open questions for the owner

## Appendix: paste-ready lists

- A.1 Negative keywords (by list or campaign, match type marked)
- A.2 Brand-protection list
- A.3 Keywords to pause
- A.4 Geo include list
- A.5 Conversion-action settings (action, primary yes/no, counting, value)
- A.6 Replacement ad copy (headlines max 30 characters, descriptions max 90, character count per line)
