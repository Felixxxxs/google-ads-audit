# Experiment design for Google Ads

Small accounts cannot A/B test on conversions: a meaningful difference needs several hundred conversions per arm, which at a handful per month takes years. Design tests around what the account can actually measure.

## Choosing the decision metric

| Monthly conversions per arm | Decide on | Minimum runtime |
|---|---|---|
| Fewer than 30 | CTR and CPC (hundreds of data points a week), conversions only as a guardrail | 4 weeks |
| 30 to 100 | Conversion rate with a pre-set threshold, cost per conversion as guardrail | 4 to 6 weeks |
| More than 100 | Cost per conversion or ROAS, Google Ads Experiments (campaign drafts) with a 50/50 split | 2 to 4 weeks after learning |

## Rules for every test

- Write the test into `experiment-backlog.md` BEFORE it starts: hypothesis, change, metric, decision rule (what result means keep, kill, iterate), runtime, reviewer, review date.
- One variable per test. Run the new variant in parallel with the old one; never overwrite an ad (the ID keeps the old history).
- Respect learning periods: one week freeze after a change batch, 14 days after a geo change before a budget change, 30 days for a new campaign before judging cost per sale against backend orders.
- Ad rotation "Optimise" is not a fair split; Google pre-selects by expected clicks. Use Experiments or ad variations for a fair split, or accept the bias and say so.
- Compare only after negatives have stabilised the query mix; otherwise the test measures the query mix.
- Both arms must comply with brand and legal rules.
- Budget comes from reallocation, not on top, unless the owner decides otherwise.

## Test types that usually pay off first

1. **Ad copy angle** in the highest-volume ad group: one new RSA with a different lead message (price, proof, outcome, risk reversal) next to the current one.
2. **Landing page message match**: the same ad group pointed to a page that repeats the query's promise above the fold (Experiments or a URL split).
3. **Match type and AI Max**: AI Max or broad off vs on, as a campaign experiment, when the search term report shows heavy AI_MAX spend.
4. **Geo or language split**: a high-value country or language in its own campaign with its own budget.
5. **Bidding strategy**: Maximize Conversions vs target CPA only once the 15-conversions-for-2-months rule is met.
6. **Lead-generation offers** (free trial, assessment, guide, consultation): buy a registered user instead of a purchase. Prerequisites below.

## Prerequisites for a lead-generation test

- Its own primary conversion action on the verified event (double opt-in or activated account, not the raw form submit), funnel events in analytics.
- The downstream chain (lead → activation → booked call → purchase) is read from the product or CRM, not from Ads.
- A decision rule before spending: window, acceptable cost per verified lead, kill threshold for the lead-to-purchase rate.
- A second KPI column so lead-gen and direct campaigns compare on cost per final sale.
- Ad copy promises exactly what the gate delivers.
- Channel fit: Search for stated intent, social for latent demand.

## Backlog row format

| # | Hypothesis | Change | Metric | Decision rule | Runtime | Prerequisites | Status | Result |
|---|---|---|---|---|---|---|---|---|
| E1 | If the ad leads with the price, CTR rises because buyers compare on price | New RSA with price in headline 1, ad group X | CTR, CPC; conv. as guardrail | Keep if CTR +15 % or more at equal CPC after 4 weeks | 4 weeks | none | proposed | |

Status values: proposed · ready · running (start date) · decided (keep / kill / iterate, date) · parked.
