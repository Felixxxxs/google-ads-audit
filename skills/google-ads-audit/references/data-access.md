# Getting the data

Three ways in, from most to least complete. All are read only.

| Path | Needs | Effort once | Repeatable by Claude alone | Coverage |
|---|---|---|---|---|
| A. API scripts | Developer token, Google Cloud OAuth client, Node 18+ | 30 to 60 min plus token approval | yes | everything |
| B. Google Ads Script | Access to the ad account | 5 min | no, the user runs it | almost everything |
| C. CSV exports from the UI | Access to the ad account | 15 min per run | no | the core reports |

## A. API scripts

Full walkthrough including the developer token application: `docs/api-access.md` in the repository. Short version:

1. A Google Ads **manager account** (free) exists; in it, API Center gives a **developer token**. Test access works only on test accounts; apply for **Basic access** to read real accounts (needs a short design document, a template is in `docs/api-access.md`).
2. A Google Cloud project with the **Google Ads API** enabled and an OAuth client of type **Desktop app**. Download its JSON into `~/.config/google-ads-audit/`.
3. OAuth consent screen: add the scope `https://www.googleapis.com/auth/adwords`, publish the app **In production** (in Testing the refresh token dies after 7 days).
4. `node "<skill>/scripts/ads-auth.mjs" --developer-token <token>` signs in once and writes `~/.config/google-ads-audit/ads.json`.
5. If access to the ad account runs through a manager account, add `"login_customer_id": "123-456-7890"` (the manager's ID) to `ads.json`.
6. Test: `node "<skill>/scripts/ads-pull.mjs" --list`, then a pull with `--customer`.

Environment variables override the file for CI: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_API_VERSION`.

Common errors:

| Message | Fix |
|---|---|
| `Version vXX is deprecated` | Pass `--api-version v<newer>` or set `GOOGLE_ADS_API_VERSION`; Google sunsets versions after about a year |
| `DEVELOPER_TOKEN_NOT_APPROVED` | The token has only test access; apply for Basic access |
| `USER_PERMISSION_DENIED` | Set `login_customer_id` to the manager account the login uses |
| `token refresh failed: invalid_grant` | Consent screen in Testing or token revoked: publish In production, rerun `ads-auth.mjs` |

## B. Google Ads Script (no developer token)

1. In the ad account: Tools > Bulk actions > Scripts > New script.
2. Paste `<skill>/scripts/google-ads-script-export.js`. Set `DAYS` at the top (30, then 365 for the baseline).
3. Authorize, Run. The log prints a Google Sheet URL with one tab per dataset.
4. Download the sheet as `.xlsx` into `<output>/data/YYYY-MM-DD-script-export.xlsx`.

Claude reads the workbook (a spreadsheet skill or a short script) and maps tabs to the sections of the methodology. Costs are in micros: divide by 1,000,000.

## C. CSV exports from the UI

Set the date range to the last 30 days ending yesterday, then download each report as CSV (Download icon above the table) into `<output>/data/YYYY-MM-DD-<report>.csv`:

| Report | Where in the UI | Columns to add |
|---|---|---|
| Campaigns | Campaigns | Bid strategy type, Budget, Search impr. share, Search lost IS (budget), Search lost IS (rank), Conversions, All conv., Conv. value |
| Search terms | Insights and reports > Search terms | Match type, Added/Excluded, Cost, Conversions |
| Keywords | Audiences, keywords and content > Search keywords | Quality Score, Exp. CTR, Ad relevance, Landing page exp. |
| Ads | Ads | Ad strength, Final URL |
| Conversions | Goals > Summary, and Conversions > Conversion actions | Action optimisation (Primary/Secondary), Count, Click-through window, Value |
| Locations | Insights and reports > Where your ads showed (matched locations) | Location type |
| Change history | Change history | all |
| Assets | Assets > Table view | Level, Asset type, Final URL |

Repeat Campaigns and Keywords for the last 12 months as the baseline. With CSVs some checks (served match type share, budget-pinned days, conversion goals) need the owner to read a value from the UI: list those as open questions instead of guessing.
