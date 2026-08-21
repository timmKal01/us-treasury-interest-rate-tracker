import { Actor, log } from 'apify';
import { fetchInterestRates } from './treasury.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { securityKeyword = 'Treasury Bills', monthsBack = 12, maxResults = 50 } = input;

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const RATE_SEARCH_EVENT = 'rate-search';

const results = await fetchInterestRates({
    securityKeyword,
    monthsBack: Math.min(monthsBack, 60),
    maxResults: Math.min(maxResults, 200),
});

for (const result of results) {
    await Actor.pushData(result);
}

await Actor.charge({ eventName: RATE_SEARCH_EVENT });

log.info(`Pushed ${results.length} record(s)`);

await Actor.exit();
