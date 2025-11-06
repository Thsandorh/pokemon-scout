import axios from "axios";
import * as cheerio from "cheerio";
const BASE_URL = "https://tcgbolt.hu";
const CATEGORY_PATHS = [
    { path: "/termekkategoria/pokemon/", label: "Pokemon" },
    { path: "/termekkategoria/pokemon/booster-pokemon/", label: "Booster" },
    { path: "/termekkategoria/pokemon/booster-display/", label: "Display" },
    { path: "/termekkategoria/pokemon/ex-box/", label: "EX Box" },
    { path: "/termekkategoria/pokemon/premium-collection/", label: "Premium" },
    { path: "/termekkategoria/pokemon/elite-trainer-box/", label: "Elite Trainer Box" },
    { path: "/termekkategoria/pokemon/tin/", label: "Tin" },
    { path: "/termekkategoria/pokemon/kiegeszitok/", label: "Kiegészítők" },
];
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PokemonScoutBot/0.2";
function normalizeUrl(href) {
    if (!href)
        return null;
    try {
        return new URL(href, BASE_URL).toString();
    }
    catch {
        return null;
    }
}
function parsePrice(text) {
    if (!text)
        return { priceHuf: null, raw: null };
    const cleaned = text.replace(/\s+/g, " ").trim();
    const digits = cleaned.replace(/[^\d]/g, "");
    if (!digits)
        return { priceHuf: null, raw: cleaned || null };
    return { priceHuf: Number.parseInt(digits, 10), raw: cleaned };
}
function extractSlug(url) {
    try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts.length ? parts[parts.length - 1] ?? null : null;
    }
    catch {
        return null;
    }
}
function determineStock(card) {
    if (card.hasClass("outofstock"))
        return false;
    if (card.find(".out-of-stock, .sold-out").length > 0)
        return false;
    const text = card.find(".stock, .availability").text().toLowerCase();
    if (text.includes("elfogyott") || text.includes("nincs"))
        return false;
    return true;
}
async function scrapeCategory(path, label) {
    const results = [];
    let page = 1;
    const MAX_PAGES = 15;
    while (page <= MAX_PAGES) {
        const url = new URL(path, BASE_URL);
        if (page > 1) {
            url.searchParams.set("paged", String(page));
        }
        const response = await axios.get(url.toString(), {
            headers: { "User-Agent": USER_AGENT },
            validateStatus: (status) => status < 400,
        });
        if (!response.data)
            break;
        const $ = cheerio.load(response.data);
        const cards = $("li.product");
        if (!cards.length)
            break;
        cards.each((_, element) => {
            const card = $(element);
            const nameAnchor = card
                .find("a")
                .filter((_, el) => $(el).text().trim().length > 0)
                .first();
            const fallback = card.find("a").first();
            const href = nameAnchor.attr("href") ?? fallback.attr("href") ?? undefined;
            const name = nameAnchor.text().trim();
            if (!href || !name)
                return;
            const absoluteUrl = normalizeUrl(href);
            if (!absoluteUrl)
                return;
            const priceInfo = parsePrice(card.find(".price").first().text());
            const imageCandidate = card.find("img").attr("data-src") ??
                card.find("img").attr("data-lazy-src") ??
                card.find("img").attr("src") ??
                null;
            const statusText = card.find(".stock, .availability").text().trim();
            const inStock = determineStock(card);
            results.push({
                name,
                url: absoluteUrl,
                imageUrl: normalizeUrl(imageCandidate),
                category: label,
                remoteId: card.attr("data-product-id") ??
                    card.find("a.button").attr("data-product_id") ??
                    null,
                slug: extractSlug(absoluteUrl),
                priceHuf: priceInfo.priceHuf,
                currency: priceInfo.priceHuf ? "HUF" : null,
                rawPrice: priceInfo.raw,
                statusText: statusText || (inStock ? "Készleten" : "Nincs készleten"),
                inStock,
            });
        });
        const hasNext = $(".woocommerce-pagination .next, .woocommerce-pagination a.next").length > 0;
        if (!hasNext)
            break;
        page += 1;
        await new Promise((resolve) => setTimeout(resolve, 750));
    }
    return results;
}
async function scrapeAllTcgBolt() {
    const aggregated = [];
    for (const category of CATEGORY_PATHS) {
        try {
            const items = await scrapeCategory(category.path, category.label);
            aggregated.push(...items);
        }
        catch (error) {
            console.error(`[SCRAPER] TCGBolt (${category.path}) failed:`, error.message);
        }
    }
    return aggregated;
}
export const tcgBoltScraper = {
    slug: "tcgbolt",
    displayName: "TCGBolt",
    baseUrl: BASE_URL,
    async scrapeAll() {
        return scrapeAllTcgBolt();
    },
};
//# sourceMappingURL=tcgbolt.js.map