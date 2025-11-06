import type { ScrapedProduct } from "../types.js";
export interface StoreScraper {
    slug: string;
    displayName: string;
    baseUrl: string;
    description?: string;
    scrapeAll(): Promise<ScrapedProduct[]>;
}
//# sourceMappingURL=types.d.ts.map