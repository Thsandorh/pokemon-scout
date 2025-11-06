import { APP_CONFIG } from "../config.js";
import { upsertProduct } from "../repositories/productRepo.js";
import { ensureStore } from "../repositories/storeRepo.js";
import { evaluateAlertsForProduct } from "./alertService.js";
import { getStoreScraper, storeScrapers } from "../stores/index.js";
import { flushDatabase } from "../db.js";
async function processStore(scraper) {
    console.log(`[SCRAPER] [${scraper.displayName}] Ensuring store record...`);
    const storeRecord = ensureStore(scraper.slug, scraper.displayName, scraper.baseUrl);
    console.log(`[SCRAPER] [${scraper.displayName}] Store ID: ${storeRecord.id}`);
    console.log(`[SCRAPER] [${scraper.displayName}] Fetching inventory...`);
    const inventory = await scraper.scrapeAll();
    console.log(`[SCRAPER] [${scraper.displayName}] Fetched ${inventory.length} products`);
    let created = 0;
    let priceChanges = 0;
    let stockChanges = 0;
    let i = 0;
    for (const product of inventory) {
        try {
            if (i % 50 === 0) {
                console.log(`[SCRAPER] [${scraper.displayName}] Processing ${i}/${inventory.length}...`);
            }
            const result = upsertProduct(storeRecord.id, product);
            if (!result.previous)
                created += 1;
            if (result.priceChanged)
                priceChanges += 1;
            if (result.stockChanged)
                stockChanges += 1;
            await evaluateAlertsForProduct(result);
            i++;
        }
        catch (error) {
            console.error(`[SCRAPER] Failed to upsert product (${scraper.slug}): ${product.name}`, error);
            i++;
        }
    }
    console.log(`[SCRAPER] ${scraper.displayName}: ${inventory.length} products (new: ${created}, price changes: ${priceChanges}, stock changes: ${stockChanges})`);
    console.log(`[SCRAPER] [${scraper.displayName}] Flushing database to disk...`);
    flushDatabase();
    console.log(`[SCRAPER] [${scraper.displayName}] Database flushed!`);
    return {
        total: inventory.length,
        created,
        priceChanges,
        stockChanges,
    };
}
export async function runStoreScrape(storeSlug) {
    console.log(`[SCRAPER] ===== SCRAPE STARTED ${storeSlug ? `(${storeSlug})` : '(ALL STORES)'} =====`);
    const targets = storeSlug
        ? (() => {
            const scraper = getStoreScraper(storeSlug);
            if (!scraper) {
                throw new Error(`Unknown store slug: ${storeSlug}`);
            }
            return [scraper];
        })()
        : storeScrapers;
    console.log(`[SCRAPER] Will scrape ${targets.length} store(s): ${targets.map(s => s.slug).join(', ')}`);
    for (const scraper of targets) {
        try {
            console.log(`[SCRAPER] Starting ${scraper.displayName}...`);
            await processStore(scraper);
            console.log(`[SCRAPER] Finished ${scraper.displayName}`);
        }
        catch (error) {
            console.error(`[SCRAPER] ${scraper.displayName} failed:`, error.message);
        }
    }
    console.log(`[SCRAPER] ===== SCRAPE COMPLETED =====`);
}
export async function primeScraper() {
    try {
        await runStoreScrape();
    }
    catch (error) {
        console.error("[SCRAPER] Initial run failed", error);
    }
}
export function describeSchedule() {
    return APP_CONFIG.cron;
}
//# sourceMappingURL=scraperService.js.map