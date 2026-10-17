# Audit methodology: check catalogue and decision rules

Work through the streams in order. Each check names where the data is (section of the `ads-pull` report, or a GAQL query for `--gaql`) and the decision rule. Thresholds are defaults for small and mid-sized accounts; say so when you deviate.

## 0. Frame the data before analysing anything

- **Three windows:** a long baseline (the 365-day pull, expressed per 30 days), the last 30 days, the previous 30 days.
- **Account basics:** currency, time zone, auto-tagging. A UTC account shifts every hour and weekday report.
- **Change history:** the last 30 days of `change_event`. Zero rows means the account is unattended, which is a finding in itself. Every change date is a before/after boundary: numbers before it measure the old setup. For 7 days after a big change batch judge configuration, not performance.
- Write the "How to read the numbers" section first: which actions count as Conversions, which numbers are floors, that impression share below 10 % is reported as 10 %, the exact date windows.

## 1. Conversion tracking (always first)

| Check | Data | Decision rule |
|---|---|---|
| Biddable actions | Conversion actions + Conversion goals | An action feeds bidding only if it is ENABLED, primary, in "Conversions" AND its category/origin goal is biddable. List exactly those actions in the report. |
| Wrong primary | Conversion actions | Timer, page view, scroll, video, "website visits", local or Smart-campaign actions as primary = **CRITICAL**, the bidder buys lingerers. Only purchases and real leads (form submit, booked call, qualified signup) stay primary. Secondary actions merely inflate "All conversions": flag, not critical. |
| Default goal trap | Conversion goals | DEFAULT~WEBSITE (Other) biddable means every new uncategorised web action becomes biddable automatically. Set it to secondary. |
| Graveyard | Conversion actions | Duplicate purchase or lead definitions from old tracking generations (Universal Analytics, old tags, several GA4 links). Remove them. Google-hosted, Smart-campaign and YouTube actions cannot be removed: set primary off. HIDDEN is not REMOVED. |
| Micro-steps | Conversion actions | Never promote begin_checkout or add_to_cart to primary when it would dominate the signal or its close rate varies widely between campaigns. |
| Counting | Conversion actions | Leads count ONE per click, purchases EVERY. |
| Values | Conversion actions | Purchase default value = current price, or real transaction values. Never invent a lead value. Leave leads at 0 until about 20 lead outcomes are known in the CRM, then value = close rate x average order value. |
| Stopped conversions | Daily trend, conversions by action | Zero biddable conversions for N days: first compute the probability of that zero streak at the recent rate and count earlier streaks. Then count real leads outside Ads (CRM, inbox, shop). Only then touch tags: GA4 import join, cross-domain session continuity, purchase trigger URL still loading. |
| Ground truth | Backend orders or CRM vs Ads conversions | Ads conversions are a floor and use their own attribution window. Reconcile weekly, not daily. Backend orders are the truth for country, product mix and real order value. |
| Auto-tagging | Account settings | Must be on. No manual UTMs on final URLs that break the click ID. |

## 2. Search terms, waste and negatives

| Check | Data | Decision rule |
|---|---|---|
| Brand share of the brand campaign | Search terms of the brand campaign | Share of spend on true brand queries: target 85 % or more. Below 60 % after negatives = rebuild the brand campaign. |
| Brand cannibalisation | Search terms of non-brand campaigns | Brand queries bought by non-brand campaigns: a shared brand-protection negative list on every non-brand campaign. On the brand campaign never use single-word negatives that occur in the brand name, phrases only. |
| Negative candidates | "Negative keyword candidates" | Every term with cost of at least 1 % of spend (minimum 5) and zero conversions. Check intent before excluding: a costly term without conversions can be a tracking gap. |
| Review backlog | Search term status | Many expensive terms with status NONE = nobody reviews search terms. Set up the monthly review. |
| Served match types | "Spend by served match type" | A large AI_MAX or BROAD share means keywords only act as themes. With low conversion volume turn AI Max / broad off deliberately. The AI Max switch may not be readable through the API: check it in the UI. |
| Invisible spend | Search term cost covered vs total | A large unreported share means the campaign cannot be audited at query level. Read ratios, not totals. |
| Intent mismatch | Search terms | Local "near me" intent for an online product, other languages than the site, jobs, free, DIY, competitor-only queries. Split clusters carefully: a blanket negative can kill a converting sub-intent. |
| Self-blocking negatives | Shared negative lists vs own products | A negative that blocks your own product: build the new ad group first, then remove the negative. Order matters both ways. |
| Opportunity terms | Search terms | Converting or high-CTR terms with status NONE become exact keywords in the right ad group. |

## 3. Structure, budgets and bidding

| Check | Data | Decision rule |
|---|---|---|
| Smart Bidding data | Campaigns: conversions per 30 days | Fewer than 15 conversions per campaign per 30 days = starved. Maximize Conversions without a target then just spends the budget. Target CPA only after 15+ conversions in 30 days for two consecutive months. No value-based bidding at about 10 valued conversions a month. |
| CPC drift | Daily trend, previous period | Uncapped Maximize Conversions: CPC rising while clicks fall. |
| Binding constraint | Lost IS budget vs lost IS rank | Read both together. Budget-lost 10 %+ can be leakage (non-brand spend inside brand), not demand. Rank-lost 65 %+ at Quality Score 3 to 5 is a relevance problem: more budget buys more of the same. Raise a budget only where loss is to budget AND the campaign converts. IS above 80 % with unspent budget = saturated. |
| Budget-pinned | "Budget-pinned days" | 95 %+ of budget on most days = budget decides delivery. Over-delivery days (up to 2x) buying a handful of clicks are a symptom. |
| Brand bid caps | Bidding settings | A cap below the clearing CPC stops buying the clicks, it does not make them cheaper. Fix brand with match control, not bids. |
| Change sets | Plan | Under Maximize Conversions removing waste without lowering the budget saves nothing: the bidder re-spends it. Negatives plus budget cut go in one row. |
| Recommendations | UI | Reject Display expansion and broad match while conversion volume is low; dismiss so they stop resurfacing. Ad strength suggestions are usually fine. |
| Dead campaigns | 365-day pull | No signal at any funnel stage in 12 months = the safest cut, no tracking gap can hide its value. |

## 4. Targeting

| Check | Data | Decision rule |
|---|---|---|
| Location option | Campaign settings, Locations | Positive and negative both PRESENCE unless reaching interested people elsewhere is the plan. AREA_OF_INTEREST rows in "Locations" = leakage. Switch paused campaigns before re-enabling them. |
| Exclusion-only geo | Location targeting | One exclusion and no include list makes the whole world eligible. A cheap lead signal then pulls the bidder into low-CPC countries without purchase power. Build an include list from backend purchases and persona fit. |
| Language | Location and language targeting | No language criterion = all interface languages. Non-brand: the site's languages. Brand: all languages is fine. |
| Networks | Campaign settings, Networks | Display on a Search campaign: off unless deliberate. Search partners: judge by CPA, not CTR. `target_partner_search_network` is the invite-only partner network, the search partner switch is `target_search_network`. Read IS and CTR from Google Search rows only. |
| Device | Devices | No adjustment unless a device has 200+ clicks and zero conversions in one campaign over 90 days. |
| Schedule | Weekdays, `segments.hour` via `--gaql` | Small zero bands are noise: compute expected conversions first. Never schedule campaigns whose audience sits in other time zones. A schedule only frees money on a budget-capped campaign. |
| Demographics | `--gaql` age/gender views | Skews are usually shadows of geography. Do not exclude without strong evidence. |

## 5. Keywords and Quality Score

| Check | Data | Decision rule |
|---|---|---|
| Burners | Keywords, 365-day vs 30-day | Zero conversions over the baseline AND cost above 10 (account currency) in the last 30 days: pause. Watch list for the rest: pause if still zero after 30 more days. Never touch keywords that converted recently. |
| QS components | Keywords | Landing page BELOW because the keyword is wrong for the product: remove the keyword. Ad relevance BELOW: at least 3 headlines contain the ad group's terms verbatim. Expected CTR BELOW: copy and match type. Report cost-weighted QS per campaign. |
| Dead inventory | Keywords, ad groups | Keywords in removed ad groups, zero impressions for two quarters, RARELY_SERVED, template x city multiplications: pause or remove. |
| Missing core intent | Search terms vs keywords | A converting cluster with no own ad group and landing page. |

## 6. Ads, assets and landing pages

| Check | Data | Decision rule |
|---|---|---|
| Ad strength | Ads | Count POOR and AVERAGE. Use all 15 headlines and 4 descriptions, minimal pinning (position 3 is often dropped on mobile). |
| Copied templates | Ads | Headlines about another topic than the ad group. |
| Compliance | Ads vs brand and legal rules | Superlatives, unverifiable claims, wrong social proof, speed promises. A non-compliant ad is never a valid test arm. |
| Edit vs new | Ads | An edited RSA keeps its ID and history. New copy runs as a new ad in parallel for 14 days before the old converting one is paused. |
| Sitelinks | Assets | None to checkout, contact, about, home or blog pages. Account-level assets serve only where a campaign has none; old campaign-level sitelinks override them when a paused campaign is revived. |
| Location asset | Assets | Remove a location or Business Profile asset for an online-only business. |
| Missing assets | Assets | Price, promotion, specific callouts, structured snippets. |
| Landing pages | Landing pages | Spend on URLs with zero conversions (checkout entry, contact, about, retired pages). Message match: does the page name the offer, the price and the guarantee the query asks for? |

## 7. Trend, change history and hygiene

- Monthly trajectory from the 365-day pull. Anomaly months: junk traffic spikes, collapses checked against website data.
- Paused and removed legacy campaigns: remove most, keep those that document a "no signal" decision.
- Seasonality: compare the same months a year apart where the pull allows.

## 8. Cross-checks after the streams

- **Unit economics:** break-even CPA = contribution margin per sale (price minus delivery cost minus payment fees, weighted by the real product mix). Read cost per sale twice: conservative (analytics last click) and generous (Ads attribution). The truth lies between.
- **Scaling ceiling:** Keyword Planner volume per cluster x achievable IS x CTR x conversion rate. Planner groups close variants, trust only the order of magnitude. Scenario table: today, leaks closed at the same budget, reallocation, theoretical category limit.
- **Budget rules:** raise the account budget only below a declared cost per sale; fund new campaigns by reallocation first; compare with non-media levers (checkout completion).

## Prioritisation

- Severity: CRITICAL (signal broken or money burning now) · HIGH · MEDIUM · LOW. Effort in minutes or hours. Confidence high / medium / low.
- Phases: **A** stop the bleeding (one sitting, about 60 minutes, no bidding changes the same week) · **B** fix the foundation (tracking, goals, values, import, this week) · **C** rebuild keywords, geo, languages, ads, sitelinks, landing-page message (two weeks, after B) · **D** grow (new ad groups, budget raises, target CPA, retargeting) only after tracking is proven.
- Gating rule: while biddable conversions are missing, every CPA is a historical artefact. No budget decisions.
- Each action row: #, action, where (UI path), exact value, why, expected effect per month.

## What not to do (default list)

- Cap the brand bid below its clearing price.
- Merge away a small campaign that has the best ROAS.
- Promote micro-conversions to primary, or assign invented lead values.
- Put single-word negatives on the brand campaign, or negatives that kill legitimate sub-intents.
- Remove a blocking negative before the replacement ad group exists.
- Accept Display expansion or broad match recommendations on thin data.
- Change bidding strategy and conversion actions in the same week (both reset learning).
- Cut countries without orders before checking whether they ever got ad traffic.
- Pause converting legacy ads before the new ones have 14 days of data.
- Decide consent or legal questions inside an Ads change.

## Measurement plan defaults

- **Weekly** (Monday, 10 minutes, `weekly` mode): one line of 6 to 7 KPIs with corridors, for example brand share of brand spend 85 %+, biddable conversions per week, cost per conversion below X, spend on non-converting URLs 0, AI Max share, impressions of newly launched ad groups above 0.
- **Monthly** (45 minutes): search term review, backend orders by country vs the geo list, ad strength and asset performance, test pairs (decide at 4 weeks), IS budget vs rank.
- **Quarterly** (2 hours, full `audit`): backend revenue vs spend by country, structure review, prune keywords that did not serve for two quarters, re-evaluate bidding against the 15-conversions-for-2-months rule.
- After a change batch: freeze one week, then the first measurement on a fixed date with a decision rule.
