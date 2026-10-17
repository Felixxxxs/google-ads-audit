// Google Ads Script: exports the audit datasets into a new Google Sheet.
// The no-developer-token path of the google-ads-audit skill.
//
// How to use:
//   1. Google Ads > Tools > Bulk actions > Scripts > + New script
//   2. Paste this file, click Authorize, then Run (Preview is enough; it only reads)
//   3. The log prints the URL of the new sheet. Open it, File > Download >
//      Microsoft Excel (.xlsx), and put the file into the skill's data folder.
//
// Read only: the script uses AdsApp.search and never changes the account.
// It creates exactly one spreadsheet in the Drive of the user who runs it.

var DAYS = 30 // change to 365 for the long baseline

function main() {
  var tz = AdsApp.currentAccount().getTimeZone()
  var end = new Date(Date.now() - 24 * 3600 * 1000) // yesterday: today is partial
  var start = new Date(end.getTime() - (DAYS - 1) * 24 * 3600 * 1000)
  var fmt = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd') }
  var range = "segments.date BETWEEN '" + fmt(start) + "' AND '" + fmt(end) + "'"

  var queries = {
    account: 'SELECT customer.descriptive_name, customer.currency_code, customer.time_zone, customer.auto_tagging_enabled FROM customer',
    campaigns: 'SELECT campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, ' +
      'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.all_conversions, ' +
      'metrics.search_impression_share, metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share ' +
      'FROM campaign WHERE ' + range + ' AND metrics.impressions > 0',
    settings: 'SELECT campaign.name, campaign.bidding_strategy_type, campaign.network_settings.target_search_network, ' +
      'campaign.network_settings.target_content_network, campaign.geo_target_type_setting.positive_geo_target_type, ' +
      'campaign_budget.amount_micros FROM campaign WHERE campaign.status = \'ENABLED\'',
    targeting: 'SELECT campaign.name, campaign_criterion.type, campaign_criterion.negative, campaign_criterion.location.geo_target_constant, ' +
      'campaign_criterion.language.language_constant FROM campaign_criterion ' +
      "WHERE campaign.status = 'ENABLED' AND campaign_criterion.type IN ('LOCATION', 'LANGUAGE')",
    conversion_actions: 'SELECT conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, ' +
      'conversion_action.primary_for_goal, conversion_action.include_in_conversions_metric, conversion_action.counting_type, ' +
      'conversion_action.click_through_lookback_window_days, conversion_action.value_settings.default_value ' +
      "FROM conversion_action WHERE conversion_action.status != 'REMOVED'",
    conversions_by_action: 'SELECT segments.conversion_action_name, metrics.conversions, metrics.all_conversions FROM customer WHERE ' + range,
    conversion_goals: 'SELECT customer_conversion_goal.category, customer_conversion_goal.origin, customer_conversion_goal.biddable FROM customer_conversion_goal',
    keywords: 'SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ' +
      'ad_group_criterion.quality_info.quality_score, ad_group_criterion.quality_info.search_predicted_ctr, ' +
      'ad_group_criterion.quality_info.creative_quality_score, ad_group_criterion.quality_info.post_click_quality_score, ' +
      'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM keyword_view WHERE ' + range + ' AND metrics.impressions > 0',
    search_terms: 'SELECT campaign.name, ad_group.name, search_term_view.search_term, search_term_view.status, segments.search_term_match_type, ' +
      'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE ' + range + ' AND metrics.impressions > 0',
    ads: 'SELECT campaign.name, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.ad_strength, ' +
      'ad_group_ad.ad.final_urls, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group_ad WHERE ' + range + ' AND metrics.impressions > 0',
    negatives: "SELECT campaign.name, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type FROM campaign_criterion " +
      "WHERE campaign.status = 'ENABLED' AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE",
    shared_lists: "SELECT shared_set.name, shared_set.type, shared_set.member_count FROM shared_set WHERE shared_set.status = 'ENABLED'",
    locations: 'SELECT campaign.name, geographic_view.country_criterion_id, geographic_view.location_type, metrics.impressions, ' +
      'metrics.clicks, metrics.cost_micros, metrics.conversions FROM geographic_view WHERE ' + range + ' AND metrics.impressions > 0',
    landing_pages: 'SELECT landing_page_view.unexpanded_final_url, metrics.clicks, metrics.cost_micros, metrics.conversions ' +
      'FROM landing_page_view WHERE ' + range + ' AND metrics.clicks > 0',
    networks: 'SELECT segments.ad_network_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE ' + range,
    devices: 'SELECT segments.device, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE ' + range,
    daily: 'SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE ' + range,
    campaign_daily: 'SELECT campaign.name, segments.date, metrics.cost_micros, campaign_budget.amount_micros FROM campaign WHERE ' + range + ' AND metrics.impressions > 0',
  }

  var name = 'google-ads-audit ' + AdsApp.currentAccount().getCustomerId() + ' ' + fmt(start) + ' to ' + fmt(end)
  var ss = SpreadsheetApp.create(name)
  var first = true
  for (var key in queries) {
    var rows = []
    var header = null
    try {
      var it = AdsApp.search(queries[key])
      while (it.hasNext()) {
        var flat = flatten(it.next(), '', {})
        if (!header) header = Object.keys(flat)
        rows.push(header.map(function (h) { return flat[h] === undefined ? '' : flat[h] }))
      }
    } catch (e) {
      header = ['error']
      rows = [[String(e)]]
    }
    var sheet = first ? ss.getSheets()[0].setName(key) : ss.insertSheet(key)
    first = false
    if (!header) { sheet.getRange(1, 1).setValue('no rows'); continue }
    sheet.getRange(1, 1, 1, header.length).setValues([header])
    if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows)
  }
  Logger.log('Export ready: ' + ss.getUrl())
}

// Nested API rows become flat columns like "campaign.name" and "metrics.clicks".
function flatten(obj, prefix, out) {
  for (var k in obj) {
    var v = obj[k]
    var key = prefix ? prefix + '.' + k : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = Array.isArray(v) ? v.join(' ') : v
  }
  return out
}
