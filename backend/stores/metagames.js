import axios from "axios";
import * as cheerio from "cheerio";
import { APP_CONFIG } from "../config.js";
const BASE_URL = "https://www.metagames.hu";
const LISTING_ROOT = APP_CONFIG.metagames.baseUrl ||
    "https://www.metagames.hu/gyujtogetos-kartyajatekok/pokemon-tcg/termekek";
function buildListingUrl(page) {
    if (page <= 0)
        return LISTING_ROOT;
    const separator = LISTING_ROOT.includes("?") ? "&" : "?";
    return `${LISTING_ROOT}${separator}page=${page}`;
}
function normalizeUrl(href) {
    if (!href)
        return BASE_URL;
    if (href.startsWith("http"))
        return href;
    return new URL(href, BASE_URL).toString();
}
function parsePrice(text) {
    if (!text)
        return { priceHuf: null, currency: null, raw: null };
    const cleaned = text.replace(/\s+/g, " ").trim();
    const digits = cleaned.replace(/[^\d]/g, "");
    if (!digits) {
        return { priceHuf: null, currency: null, raw: cleaned };
    }
    return {
        priceHuf: Number.parseInt(digits, 10),
        currency: cleaned.includes("Ft") ? "HUF" : null,
        raw: cleaned,
    };
}
function extractRemoteId(href) {
    if (!href)
        return null;
    const match = href.match(/pid(\d+)/i);
    return match ? match[1] ?? null : null;
}
function extractSlug(href) {
    if (!href)
        return null;
    const segments = href.split("/").filter(Boolean);
    const candidate = segments.length
        ? segments[segments.length - 1]
        : null;
    return candidate ?? null;
}
async function scrapeMetagamesPage(page) {
    const url = buildListingUrl(page);
    const response = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PokemonScoutBot/0.2",
        },
    });
    const $ = cheerio.load(response.data);
    const products = [];
    $(".webshop-list-item").each((_, element) => {
        const card = $(element);
        const link = card.find(".webshop-list-item-name a").first();
        const href = link.attr("href");
        const name = link.text().trim();
        if (!name || !href)
            return;
        const imageUrl = card.find(".product-list-image img").attr("src") ??
            card.find("img").first().attr("src") ??
            null;
        const priceNode = card.find("h5").first().text().trim();
        const priceInfo = parsePrice(priceNode);
        const statusTextRaw = card
            .find(".badge, .text-success, .text-danger, .label, .product-state")
            .map((_, el) => $(el).text().trim())
            .toArray()
            .find(Boolean) ?? null;
        const normalizedStatus = statusTextRaw
            ? statusTextRaw.toLowerCase()
            : "";
        const plainStatus = normalizedStatus
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const hasRestockButton = card.find('button[id^="subscribeItemRestock"]').length > 0;
        const explicitOut = normalizedStatus.includes("nincs készleten") ||
            plainStatus.includes("nincs keszleten") ||
            normalizedStatus.includes("hamarosan") ||
            plainStatus.includes("hamarosan") ||
            normalizedStatus.includes("elfogyott");
        const inStock = !(hasRestockButton || explicitOut);
        const absoluteUrl = normalizeUrl(href);
        if (!absoluteUrl)
            return;
        products.push({
            name,
            url: absoluteUrl,
            imageUrl: imageUrl ? normalizeUrl(imageUrl) : null,
            remoteId: extractRemoteId(href),
            slug: extractSlug(href),
            category: null,
            priceHuf: priceInfo.priceHuf,
            currency: priceInfo.currency ?? (priceInfo.priceHuf ? "HUF" : null),
            rawPrice: priceInfo.raw,
            statusText: statusTextRaw,
            inStock,
        });
    });
    const hasNext = $(".pagination a, .page-link")
        .map((_, el) => $(el).text().trim())
        .toArray()
        .some((text) => text === ">" || text === ">>" || text === "Kovetkezo") && products.length > 0;
    return { products, hasNext };
}
async function scrapeAllMetagames() {
    const aggregated = [];
    let page = 0;
    const limit = APP_CONFIG.metagames.pageLimit ?? 50;
    while (page < limit) {
        const { products, hasNext } = await scrapeMetagamesPage(page);
        aggregated.push(...products);
        if (!hasNext || products.length === 0)
            break;
        page += 1;
        if (APP_CONFIG.metagames.sleepMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.metagames.sleepMs));
        }
    }
    return aggregated;
}
export const metagamesScraper = {
    slug: "metagames",
    displayName: "Metagames",
    baseUrl: BASE_URL,
    async scrapeAll() {
        return scrapeAllMetagames();
    },
};
//# sourceMappingURL=metagames.js.map