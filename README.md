# US Treasury Interest Rate Tracker

Track the average monthly interest rate the US Treasury pays across a
security category — Treasury Bills, Notes, Bonds, TIPS, Floating Rate
Notes, and more — with a year-over-year comparison, via the official
[US Treasury Fiscal Data
API](https://fiscaldata.treasury.gov/datasets/average-interest-rates-treasury-securities/average-interest-rates-on-u-s-treasury-securities).

Built for finance and macro research teams tracking the government's
own cost of borrowing without pulling Treasury's own CSV exports.

Note: this is the Treasury's **average rate paid across its
outstanding/issued securities by category**, not the daily market par
yield curve you'd see quoted for a specific maturity (e.g. "the
10-year yield") — a related but distinct metric, published monthly
rather than daily.

## Input

```json
{
  "securityKeyword": "Treasury Bills",
  "monthsBack": 12,
  "maxResults": 50
}
```

| Field | Type | Description |
|---|---|---|
| `securityKeyword` | string | Case-insensitive match against the security description, e.g. `"Treasury Bills"`, `"Treasury Notes"`, `"Treasury Bonds"`, `"TIPS"`, `"Total Interest-bearing Debt"`. Leave blank to return all categories. Default `"Treasury Bills"`. |
| `monthsBack` | number | How many months of history to fetch, by record date. Data is published monthly. Default `12`, max `60`. |
| `maxResults` | number | Maximum number of monthly records to return, most recent first. Default `50`, max `200`. |

## Output

One record per security category per month:

```json
{
  "date": "2026-07-31",
  "securityType": "Marketable",
  "securityDescription": "Treasury Bills",
  "avgInterestRatePercent": 3.758,
  "yearOverYearChangePercentagePoints": -0.612
}
```

## How it works

Direct calls to the official [Treasury Fiscal Data
API](https://fiscaldata.treasury.gov/) (`api.fiscaldata.treasury.gov`)
— no proxy, no key, no scraping. Same platform and mechanism as this
portfolio's [US National Debt
Tracker](https://github.com/timmKal01/us-national-debt-tracker),
applied to a different dataset.

## Pricing note

Billed per **search** (one run), not per record returned.

## Related products

- [US National Debt Tracker](https://github.com/timmKal01/us-national-debt-tracker) — daily national debt from the same Treasury Fiscal Data platform
- [US Labor Market Indicator Lookup](https://github.com/timmKal01/us-labor-market-indicator-lookup) — national labor market data from the same US-macro-data family
