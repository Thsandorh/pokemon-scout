import { metagamesScraper } from "./metagames.js";
import { varazslatosScraper } from "./varazslatos.js";
import { tcgBoltScraper } from "./tcgbolt.js";
export const storeScrapers = [
    metagamesScraper,
    varazslatosScraper,
    tcgBoltScraper,
];
export function getStoreScraper(slug) {
    return storeScrapers.find((store) => store.slug === slug);
}
//# sourceMappingURL=index.js.map