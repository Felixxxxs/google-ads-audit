# Google Ads account setup checklist

Living checklist. Tick an item only with evidence (pull file and section, or a screenshot the owner confirmed) and the date. Unknowns stay unticked with a note.

Last reviewed: YYYY-MM-DD

## 1. Account foundation

- [ ] Currency and time zone documented (time zone can only be changed once via support)
- [ ] Auto-tagging on; no manual UTMs on final URLs
- [ ] Billing, payment profile and admin access: at least two admins, no ex-employees or agencies with leftover access
- [ ] Account linked to GA4 (and Search Console, Merchant Center if relevant)
- [ ] Customer data terms accepted if enhanced conversions are used
- [ ] Consent Mode v2 implemented on the website (ad_storage, ad_user_data, ad_personalization); consent decisions documented outside Ads

## 2. Conversion tracking

- [ ] Exactly the intended actions are primary (purchase, real lead), everything else secondary
- [ ] Goal "Other (DEFAULT)" is not biddable
- [ ] No duplicate definitions of the same event (old UA, old tags, several GA4 links); graveyard removed or set to secondary
- [ ] Lead actions count ONE, purchases EVERY
- [ ] Purchase value = real transaction value or current price; no invented lead value
- [ ] GA4 import verified in Ads Diagnostics, or the native tag fires, not both for the same event
- [ ] Cross-domain tracking works between site and checkout or booking tool
- [ ] Enhanced conversions considered; offline conversion import from CRM considered for lead businesses
- [ ] Reconciliation routine with backend orders or CRM exists (weekly)

## 3. Campaign structure

- [ ] Brand and non-brand in separate campaigns
- [ ] One campaign per budget decision, one ad group per intent cluster, each with a matching landing page
- [ ] Bidding fits volume: Maximize Conversions or Clicks below 15 conversions per 30 days, target CPA only above that for two months
- [ ] Budgets sized to real demand, not to leakage; budget-capped campaigns reviewed
- [ ] AI Max and broad match switched deliberately (off at low conversion volume)
- [ ] Display network off on Search campaigns; search partners judged by CPA
- [ ] Legacy paused and removed campaigns cleaned up

## 4. Targeting

- [ ] Location include list (not exclusion only), option PRESENCE for positive and negative
- [ ] Countries justified by purchase evidence or persona fit
- [ ] Languages set deliberately per campaign (non-brand: the site's languages)
- [ ] No ad schedule or device adjustment without evidence

## 5. Keywords and negatives

- [ ] Brand-protection shared negative list on every non-brand campaign
- [ ] Non-brand phrase negative list on the brand campaign (phrases only)
- [ ] Account or shared negative list for universal junk (jobs, free, DIY, other languages)
- [ ] Shared lists checked for entries that block your own products
- [ ] Monthly search term review in the calendar
- [ ] No keywords in removed ad groups, no inventory that never serves

## 6. Ads and assets

- [ ] Every live ad group has at least one RSA with 15 headlines and 4 descriptions, minimal pinning, keyword terms in 3+ headlines
- [ ] Ad strength GOOD or EXCELLENT, or a documented reason
- [ ] All claims comply with brand and legal rules (no unverifiable superlatives or promises)
- [ ] Sitelinks (4+) to real offer pages, not checkout, contact, about or home
- [ ] Callouts, structured snippets, price and promotion assets where they fit
- [ ] No location asset for an online-only business; automatically created assets reviewed

## 7. Landing pages

- [ ] Each ad group lands on the page that answers its query (offer, price, proof, next step above the fold)
- [ ] Page speed acceptable on mobile; the conversion action fires on that page
- [ ] No ad spend on retired or redirected URLs

## 8. Operations

- [ ] Weekly KPI check (`/google-ads-audit weekly`)
- [ ] Monthly search term and geo review
- [ ] Quarterly full audit
- [ ] Change log: every batch of changes dated, so before/after comparisons are honest
- [ ] Experiment backlog maintained (`experiment-backlog.md`)
