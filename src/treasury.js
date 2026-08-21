import { log } from 'apify';

const BASE_URL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { headers: { Connection: 'close' }, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function toNumber(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export async function fetchInterestRates({ securityKeyword, monthsBack, maxResults }) {
    const startDate = new Date();
    // +2 months of buffer past the requested window, so a same-security-desc match from
    // ~12 months back is still present in the fetched set for year-over-year comparison.
    startDate.setMonth(startDate.getMonth() - monthsBack - 2);

    const url = new URL(BASE_URL);
    url.searchParams.set('filter', `record_date:gte:${formatDate(startDate)}`);
    url.searchParams.set('sort', '-record_date');
    // ~16 security categories reported per month — generous page size covers the full
    // requested window plus the extra lookback buffer above in one request.
    url.searchParams.set('page[size]', String(Math.min((monthsBack + 2) * 20, 5000)));

    let lastErr;
    let rows = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            const body = await res.json().catch(() => null);
            if (res.ok && Array.isArray(body?.data)) {
                rows = body.data;
                break;
            }
            const retryable = res.status === 429 || res.status >= 500 || body === null;
            lastErr = new Error(`Treasury Fiscal Data API request failed: ${res.status} ${res.statusText}`);
            if (!retryable) throw lastErr;
        } catch (err) {
            lastErr = err.name === 'AbortError'
                ? new Error(`Treasury Fiscal Data API request timed out (attempt ${attempt}/${MAX_ATTEMPTS})`)
                : err;
        }
        if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            log.warning(`Retrying Treasury request in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastErr.message}`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    if (rows === null) throw lastErr;

    const parsed = [];
    for (const row of rows) {
        try {
            if (!row || typeof row !== 'object') continue;
            const rate = toNumber(row.avg_interest_rate_amt);
            if (rate === null || !row.record_date || !row.security_desc) continue;
            parsed.push({
                date: row.record_date,
                securityType: row.security_type_desc ?? null,
                securityDescription: row.security_desc,
                avgInterestRatePercent: rate,
            });
        } catch (err) {
            log.warning(`Skipping malformed Treasury interest rate record: ${err.message}`);
        }
    }

    const keyword = securityKeyword?.trim().toLowerCase();
    const filtered = keyword
        ? parsed.filter((r) => r.securityDescription.toLowerCase().includes(keyword))
        : parsed;

    filtered.sort((a, b) => b.date.localeCompare(a.date));

    const results = filtered.slice(0, maxResults).map((entry, i, arr) => {
        const yearAgoDate = `${Number(entry.date.slice(0, 4)) - 1}${entry.date.slice(4)}`;
        const yearAgo = filtered.find((r) => r.securityDescription === entry.securityDescription && r.date === yearAgoDate);
        const yoyChange = yearAgo ? Number((entry.avgInterestRatePercent - yearAgo.avgInterestRatePercent).toFixed(3)) : null;
        return { ...entry, yearOverYearChangePercentagePoints: yoyChange };
    });

    return results;
}
