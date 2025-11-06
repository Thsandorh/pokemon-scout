import "./logger.js"; // MUST be first to capture all logs
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { APP_CONFIG } from "./config.js";
import { migrate, closeDatabase } from "./db.js";
import { listProducts, getProduct } from "./repositories/productRepo.js";
import { createAlert } from "./repositories/alertRepo.js";
import { primeScraper, runStoreScrape, describeSchedule } from "./services/scraperService.js";
import { listStores } from "./repositories/storeRepo.js";
import { getLogs, clearLogs } from "./logger.js";
async function bootstrap() {
    migrate();
    primeScraper()
        .then(() => {
        console.log("[SCRAPER] Initial scrape completed");
    })
        .catch((error) => {
        console.error("[SCRAPER] Initial scrape failed", error);
    });
    const frontendDir = path.resolve(process.cwd(), "frontend", "out");
    const frontendIndexFile = path.join(frontendDir, "index.html");
    const hasFrontendBuild = fs.existsSync(frontendIndexFile);
    const basePath = APP_CONFIG.basePath;
    const mountPath = basePath || "/";
    if (!hasFrontendBuild) {
        console.warn(`[SERVER] Frontend build not found at ${frontendDir}. Run "npm run build" before starting the server.`);
    }
    const app = express();
    app.use(cors());
    app.use(express.json());
    // Create API router to mount under basePath
    const apiRouter = express.Router();
    apiRouter.get("/api/stores", (_req, res) => {
        res.json({ stores: listStores() });
    });
    apiRouter.get("/health", (_req, res) => {
        res.json({ ok: true, cron: describeSchedule() });
    });
    apiRouter.get("/api/logs", (_req, res) => {
        const logs = getLogs();
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(logs.join("\n"));
    });
    apiRouter.post("/api/logs/clear", (_req, res) => {
        clearLogs();
        res.json({ ok: true, message: "Logs cleared" });
    });
    apiRouter.get("/api/products", (req, res) => {
        const schema = z.object({
            storeId: z.string().optional(),
            search: z.string().optional(),
            inStock: z
                .enum(["true", "false"])
                .transform((value) => value === "true")
                .optional(),
            limit: z.coerce.number().int().positive().max(500).optional(),
            offset: z.coerce.number().int().nonnegative().optional(),
        });
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const { inStock, limit, offset, storeId, search } = parsed.data;
        const filters = {};
        if (storeId)
            filters.storeId = storeId;
        if (search)
            filters.search = search;
        if (typeof inStock === "boolean")
            filters.inStock = inStock;
        if (typeof limit === "number")
            filters.limit = limit;
        if (typeof offset === "number")
            filters.offset = offset;
        res.json({ products: listProducts(filters) });
    });
    apiRouter.get("/api/products/:id", (req, res) => {
        const product = getProduct(req.params.id);
        if (!product) {
            res.status(404).json({ error: "Product not found" });
            return;
        }
        res.json({ product });
    });
    apiRouter.post("/api/alerts", (req, res) => {
        const schema = z.object({
            productId: z.string().min(1),
            email: z.string().email(),
            targetPriceHuf: z.number().int().positive().optional(),
            notifyOnInStock: z.boolean().optional(),
            notifyOnRestock: z.boolean().optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        try {
            const { productId, email, targetPriceHuf, notifyOnInStock, notifyOnRestock } = parsed.data;
            const alert = createAlert({
                productId,
                email,
                ...(targetPriceHuf !== undefined ? { targetPriceHuf } : {}),
                ...(notifyOnInStock !== undefined ? { notifyOnInStock } : {}),
                ...(notifyOnRestock !== undefined ? { notifyOnRestock } : {}),
            });
            res.status(201).json({ alert });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    apiRouter.post("/api/scrape", async (req, res) => {
        const schema = z.object({ storeSlug: z.string().min(1).optional() });
        const parsed = schema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        console.log(`[API] POST /api/scrape - storeSlug: ${parsed.data.storeSlug ?? 'ALL'}`);
        try {
            await runStoreScrape(parsed.data.storeSlug);
            console.log(`[API] POST /api/scrape - SUCCESS`);
            res.json({ ok: true });
        }
        catch (error) {
            console.error(`[API] POST /api/scrape - ERROR:`, error);
            res.status(500).json({ error: error.message ?? "scrape failed" });
        }
    });
    apiRouter.post("/api/scrape/metagames", async (_req, res) => {
        try {
            await runStoreScrape("metagames");
            res.json({ ok: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message ?? "scrape failed" });
        }
    });
    // Mount API router under basePath
    app.use(mountPath, apiRouter);
    if (hasFrontendBuild) {
        const frontendRouter = express.Router();
        frontendRouter.use(express.static(frontendDir));
        frontendRouter.use((req, res, next) => {
            if (req.method !== "GET")
                return next();
            const acceptHeader = req.headers.accept ?? "";
            if (acceptHeader &&
                !acceptHeader.includes("text/html") &&
                !acceptHeader.includes("*/*")) {
                return next();
            }
            res.sendFile(frontendIndexFile);
        });
        app.use(mountPath, frontendRouter);
        const nextAssetsDir = path.join(frontendDir, "_next");
        if (fs.existsSync(nextAssetsDir)) {
            const nextMountPath = basePath ? `${basePath}/_next` : "/_next";
            app.use(nextMountPath, express.static(nextAssetsDir));
        }
        const faviconPath = path.join(frontendDir, "favicon.ico");
        if (fs.existsSync(faviconPath)) {
            const faviconRoute = basePath ? `${basePath}/favicon.ico` : "/favicon.ico";
            app.get(faviconRoute, (_req, res) => {
                res.sendFile(faviconPath);
            });
        }
    }
    else {
        const missingPath = basePath || "/";
        app.get(missingPath, (_req, res) => {
            res.status(503).json({
                error: "Frontend build not found. Run `npm run build` to generate the static site.",
            });
        });
    }
    app.use((err, _req, res, _next) => {
        console.error("[SERVER] Unhandled error", err);
        res.status(500).json({ error: "Internal server error" });
    });
    const server = app.listen(APP_CONFIG.port, () => {
        console.log(`Pokemon Scout backend listening on port ${APP_CONFIG.port}`);
    });
    cron.schedule(APP_CONFIG.cron, () => {
        runStoreScrape().catch((err) => {
            console.error("[SCRAPER] Scheduled run failed", err);
        });
    });
    const handleShutdown = () => {
        server.close(() => {
            closeDatabase();
        });
    };
    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);
    process.on("beforeExit", closeDatabase);
    process.on("exit", closeDatabase);
}
bootstrap().catch((err) => {
    console.error("Failed to bootstrap server", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map