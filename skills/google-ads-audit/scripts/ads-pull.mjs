// Pulls performance, settings and tracking data from one Google Ads account and
// writes a dated Markdown report plus a raw JSON archive.
//
// Standard run (writes files):
//   node ads-pull.mjs --customer 123-456-7890 [--days 30] [--out <dir>]
// Which accounts can this login see:
//   node ads-pull.mjs --list
// Ad hoc query (prints JSON, writes nothing):
//   node ads-pull.mjs --customer 123-456-7890 --gaql "SELECT campaign.name FROM campaign"
//
// Credentials live OUTSIDE every repo, by default in
// ~/.config/google-ads-audit/ads.json (written by ads-auth.mjs). Override with
// --config <file> or GOOGLE_ADS_CONFIG. Keys: developer_token, client_id,
// client_secret, refresh_token, optional login_customer_id (manager account)
// and customer_id. No secret is ever printed.
//
// Read only: GoogleAdsService.SearchStream and ListAccessibleCustomers, never
// a mutate call. The skill recommends changes, a human makes them.
//
// No dependencies: Node 18+ fs and fetch.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (name, dflt) => { const i = args.indexOf(name); return i > -1 && args[i + 1] ? args[i + 1] : dflt }
const flag = (name) => args.includes(name)

// Google sunsets every API version after roughly a year. If a run fails with
// "version is deprecated", raise this or pass --api-version.
const API_VERSION = opt('--api-version', process.env.GOOGLE_ADS_API_VERSION || 'v24')
const DAYS = Number(opt('--days', 30))
const GAQL = opt('--gaql', null)

function fail(err) {
  console.error(`Google Ads pull failed: ${err && err.message ? err.message : err}`)
  process.exit(1)
}
process.on("uncaughtException", (e) => { if (process.env.DEBUG) console.error(e.stack); fail(e) })
process.on('unhandledRejection', fail)

// ------------------------------------------------------------- credentials
function configFile() {
  const explicit = opt('--config', process.env.GOOGLE_ADS_CONFIG)
  if (explicit) return explicit
  const dirs = [path.join(os.homedir(), '.config', 'google-ads-audit')]
  // Under WSL the Linux home is empty, the file sits in the Windows profile.
  dirs.push(path.join('/mnt/c/Users', os.userInfo().username, '.config', 'google-ads-audit'))
  if (process.env.USERPROFILE) dirs.push(path.join(process.env.USERPROFILE, '.config', 'google-ads-audit'))
  return dirs.map((d) => path.join(d, 'ads.json')).find((f) => fs.existsSync(f)) || path.join(dirs[0], 'ads.json')
}

function config() {
  const file = configFile()
  const c = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  // Environment variables win over the file, for CI or a shared machine.
  const env = {
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  }
  for (const [k, v] of Object.entries(env)) if (v) c[k] = v
  for (const k of ['developer_token', 'client_id', 'client_secret', 'refresh_token']) {
    if (!c[k]) throw new Error(`${k} missing (looked in ${file} and GOOGLE_ADS_* env). Run: node ads-auth.mjs`)
  }
  return c
}

async function accessToken(c) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.client_id, client_secret: c.client_secret,
      refresh_token: c.refresh_token, grant_type: 'refresh_token',
    }),
  })
  const j = await res.json()
  if (!j.access_token) throw new Error(`token refresh failed: ${j.error_description || j.error || 'unknown'}. Re-run ads-auth.mjs`)
  return j.access_token
}

const digits = (id) => String(id || '').replace(/\D/g, '')

function headers(c, token) {
  const h = { authorization: `Bearer ${token}`, 'developer-token': c.developer_token, 'content-type': 'application/json' }
  if (c.login_customer_id) h['login-customer-id'] = digits(c.login_customer_id)
  return h
}

function apiError(status, text) {
  let msg = text.slice(0, 400)
  try {
    const j = JSON.parse(text)
    const e = Array.isArray(j) ? j[0]?.error : j.error
    msg = e?.details?.[0]?.errors?.map((x) => x.message).join(' | ') || e?.message || msg
  } catch { /* keep raw text */ }
  return new Error(`Ads API ${status}: ${msg}`)
}

// One GAQL query, result as a flat list of rows.
async function query(c, token, customer, gaql) {
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers/${customer}/googleAds:searchStream`, {
    method: 'POST', headers: headers(c, token), body: JSON.stringify({ query: gaql }),
  })
  const text = await res.text()
  if (!res.ok) throw apiError(res.status, text)
  return JSON.parse(text).flatMap((batch) => batch.results || [])
}

// ------------------------------------------------------------- formatting
const money = (micros) => Number(micros || 0) / 1e6
const n0 = (x) => Math.round(Number(x || 0)).toLocaleString('en-US')
const n1 = (x) => Number(x || 0).toFixed(1)
// Shares arrive as 0..1. A missing value means "not measured", which is not 0 %.
const pct = (x) => (x == null ? 'n/a' : (Number(x) * 100).toFixed(0) + ' %')
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const table = (head, rows) => rows.length
  ? [`| ${head.join(' | ')} |`, `|${'---|'.repeat(head.length)}`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
  : '_No rows in this period._'
// Cost per conversion, honestly: without a conversion there is no value.
const cpa = (cost, conv) => (Number(conv) > 0 ? n0(cost / Number(conv)) : 'no conv.')
const ctr = (clicks, impr) => (Number(impr) > 0 ? (Number(clicks) / Number(impr) * 100).toFixed(1) + ' %' : 'n/a')

// The range ends YESTERDAY: today is partial and would distort every
// comparison between two exports. The file carries the last full day.
const iso = (d) => d.toISOString().slice(0, 10)
const shift = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }
const end = opt('--end', null) ? new Date(opt('--end')) : shift(new Date(), -1)
const start = opt('--start', null) ? new Date(opt('--start')) : shift(end, -(DAYS - 1))
const span = Math.round((end - start) / 86400000) + 1
const prevEnd = shift(start, -1)
const prevStart = shift(prevEnd, -(span - 1))
const RANGE = `segments.date BETWEEN '${iso(start)}' AND '${iso(end)}'`
const PREV_RANGE = `segments.date BETWEEN '${iso(prevStart)}' AND '${iso(prevEnd)}'`

// ------------------------------------------------------------------- run
const cfg = config()
const token = await accessToken(cfg)

if (flag('--list')) {
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers:listAccessibleCustomers`, { headers: headers(cfg, token) })
  const text = await res.text()
  if (!res.ok) throw apiError(res.status, text)
  const ids = (JSON.parse(text).resourceNames || []).map((r) => r.split('/')[1])
  for (const id of ids) {
    const row = await query(cfg, token, id, 'SELECT customer.descriptive_name, customer.currency_code, customer.manager FROM customer').catch(() => [])
    const cu = row[0]?.customer
    console.log(`${id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}\t${cu?.descriptiveName ?? '(no direct access, try login_customer_id)'}\t${cu?.currencyCode ?? ''}\t${cu?.manager ? 'manager' : ''}`)
  }
  process.exit(0)
}

const CUSTOMER = digits(opt('--customer', cfg.customer_id))
if (!CUSTOMER) throw new Error('No account. Pass --customer 123-456-7890 or set customer_id in ads.json. List accounts with --list')
const q = (gaql) => query(cfg, token, CUSTOMER, gaql)

// Ad hoc mode: one query, printed, no files.
if (GAQL) {
  const rows = await q(GAQL)
  console.log(`${rows.length} row(s)\n`)
  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

// One failing query must not sink the export: some fields are unavailable on
// some account types. Failures are listed at the end of the report.
const errors = []
const safe = (label, gaql) => q(gaql).catch((e) => { errors.push(`${label}: ${e.message}`); return [] })

const [
  account, totals, totalsPrev, campaigns, settings, criteria, convActions, convByAction,
  goals, sharedSets, campaignSharedSets, assets, accountAssets, landingPages, networks, campaignDaily,
  adGroups, keywords, searchTerms, ads, negatives, geo, devices, weekdays, daily, changes,
] = await Promise.all([
  safe('Account', `SELECT customer.descriptive_name, customer.currency_code, customer.time_zone,
    customer.auto_tagging_enabled, customer.manager, customer.test_account FROM customer`),
  safe('Totals', `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
    metrics.conversions_value, metrics.all_conversions FROM customer WHERE ${RANGE}`),
  safe('Totals previous period', `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
    metrics.conversions_value, metrics.all_conversions FROM customer WHERE ${PREV_RANGE}`),
  safe('Campaigns', `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
    campaign.bidding_strategy_type,
    metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value,
    metrics.all_conversions, metrics.average_cpc,
    metrics.search_impression_share, metrics.search_budget_lost_impression_share,
    metrics.search_rank_lost_impression_share, metrics.search_top_impression_share
    FROM campaign WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Campaign settings', `SELECT campaign.name, campaign.status, campaign.advertising_channel_type,
    campaign.bidding_strategy_type, campaign.maximize_conversions.target_cpa_micros,
    campaign.maximize_conversion_value.target_roas, campaign.target_cpa.target_cpa_micros,
    campaign.network_settings.target_google_search, campaign.network_settings.target_search_network,
    campaign.network_settings.target_content_network,
    campaign.geo_target_type_setting.positive_geo_target_type,
    campaign_budget.amount_micros, campaign_budget.delivery_method, campaign_budget.explicitly_shared
    FROM campaign WHERE campaign.status = 'ENABLED'`),
  safe('Location and language targeting', `SELECT campaign.name, campaign_criterion.type, campaign_criterion.negative,
    campaign_criterion.location.geo_target_constant, campaign_criterion.language.language_constant
    FROM campaign_criterion
    WHERE campaign.status = 'ENABLED' AND campaign_criterion.type IN ('LOCATION', 'LANGUAGE')`),
  safe('Conversion actions', `SELECT conversion_action.id, conversion_action.name, conversion_action.status,
    conversion_action.type, conversion_action.category, conversion_action.primary_for_goal,
    conversion_action.include_in_conversions_metric, conversion_action.counting_type,
    conversion_action.click_through_lookback_window_days,
    conversion_action.attribution_model_settings.attribution_model,
    conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value
    FROM conversion_action WHERE conversion_action.status != 'REMOVED'`),
  safe('Conversions by action', `SELECT segments.conversion_action_name, metrics.conversions, metrics.all_conversions,
    metrics.conversions_value FROM customer WHERE ${RANGE}`),
  safe('Conversion goals', `SELECT customer_conversion_goal.category, customer_conversion_goal.origin,
    customer_conversion_goal.biddable FROM customer_conversion_goal`),
  safe('Shared negative lists', `SELECT shared_set.id, shared_set.name, shared_set.type, shared_set.member_count,
    shared_set.status FROM shared_set WHERE shared_set.status = 'ENABLED'`),
  safe('Shared lists per campaign', `SELECT campaign.name, shared_set.name, shared_set.type FROM campaign_shared_set
    WHERE campaign.status = 'ENABLED' AND campaign_shared_set.status = 'ENABLED'`),
  safe('Assets', `SELECT campaign.name, campaign.status, campaign_asset.field_type, campaign_asset.status, asset.type,
    asset.sitelink_asset.link_text, asset.callout_asset.callout_text, asset.final_urls
    FROM campaign_asset WHERE campaign.status = 'ENABLED' AND campaign_asset.status = 'ENABLED'`),
  safe('Account assets', `SELECT customer_asset.field_type, customer_asset.status, asset.type,
    asset.sitelink_asset.link_text, asset.callout_asset.callout_text, asset.final_urls
    FROM customer_asset WHERE customer_asset.status = 'ENABLED'`),
  safe('Landing pages', `SELECT landing_page_view.unexpanded_final_url, metrics.clicks, metrics.cost_micros,
    metrics.conversions FROM landing_page_view WHERE ${RANGE} AND metrics.clicks > 0`),
  safe('Networks', `SELECT segments.ad_network_type, metrics.impressions, metrics.clicks, metrics.cost_micros,
    metrics.conversions FROM customer WHERE ${RANGE}`),
  safe('Campaign cost per day', `SELECT campaign.name, segments.date, metrics.cost_micros, campaign_budget.amount_micros
    FROM campaign WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Ad groups', `SELECT campaign.name, ad_group.name, ad_group.status,
    metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM ad_group WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Keywords', `SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text,
    ad_group_criterion.keyword.match_type, ad_group_criterion.status,
    ad_group_criterion.quality_info.quality_score, ad_group_criterion.quality_info.search_predicted_ctr,
    ad_group_criterion.quality_info.creative_quality_score, ad_group_criterion.quality_info.post_click_quality_score,
    metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM keyword_view WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Search terms', `SELECT campaign.name, ad_group.name, search_term_view.search_term, search_term_view.status,
    segments.search_term_match_type,
    metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM search_term_view WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Ads', `SELECT campaign.name, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status,
    ad_group_ad.ad_strength, ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.final_urls,
    metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM ad_group_ad WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Negative keywords', `SELECT campaign.name, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
    FROM campaign_criterion
    WHERE campaign.status = 'ENABLED' AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE`),
  safe('Locations', `SELECT campaign.name, geographic_view.country_criterion_id, geographic_view.location_type,
    metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM geographic_view WHERE ${RANGE} AND metrics.impressions > 0`),
  safe('Devices', `SELECT segments.device, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM customer WHERE ${RANGE}`),
  safe('Weekdays', `SELECT segments.day_of_week, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM customer WHERE ${RANGE}`),
  safe('Daily trend', `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM customer WHERE ${RANGE} ORDER BY segments.date`),
  // Change history goes back at most 30 days. It marks the before/after
  // boundaries that every comparison of two periods has to respect.
  safe('Change history', `SELECT change_event.change_date_time, change_event.change_resource_type,
    change_event.resource_change_operation, change_event.client_type, change_event.changed_fields, campaign.name
    FROM change_event
    WHERE change_event.change_date_time >= '${iso(shift(new Date(), -29))}' AND change_event.change_date_time <= '${iso(new Date())}'
    ORDER BY change_event.change_date_time DESC LIMIT 200`),
])

// Resolve location and language IDs into names, one lookup each.
const geoIds = [...new Set([
  ...geo.map((r) => r.geographicView?.countryCriterionId),
  ...criteria.map((r) => r.campaignCriterion?.location?.geoTargetConstant?.split('/')[1]),
].filter(Boolean))]
const langIds = [...new Set(criteria.map((r) => r.campaignCriterion?.language?.languageConstant?.split('/')[1]).filter(Boolean))]
const geoNames = new Map()
const langNames = new Map()
if (geoIds.length) {
  for (const r of await safe('Location names', `SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.target_type
    FROM geo_target_constant WHERE geo_target_constant.id IN (${geoIds.join(',')})`)) {
    geoNames.set(String(r.geoTargetConstant.id), `${r.geoTargetConstant.name} (${r.geoTargetConstant.targetType})`)
  }
}
if (langIds.length) {
  for (const r of await safe('Language names', `SELECT language_constant.id, language_constant.name
    FROM language_constant WHERE language_constant.id IN (${langIds.join(',')})`)) {
    langNames.set(String(r.languageConstant.id), r.languageConstant.name)
  }
}
const geoName = (id) => geoNames.get(String(id)) || `ID ${id}`

// The API omits fields that are zero, sometimes the whole metrics object.
for (const list of [campaigns, adGroups, keywords, searchTerms, ads, geo, devices, weekdays, daily, landingPages, networks, campaignDaily, convByAction]) {
  for (const row of list) row.metrics = row.metrics || {}
}

const acc = account[0]?.customer || {}
const CUR = acc.currencyCode || 'account currency'
const tot = totals[0]?.metrics || {}
const totPrev = totalsPrev[0]?.metrics || {}
const byCost = (a, b) => Number(b.metrics.costMicros || 0) - Number(a.metrics.costMicros || 0)
const sumBy = (rows, key) => {
  const m = new Map()
  for (const r of rows) {
    const k = key(r)
    const x = m.get(k) || { clicks: 0, cost: 0, conv: 0, impr: 0 }
    x.clicks += Number(r.metrics.clicks || 0); x.cost += money(r.metrics.costMicros)
    x.conv += Number(r.metrics.conversions || 0); x.impr += Number(r.metrics.impressions || 0)
    m.set(k, x)
  }
  return [...m.entries()].sort((a, b) => b[1].cost - a[1].cost)
}

const delta = (a, b) => (Number(b) ? `${Number(a) >= Number(b) ? '+' : ''}${(((Number(a) - Number(b)) / Number(b)) * 100).toFixed(1)} %` : 'n/a')
const totalCost = money(tot.costMicros)
const prevCost = money(totPrev.costMicros)

// Search terms that cost money and never converted: negative keyword
// candidates. Threshold scales with the account, at least 1 % of spend or 5.
const wasteFloor = Math.max(5, totalCost * 0.01)
const wasted = searchTerms
  .filter((r) => Number(r.metrics.conversions || 0) === 0 && money(r.metrics.costMicros) >= wasteFloor)
  .sort(byCost)

// Campaigns that lose impressions to budget: the most common silent cap,
// invisible in any analytics tool.
const budgetCapped = campaigns
  .filter((r) => Number(r.metrics.searchBudgetLostImpressionShare || 0) >= 0.1)
  .sort((a, b) => Number(b.metrics.searchBudgetLostImpressionShare) - Number(a.metrics.searchBudgetLostImpressionShare))

const settingOf = (name) => settings.find((x) => x.campaign.name === name)
const budgetOf = (name) => { const s = settingOf(name); return s ? n0(money(s.campaignBudget?.amountMicros)) : 'n/a' }
const convCount = new Map(convByAction.map((r) => [r.segments.conversionActionName, r.metrics]))

const md = `# Google Ads export ${iso(end)}

> Account: ${esc(acc.descriptiveName || 'unknown')} (${CUSTOMER.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}) · Currency: ${CUR} · Time zone: ${acc.timeZone || 'n/a'} · Period: ${iso(start)} to ${iso(end)} (${span} days) · Previous period: ${iso(prevStart)} to ${iso(prevEnd)} · Source: Google Ads API ${API_VERSION}, read only · generated by \`ads-pull.mjs\` (google-ads-audit skill)
> Total: **${CUR} ${n0(totalCost)}**, ${n0(tot.impressions)} impressions, ${n0(tot.clicks)} clicks, ${n1(tot.conversions)} conversions (${n1(tot.allConversions)} all conversions). Cost per conversion: ${cpa(totalCost, tot.conversions)}.
> Google Ads counts conversions by its own attribution window and conversion date. They will NOT match the analytics tool for the same period.

## Totals vs previous period

${table(['Metric', 'Current', 'Previous', 'Delta'], [
  ['Cost', n0(totalCost), n0(prevCost), delta(totalCost, prevCost)],
  ['Impressions', n0(tot.impressions), n0(totPrev.impressions), delta(tot.impressions, totPrev.impressions)],
  ['Clicks', n0(tot.clicks), n0(totPrev.clicks), delta(tot.clicks, totPrev.clicks)],
  ['Conversions', n1(tot.conversions), n1(totPrev.conversions), delta(tot.conversions, totPrev.conversions)],
  ['Conversion value', n0(tot.conversionsValue), n0(totPrev.conversionsValue), delta(tot.conversionsValue, totPrev.conversionsValue)],
  ['Cost per conversion', cpa(totalCost, tot.conversions), cpa(prevCost, totPrev.conversions), ''],
])}

## Account settings

| Setting | Value |
|---|---|
| Auto-tagging | ${acc.autoTaggingEnabled === true ? 'on' : acc.autoTaggingEnabled === false ? '**OFF** (GCLID missing, analytics import and offline conversions break)' : 'n/a'} |
| Manager account | ${acc.manager ? 'yes' : 'no'} |
| Test account | ${acc.testAccount ? 'yes' : 'no'} |
| Negative keywords (campaign level, enabled campaigns) | ${negatives.length} |

## Campaigns

${table(
  ['Campaign', 'Type', 'Bidding', 'Impr.', 'Clicks', CUR, 'Conv.', 'CPA', 'Value', 'IS', 'Lost budget', 'Lost rank', 'Daily budget'],
  [...campaigns].sort(byCost).map((r) => [
    esc(r.campaign.name), r.campaign.advertisingChannelType, r.campaign.biddingStrategyType,
    n0(r.metrics.impressions), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)),
    n1(r.metrics.conversions), cpa(money(r.metrics.costMicros), r.metrics.conversions), n0(r.metrics.conversionsValue),
    pct(r.metrics.searchImpressionShare), pct(r.metrics.searchBudgetLostImpressionShare),
    pct(r.metrics.searchRankLostImpressionShare), budgetOf(r.campaign.name),
  ])
)}

## Campaign settings (enabled campaigns)

Check: Search campaigns should normally run without the Display network; location option PRESENCE (people in the area) unless reaching people interested in the area is the plan; a target CPA or ROAS only once the campaign has enough conversions.

${table(['Campaign', 'Type', 'Bidding', 'Target CPA', 'Target ROAS', 'Search partners', 'Display network', 'Location option', 'Daily budget', 'Shared budget'],
  settings.map((r) => [
    esc(r.campaign.name), r.campaign.advertisingChannelType, r.campaign.biddingStrategyType,
    r.campaign.maximizeConversions?.targetCpaMicros ? n0(money(r.campaign.maximizeConversions.targetCpaMicros))
      : r.campaign.targetCpa?.targetCpaMicros ? n0(money(r.campaign.targetCpa.targetCpaMicros)) : '-',
    r.campaign.maximizeConversionValue?.targetRoas ?? '-',
    r.campaign.networkSettings?.targetSearchNetwork ? 'on' : 'off',
    r.campaign.networkSettings?.targetContentNetwork ? '**on**' : 'off',
    r.campaign.geoTargetTypeSetting?.positiveGeoTargetType || 'n/a',
    n0(money(r.campaignBudget?.amountMicros)), r.campaignBudget?.explicitlyShared ? 'yes' : 'no',
  ]))}

## Location and language targeting

${table(['Campaign', 'Type', 'Excluded', 'Target'],
  criteria.map((r) => {
    const c = r.campaignCriterion
    const loc = c.location?.geoTargetConstant?.split('/')[1]
    const lang = c.language?.languageConstant?.split('/')[1]
    return [esc(r.campaign.name), c.type, c.negative ? 'yes' : 'no', loc ? esc(geoName(loc)) : esc(langNames.get(String(lang)) || `ID ${lang}`)]
  }))}

## Conversion actions

Smart Bidding optimises on PRIMARY actions included in "Conversions". A primary action that fires on a page view, a timer, a scroll or a video view teaches the bidding to buy cheap visits, not customers.

${table(['Action', 'Status', 'Type', 'Category', 'Primary', 'In "Conversions"', 'Counting', 'Window (days)', 'Attribution', 'Default value', `Conv. in period`, 'All conv.'],
  [...convActions].sort((a, b) => Number(b.conversionAction.primaryForGoal) - Number(a.conversionAction.primaryForGoal)).map((r) => {
    const a = r.conversionAction
    const m = convCount.get(a.name) || {}
    return [esc(a.name), a.status, a.type, a.category, a.primaryForGoal ? '**yes**' : 'no',
      a.includeInConversionsMetric ? 'yes' : 'no', a.countingType, a.clickThroughLookbackWindowDays ?? 'n/a',
      a.attributionModelSettings?.attributionModel || 'n/a', a.valueSettings?.defaultValue ?? 'n/a',
      n1(m.conversions), n1(m.allConversions)]
  }))}

## Budget-capped campaigns

${budgetCapped.length
  ? `These campaigns lose at least 10 percent of possible impressions because the budget runs out.

${table(['Campaign', 'Lost to budget', 'IS', 'Daily budget', 'CPA'],
  budgetCapped.map((r) => [
    esc(r.campaign.name), pct(r.metrics.searchBudgetLostImpressionShare), pct(r.metrics.searchImpressionShare),
    budgetOf(r.campaign.name), cpa(money(r.metrics.costMicros), r.metrics.conversions),
  ]))}`
  : 'No campaign loses a meaningful share of impressions to budget.'}

## Budget-pinned days

Days on which a campaign spent at least 95 percent of its daily budget. Most days pinned means the budget, not the bidding, decides delivery. Days above 100 percent are normal (Google may spend up to twice the daily budget on one day).

${table(['Campaign', 'Days with spend', 'Days at 95 % or more', 'Days above budget', 'Max day spend', 'Daily budget'],
  [...new Set(campaignDaily.map((r) => r.campaign.name))].map((name) => {
    const rows = campaignDaily.filter((r) => r.campaign.name === name)
    const b = money(rows[0]?.campaignBudget?.amountMicros)
    const c = rows.map((r) => money(r.metrics.costMicros))
    return [esc(name), rows.length, b ? c.filter((x) => x >= 0.95 * b).length : 'n/a', b ? c.filter((x) => x > b).length : 'n/a', n0(Math.max(0, ...c)), n0(b)]
  }))}

## Conversion goals (account level)

A goal marked biddable makes EVERY primary action in that category and origin count for bidding, including actions created later.

${table(['Category', 'Origin', 'Biddable'],
  goals.map((r) => [r.customerConversionGoal.category, r.customerConversionGoal.origin, r.customerConversionGoal.biddable ? '**yes**' : 'no']))}

## Shared negative lists

${table(['List', 'Type', 'Entries', 'Used by campaigns'],
  sharedSets.map((r) => [esc(r.sharedSet.name), r.sharedSet.type, r.sharedSet.memberCount,
    esc(campaignSharedSets.filter((x) => x.sharedSet.name === r.sharedSet.name).map((x) => x.campaign.name).join(', ') || 'none')]))}

## Networks

Read impression share and CTR from Google Search rows only. Judge search partners by cost per conversion, not by CTR.

${table(['Network', 'Impr.', 'Clicks', CUR, 'Conv.', 'CPA'],
  sumBy(networks, (r) => r.segments.adNetworkType).map(([k, x]) => [k, n0(x.impr), n0(x.clicks), n0(x.cost), n1(x.conv), cpa(x.cost, x.conv)]))}

## Keywords (top 80 by cost)

QS components: expected CTR, ad relevance, landing page experience (BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE).

${table(['Keyword', 'Match', 'QS', 'Exp. CTR', 'Ad rel.', 'LP exp.', 'Campaign', 'Ad group', 'Impr.', 'Clicks', CUR, 'Conv.'],
  [...keywords].sort(byCost).slice(0, 80).map((r) => {
    const k = r.adGroupCriterion
    const qi = k.qualityInfo || {}
    return [esc(k.keyword.text), k.keyword.matchType, qi.qualityScore ?? 'n/a',
      qi.searchPredictedCtr || 'n/a', qi.creativeQualityScore || 'n/a', qi.postClickQualityScore || 'n/a',
      esc(r.campaign.name), esc(r.adGroup.name),
      n0(r.metrics.impressions), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)), n1(r.metrics.conversions)]
  }))}

## Spend by served match type

How the search terms were actually matched. A large AI_MAX or BROAD share means the keywords work as loose themes. The search term report covers only part of the spend (Google hides low-volume terms): read shares, not totals.

${table(['Match type', 'Clicks', CUR, 'Conv.', 'CPA'],
  sumBy(searchTerms, (r) => r.segments?.searchTermMatchType || 'n/a').map(([k, x]) => [k, n0(x.clicks), n0(x.cost), n1(x.conv), cpa(x.cost, x.conv)]))}

Search term cost covered: ${CUR} ${n0(searchTerms.reduce((a, r) => a + money(r.metrics.costMicros), 0))} of ${n0(totalCost)} total.

## Search terms (top 100 by cost)

${table(['Search term', 'Status', 'Match', 'Campaign', 'Impr.', 'Clicks', CUR, 'Conv.'],
  [...searchTerms].sort(byCost).slice(0, 100).map((r) => [
    esc(r.searchTermView.searchTerm), r.searchTermView.status, r.segments?.searchTermMatchType || 'n/a', esc(r.campaign.name),
    n0(r.metrics.impressions), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)), n1(r.metrics.conversions),
  ]))}

## Negative keyword candidates

Search terms with at least ${CUR} ${n0(wasteFloor)} cost and zero conversions in the period. Check before excluding: an expensive term without conversions can also be a tracking gap.

${table(['Search term', 'Campaign', 'Clicks', CUR],
  wasted.slice(0, 50).map((r) => [
    esc(r.searchTermView.searchTerm), esc(r.campaign.name), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)),
  ]))}

## Ad groups

${table(['Ad group', 'Campaign', 'Status', 'Impr.', 'Clicks', CUR, 'Conv.'],
  [...adGroups].sort(byCost).slice(0, 50).map((r) => [
    esc(r.adGroup.name), esc(r.campaign.name), r.adGroup.status,
    n0(r.metrics.impressions), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)), n1(r.metrics.conversions),
  ]))}

## Ads

${table(['Ad ID', 'Type', 'Ad strength', 'Approval', 'Ad group', 'Status', 'Final URL', 'Impr.', 'Clicks', 'CTR', 'Conv.'],
  [...ads].sort((a, b) => Number(b.metrics.impressions) - Number(a.metrics.impressions)).slice(0, 50).map((r) => [
    r.adGroupAd.ad.id, r.adGroupAd.ad.type, r.adGroupAd.adStrength || 'n/a',
    r.adGroupAd.policySummary?.approvalStatus || 'n/a', esc(r.adGroup.name), r.adGroupAd.status,
    esc((r.adGroupAd.ad.finalUrls || [])[0] || ''),
    n0(r.metrics.impressions), n0(r.metrics.clicks), ctr(r.metrics.clicks, r.metrics.impressions), n1(r.metrics.conversions),
  ]))}

## Landing pages (top 30 by cost)

${table(['Final URL', 'Clicks', CUR, 'Conv.'],
  [...landingPages].sort(byCost).slice(0, 30).map((r) => [
    esc(r.landingPageView.unexpandedFinalUrl), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)), n1(r.metrics.conversions)]))}

## Assets (enabled)

Check: no sitelinks to checkout, contact, about or home pages; no location asset for an online-only business; callouts specific, not generic. Account-level assets serve only where a campaign has none of its own.

${table(['Level', 'Field', 'Text', 'URL'],
  [...accountAssets.map((r) => ({ ...r, level: 'account', field: r.customerAsset.fieldType })),
   ...assets.map((r) => ({ ...r, level: r.campaign.name, field: r.campaignAsset.fieldType }))].slice(0, 100).map((r) => [esc(r.level), r.field,
    esc(r.asset.sitelinkAsset?.linkText || r.asset.calloutAsset?.calloutText || r.asset.type || ''),
    esc((r.asset.finalUrls || [])[0] || '')]))}

## Locations (where clicks came from, top 30 by cost)

Location type AREA_OF_INTEREST means the person was elsewhere but showed interest in the targeted area. A large share there usually means the location option is set to presence OR interest.

${table(['Country', 'Location type', 'Campaign', 'Impr.', 'Clicks', CUR, 'Conv.'],
  [...geo].sort(byCost).slice(0, 30).map((r) => [
    esc(geoName(r.geographicView.countryCriterionId)), r.geographicView.locationType, esc(r.campaign.name),
    n0(r.metrics.impressions), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)), n1(r.metrics.conversions),
  ]))}

## Devices

${table(['Device', 'Impr.', 'Clicks', CUR, 'Conv.', 'CPA'],
  sumBy(devices, (r) => r.segments.device).map(([k, x]) => [k, n0(x.impr), n0(x.clicks), n0(x.cost), n1(x.conv), cpa(x.cost, x.conv)]))}

## Weekdays

${table(['Day', 'Clicks', CUR, 'Conv.', 'CPA'],
  sumBy(weekdays, (r) => r.segments.dayOfWeek).map(([k, x]) => [k, n0(x.clicks), n0(x.cost), n1(x.conv), cpa(x.cost, x.conv)]))}

## Daily trend

${table(['Date', 'Impr.', 'Clicks', CUR, 'Conv.'],
  daily.map((r) => [r.segments.date, n0(r.metrics.impressions), n0(r.metrics.clicks), n0(money(r.metrics.costMicros)), n1(r.metrics.conversions)]))}

## Change history (last 30 days, newest first)

Every comparison of two periods must respect these dates: numbers before a change measure the old setup.

${table(['When', 'Resource', 'Operation', 'Via', 'Campaign', 'Changed fields'],
  changes.slice(0, 100).map((r) => [
    String(r.changeEvent.changeDateTime || '').slice(0, 16), r.changeEvent.changeResourceType,
    r.changeEvent.resourceChangeOperation, r.changeEvent.clientType, esc(r.campaign?.name || ''),
    esc(String(r.changeEvent.changedFields || '').slice(0, 120)),
  ]))}
${errors.length ? `\n## Notes\n\nThese parts of the export failed and are missing above:\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : ''}`

const OUT_DIR = path.resolve(opt('--out', 'google-ads-data'))
fs.mkdirSync(OUT_DIR, { recursive: true })
const base = path.join(OUT_DIR, `${iso(end)}`)
fs.writeFileSync(`${base}.md`, md, 'utf8')
// Raw data beside it, so a later analysis needs no second API call.
fs.writeFileSync(`${base}.json`, JSON.stringify({
  customerId: CUSTOMER, apiVersion: API_VERSION,
  range: { start: iso(start), end: iso(end), days: span }, prevRange: { start: iso(prevStart), end: iso(prevEnd) },
  account, totals, totalsPrev, campaigns, settings, criteria, convActions, convByAction, adGroups, keywords,
  searchTerms, ads, negatives, geo, devices, weekdays, daily, changes,
  goals, sharedSets, campaignSharedSets, assets, accountAssets, landingPages, networks, campaignDaily,
  geoNames: Object.fromEntries(geoNames), langNames: Object.fromEntries(langNames), errors,
}), 'utf8')

console.log(`Google Ads ${iso(start)} to ${iso(end)}: ${CUR} ${n0(totalCost)}, ${n0(tot.clicks)} clicks, ${n1(tot.conversions)} conversions`)
console.log(`${campaigns.length} campaigns, ${keywords.length} keywords, ${searchTerms.length} search terms, ${convActions.length} conversion actions -> ${base}.md`)
if (budgetCapped.length) console.log(`Note: ${budgetCapped.length} campaign(s) lose impressions to budget.`)
if (errors.length) console.log(`Note: ${errors.length} part(s) failed, listed at the end of the report.`)
