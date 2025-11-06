import { config as loadEnv } from "dotenv";
loadEnv();
function normalizeBasePath(raw) {
    if (!raw)
        return "";
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "/")
        return "";
    const withoutLeading = trimmed.replace(/^\/+/, "");
    const withoutTrailing = withoutLeading.replace(/\/+$/, "");
    return withoutTrailing ? `/${withoutTrailing}` : "";
}
const HARDCODED_BASE_PATH = normalizeBasePath("/pokemonscout") || "/pokemonscout";
const HARDCODED_BASE_URL = "https://flixnest.app/pokemonscout";
const HARDCODED_PORT = 4000;
export const APP_CONFIG = {
    port: HARDCODED_PORT,
    baseUrl: HARDCODED_BASE_URL,
    basePath: HARDCODED_BASE_PATH,
    metagames: {
        baseUrl: process.env.METAGAMES_BASE_URL ??
            "https://www.metagames.hu/gyujtogetos-kartyajatekok/pokemon-tcg/termekek",
        concurrency: parseInt(process.env.SCRAPER_CONCURRENCY ?? "2", 10),
        pageLimit: process.env.METAGAMES_PAGE_LIMIT
            ? parseInt(process.env.METAGAMES_PAGE_LIMIT, 10)
            : undefined,
        sleepMs: parseInt(process.env.SCRAPER_DELAY_MS ?? "750", 10),
    },
    sqlite: {
        file: "data.db",
    },
    email: {
        from: process.env.ALERT_FROM_EMAIL ?? "no-reply@pokemon-scout.local",
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
    },
    cron: process.env.SCRAPER_CRON ?? "*/30 * * * *", // every 30 minutes
};
//# sourceMappingURL=config.js.map