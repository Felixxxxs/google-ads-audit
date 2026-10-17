# Google Ads API access, step by step

The API path lets Claude pull fresh data on its own whenever you ask. It takes one afternoon plus the wait for Google's token approval (usually one to three working days). If you only want to try the skill, use the Google Ads Script path first (`skills/google-ads-audit/references/data-access.md`, section B).

## 1. Manager account and developer token

1. Create a Google Ads **manager account** at <https://ads.google.com/home/tools/manager-accounts/> (free, no spend needed). You do not have to move your ad account under it.
2. In the manager account: Admin > **API Center**. Fill in the form; you receive a developer token with **Test access**.
3. Apply for **Basic access** in the same place. Google asks for a company website, the purpose and a design document. The template below fits this read-only tool; adapt names and send it as a PDF.

## 2. Google Cloud project and OAuth client

1. <https://console.cloud.google.com/> > New project (for example `ads-reporting`).
2. APIs and Services > Library > **Google Ads API** > Enable.
3. Google Auth Platform > Branding: app name, support e-mail. Audience: **External**, then **Publish app** (In production). In Testing the refresh token expires after 7 days.
4. Data Access > Add scope `https://www.googleapis.com/auth/adwords`.
5. Clients > Create client > **Desktop app**. Download the JSON into `~/.config/google-ads-audit/` (Windows: `C:\Users\<you>\.config\google-ads-audit\`).

The app does not need Google verification for your own use; on login click "Advanced" and continue.

## 3. Authorize once

```bash
node skills/google-ads-audit/scripts/ads-auth.mjs --developer-token YOUR_TOKEN
```

Sign in with the Google account that has access to the ad account. The script writes `~/.config/google-ads-audit/ads.json`. If your login reaches the ad account through a manager account, add `"login_customer_id": "123-456-7890"` (the manager's ID) to that file.

## 4. Test

```bash
node skills/google-ads-audit/scripts/ads-pull.mjs --list
node skills/google-ads-audit/scripts/ads-pull.mjs --customer 123-456-7890 --days 30 --out ./google-ads-audit/data
```

## Security

- `ads.json` holds a refresh token with access to your ad account. It lives outside every repository; never commit it, never paste it into a chat.
- The scripts only call `searchStream` and `listAccessibleCustomers`. They cannot change the account even if asked to.
- Revoke access any time at <https://myaccount.google.com/permissions>.

---

## Design document template (for the Basic access application)

**Tool name:** COMPANY Ads Reporting

**Company:** COMPANY, website, contact e-mail.

**Purpose.** An internal, read-only reporting tool. It pulls performance, settings and conversion-tracking data from our own Google Ads account(s) so that we can analyse performance and decide on optimisations. All changes to the account are made manually by our staff in the Google Ads interface.

**Users.** Internal staff only (N people). No external clients, no public access, no resale of data.

**Accounts.** Our own account ID 123-456-7890 (and, if applicable, the accounts of our manager account 123-456-7890).

**API usage.**
- Services: `GoogleAdsService.SearchStream` (GAQL reports), `CustomerService.ListAccessibleCustomers`.
- Resources read: customer, campaign, campaign_budget, campaign_criterion, ad_group, ad_group_ad, ad_group_criterion (keyword_view), search_term_view, conversion_action, customer_conversion_goal, shared_set, campaign_asset, customer_asset, landing_page_view, geographic_view, change_event, geo_target_constant, language_constant.
- No mutate operations. No creation, change or removal of any entity.
- Frequency: on demand, typically one to five runs per week, about 25 queries per run.

**Architecture.** A command-line script on a staff laptop authenticates with OAuth 2.0 (installed-app flow, PKCE), stores the refresh token in a local file outside any code repository, requests the reports, and writes them as Markdown and JSON files to a private repository. Data is analysed internally to produce recommendations.

**Data handling.** Only aggregated advertising performance data is retrieved; no end-user personal data. Files are stored in a private repository accessible to the staff listed above. Credentials are never shared or committed.

**Screens.** The tool has no user interface; the output is a Markdown report (attach a sample page with fictional numbers).
