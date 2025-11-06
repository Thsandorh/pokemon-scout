import axios from "axios";
import * as cheerio from "cheerio";
const BASE_URL = "https://www.varazslatosjatekok.hu";
const CATEGORY_PATHS = [
    { path: "/pokemon-boosterek/", label: "Boosterek" },
    { path: "/pokemon-elite-trainer-boxok/", label: "Elite Trainer Boxok" },
    { path: "/pokemon-booster-boxok/", label: "Booster Boxok" },
    { path: "/pokemon-ajandek-v-boxok/", label: "Ajándék Boxok" },
    { path: "/pokemon-kis-ajandekok/", label: "Kis Ajándékok" },
    { path: "/pokemon-kellekek/", label: "Kellékek" },
    { path: "/pokemon-kartya-boritok/", label: "Kártyavédők" },
    { path: "/pokemon-albumok/", label: "Albumok" },
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
function buildCategoryUrl(path, page) {
    if (page <= 1)
        return new URL(path, BASE_URL).toString();
    const normalized = path.endsWith("/") ? path : `${path}/`;
    return new URL(`${normalized}oldal-${page}/`, BASE_URL).toString();
}
function parsePrice(text) {
    if (!text)
        return { priceHuf: null, rawPrice: null };
    const cleaned = text.replace(/\s+/g, " ").trim();
    const digits = cleaned.replace(/[^\d]/g, "");
    if (!digits) {
        return { priceHuf: null, rawPrice: cleaned || null };
    }
    return {
        priceHuf: Number.parseInt(digits, 10),
        rawPrice: cleaned,
    };
}
function determineStock(card) {
    const stateClass = card.attr("class") ?? "";
    if (stateClass.includes("inactive") || stateClass.includes("out-of-stock")) {
        return false;
    }
    if (card.find("button[disabled], a.disabled").length > 0) {
        return false;
    }
    const stockText = card
        .find(".p-availability, .availability, .label")
        .text()
        .toLowerCase();
    if (stockText.includes("nincs készleten") || stockText.includes("elfogyott")) {
        return false;
    }
    return true;
}
async function scrapeCategory(categoryPath, label) {
    const results = [];
    let page = 1;
    const MAX_PAGES = 20;
    while (page <= MAX_PAGES) {
        const url = buildCategoryUrl(categoryPath, page);
        const response = await axios.get(url, {
            headers: { "User-Agent": USER_AGENT },
            validateStatus: (status) => status < 400,
        });
        if (!response.data)
            break;
        const $ = cheerio.load(response.data);
        const cards = $(".products .product");
        if (!cards.length)
            break;
        cards.each((_, product) => {
            const card = $(product);
            const textAnchor = card
                .find("a")
                .filter((_, el) => $(el).text().trim().length > 0)
                .first();
            const fallbackLink = card.find("a").first();
            const href = textAnchor.attr("href") ?? fallbackLink.attr("href") ?? undefined;
            const name = textAnchor.text().trim();
            if (!name || !href)
                return;
            const priceText = card.find("[data-testid='productCardPrice']").first().text().trim() ||
                card.find(".price-final strong").first().text().trim() ||
                card.find(".price").first().text().trim();
            const price = parsePrice(priceText);
            const img = card.find("img").first().attr("data-src") ||
                card.find("img").first().attr("src") ||
                null;
            const statusText = card
                .find(".p-availability, .availability, .label")
                .map((_, el) => $(el).text().trim())
                .toArray()
                .find(Boolean) ?? null;
            const absoluteUrl = normalizeUrl(href);
            if (!absoluteUrl)
                return;
            results.push({
                name,
                url: absoluteUrl,
                imageUrl: normalizeUrl(img),
                category: label,
                remoteId: card.find("[data-micro-product-id]").attr("data-micro-product-id") ?? null,
                slug: absoluteUrl.split("/").filter(Boolean).pop() ?? null,
                priceHuf: price.priceHuf,
                currency: price.priceHuf ? "HUF" : null,
                rawPrice: price.rawPrice,
                statusText,
                inStock: determineStock(card),
            });
        });
        const hasNext = $(".paginator a, .pagination a")
            .map((_, el) => $(el).attr("href") ?? "")
            .toArray()
            .some((href) => href.includes(`oldal-${page + 1}`));
        if (!hasNext)
            break;
        page += 1;
        await new Promise((resolve) => setTimeout(resolve, 750));
    }
    return results;
}
async function scrapeAllVarazslatos() {
    const aggregated = [];
    for (const category of CATEGORY_PATHS) {
        try {
            const items = await scrapeCategory(category.path, category.label);
            aggregated.push(...items);
        }
        catch (error) {
            console.error(`[SCRAPER] Varazslatos (${category.path}) failed:`, error.message);
        }
    }
    return aggregated;
}
export const varazslatosScraper = {
    slug: "varazslatosjatekok",
    displayName: "Varázslatos Játékok",
    baseUrl: BASE_URL,
    async scrapeAll() {
        return scrapeAllVarazslatos();
    },
};
//# sourceMappingURL=varazslatos.js.map