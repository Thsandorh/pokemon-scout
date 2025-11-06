import { db } from "../db.js";
import { cuid } from "../utils/id.js";
const selectByUrl = db.prepare(`SELECT * FROM products WHERE store_id = ? AND product_url = ?`);
const selectById = db.prepare(`SELECT * FROM products WHERE id = ?`);
const insertProductStmt = db.prepare(`INSERT INTO products (
    id, store_id, remote_id, slug, name, product_url, image_url, category,
    current_price_huf, current_currency, status, in_stock,
    last_seen_at, created_at, updated_at
  ) VALUES (
    @id, @storeId, @remoteId, @slug, @name, @productUrl, @imageUrl, @category,
    @currentPriceHuf, @currentCurrency, @status, @inStock,
    datetime('now'), datetime('now'), datetime('now')
  )`);
const updateProductStmt = db.prepare(`UPDATE products
     SET remote_id = @remoteId,
         slug = @slug,
         name = @name,
         image_url = @imageUrl,
         category = @category,
         current_price_huf = @currentPriceHuf,
         current_currency = @currentCurrency,
         status = @status,
         in_stock = @inStock,
         last_seen_at = datetime('now'),
         last_change_at = @lastChangeAt,
         updated_at = datetime('now')
   WHERE id = @id`);
const insertSnapshotStmt = db.prepare(`INSERT INTO price_snapshots (
     id, product_id, price_huf, currency, in_stock, status, raw_price
   ) VALUES (
     @id, @productId, @priceHuf, @currency, @inStock, @status, @rawPrice
   )`);
export function upsertProduct(storeId, scraped) {
    const existingRow = selectByUrl.get(storeId, scraped.url);
    const existing = existingRow ? mapDbProduct(existingRow) : undefined;
    const normalizedPrice = typeof scraped.priceHuf === "number" ? scraped.priceHuf : null;
    const normalizedCurrency = scraped.currency ?? (normalizedPrice ? "HUF" : null);
    const normalizedStatus = scraped.statusText ?? null;
    const normalizedSlug = scraped.slug ?? null;
    const normalizedRemoteId = scraped.remoteId ?? null;
    const normalizedImage = scraped.imageUrl ?? null;
    const normalizedCategory = scraped.category ?? null;
    if (!existing) {
        const id = cuid();
        const row = {
            id,
            storeId,
            remoteId: normalizedRemoteId,
            slug: normalizedSlug,
            name: scraped.name,
            productUrl: scraped.url,
            imageUrl: normalizedImage,
            category: normalizedCategory,
            currentPriceHuf: normalizedPrice,
            currentCurrency: normalizedCurrency,
            status: normalizedStatus,
            inStock: scraped.inStock ? 1 : 0,
        };
        insertProductStmt.run(row);
        insertSnapshotStmt.run({
            id: cuid(),
            productId: id,
            priceHuf: normalizedPrice,
            currency: normalizedCurrency,
            inStock: scraped.inStock ? 1 : 0,
            status: normalizedStatus,
            rawPrice: scraped.rawPrice ?? null,
        });
        const productRow = selectById.get(id);
        if (!productRow) {
            throw new Error("Failed to load product after insert");
        }
        return {
            product: mapDbProduct(productRow),
            priceChanged: true,
            stockChanged: true,
        };
    }
    const priceChanged = normalizedPrice !== existing.currentPriceHuf;
    const stockChanged = scraped.inStock !== existing.inStock;
    const lastChangeAt = priceChanged || stockChanged
        ? new Date().toISOString()
        : existing.lastChangeAt;
    updateProductStmt.run({
        id: existing.id,
        remoteId: normalizedRemoteId,
        slug: normalizedSlug,
        name: scraped.name,
        productUrl: scraped.url,
        imageUrl: normalizedImage,
        category: normalizedCategory,
        currentPriceHuf: normalizedPrice,
        currentCurrency: normalizedCurrency,
        status: normalizedStatus,
        inStock: scraped.inStock ? 1 : 0,
        lastChangeAt,
    });
    if (priceChanged || stockChanged) {
        insertSnapshotStmt.run({
            id: cuid(),
            productId: existing.id,
            priceHuf: normalizedPrice,
            currency: normalizedCurrency,
            inStock: scraped.inStock ? 1 : 0,
            status: normalizedStatus,
            rawPrice: scraped.rawPrice ?? null,
        });
    }
    const updatedRow = selectById.get(existing.id);
    if (!updatedRow) {
        throw new Error("Failed to load product after update");
    }
    return {
        product: mapDbProduct(updatedRow),
        priceChanged,
        stockChanged,
        previous: existing,
    };
}
export function listProducts(filters = {}) {
    const clauses = [];
    const params = [];
    if (filters.storeId) {
        clauses.push("store_id = ?");
        params.push(filters.storeId);
    }
    if (filters.search) {
        clauses.push("LOWER(name) LIKE ?");
        params.push(`%${filters.search.toLowerCase()}%`);
    }
    if (typeof filters.inStock === "boolean") {
        clauses.push("in_stock = ?");
        params.push(filters.inStock ? 1 : 0);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    const stmt = db.prepare(`SELECT * FROM products ${where}
     ORDER BY in_stock DESC, updated_at DESC
     LIMIT ? OFFSET ?`);
    const rows = stmt.all(...params, limit, offset);
    return rows.map(mapDbProduct);
}
export function getProduct(id) {
    const row = selectById.get(id);
    return row ? mapDbProduct(row) : undefined;
}
export function listProductsNeedingAlerts() {
    const stmt = db.prepare(`SELECT p.*, a.id AS alert_id, a.email, a.target_price_huf,
            a.notify_on_in_stock, a.notify_on_restock,
            a.last_notified_in_stock, a.last_notified_price_huf
     FROM products p
     JOIN price_alerts a ON p.id = a.product_id
     WHERE a.active = 1`);
    const rows = stmt.all();
    return rows.map((row) => ({
        product: mapDbProduct(row),
        alert: {
            id: row.alert_id,
            email: row.email,
            targetPriceHuf: row.target_price_huf,
            notifyOnInStock: Boolean(row.notify_on_in_stock),
            notifyOnRestock: Boolean(row.notify_on_restock),
            lastNotifiedInStock: row.last_notified_in_stock === null
                ? null
                : Boolean(row.last_notified_in_stock),
            lastNotifiedPriceHuf: row.last_notified_price_huf,
        },
    }));
}
function mapDbProduct(row) {
    return {
        id: row.id,
        storeId: row.store_id,
        remoteId: row.remote_id,
        slug: row.slug,
        name: row.name,
        productUrl: row.product_url,
        imageUrl: row.image_url,
        category: row.category,
        currentPriceHuf: row.current_price_huf,
        currentCurrency: row.current_currency,
        status: row.status,
        inStock: Boolean(row.in_stock),
        lastSeenAt: row.last_seen_at,
        lastChangeAt: row.last_change_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=productRepo.js.map