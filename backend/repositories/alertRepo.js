import { db } from "../db.js";
import { cuid } from "../utils/id.js";
const insertAlert = db.prepare(`INSERT INTO price_alerts (
     id, product_id, user_id, target_price_huf,
     notify_on_in_stock, notify_on_restock, active
   ) VALUES (
     @id, @productId, @userId, @targetPriceHuf,
     @notifyOnInStock, @notifyOnRestock, 1
   )`);
const selectByProduct = db.prepare(`
    SELECT pa.*, u.email as user_email
    FROM price_alerts pa
    LEFT JOIN users u ON pa.user_id = u.id
    WHERE pa.product_id = ? AND pa.active = 1
`);
const selectById = db.prepare(`SELECT * FROM price_alerts WHERE id = ?`);
const selectByProductUser = db.prepare(`SELECT * FROM price_alerts WHERE product_id = ? AND user_id = ?`);
const selectByUser = db.prepare(`SELECT pa.*, p.name as product_name, p.image_url, p.current_price_huf, p.in_stock, p.product_url, s.name as store_name
     FROM price_alerts pa
     LEFT JOIN products p ON pa.product_id = p.id
     LEFT JOIN stores s ON p.store_id = s.id
     WHERE pa.user_id = ? AND pa.active = 1
     ORDER BY pa.created_at DESC`);
const updateNotification = db.prepare(`UPDATE price_alerts
     SET last_notified_at = datetime('now'),
         last_notified_price_huf = @priceHuf,
         last_notified_in_stock = @inStock,
         updated_at = datetime('now')
   WHERE id = @id`);
const updateAlertStmt = db.prepare(`UPDATE price_alerts
     SET target_price_huf = @targetPriceHuf,
         notify_on_in_stock = @notifyOnInStock,
         notify_on_restock = @notifyOnRestock,
         updated_at = datetime('now')
   WHERE id = @id AND user_id = @userId`);
const deactivateStmt = db.prepare(`UPDATE price_alerts
     SET active = 0,
         updated_at = datetime('now')
   WHERE id = ?`);
const deleteStmt = db.prepare(`DELETE FROM price_alerts WHERE id = ? AND user_id = ?`);
export function createAlert(params) {
    const exists = selectByProductUser.get(params.productId, params.userId);
    if (exists) {
        throw new Error("Alert already exists for this product");
    }
    const id = cuid();
    insertAlert.run({
        id,
        productId: params.productId,
        userId: params.userId,
        targetPriceHuf: params.targetPriceHuf ?? null,
        notifyOnInStock: params.notifyOnInStock === false ? 0 : 1,
        notifyOnRestock: params.notifyOnRestock === false ? 0 : 1,
    });
    const row = selectById.get(id);
    if (!row)
        throw new Error("Failed to read alert after insert");
    return mapAlert(row);
}
export function listActiveAlerts(productId) {
    const rows = selectByProduct.all(productId);
    return rows.map(mapAlert);
}
export function markAlertNotified(id, details) {
    updateNotification.run({
        id,
        priceHuf: details.priceHuf ?? null,
        inStock: details.inStock ? 1 : 0,
    });
}
export function deactivateAlert(id) {
    deactivateStmt.run(id);
}
export function getAlert(id) {
    const row = selectById.get(id);
    return row ? mapAlert(row) : undefined;
}
export function listAlertsForUser(userId) {
    const rows = selectByUser.all(userId);
    return rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        userId: row.user_id,
        targetPriceHuf: row.target_price_huf,
        notifyOnInStock: Boolean(row.notify_on_in_stock),
        notifyOnRestock: Boolean(row.notify_on_restock),
        active: Boolean(row.active),
        lastNotifiedAt: row.last_notified_at,
        lastNotifiedPriceHuf: row.last_notified_price_huf,
        lastNotifiedInStock: row.last_notified_in_stock === null
            ? null
            : Boolean(row.last_notified_in_stock),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        product: {
            name: row.product_name,
            imageUrl: row.image_url,
            currentPriceHuf: row.current_price_huf,
            inStock: Boolean(row.in_stock),
            productUrl: row.product_url,
            storeName: row.store_name,
        },
    }));
}
export function updateAlert(id, userId, params) {
    updateAlertStmt.run({
        id,
        userId,
        targetPriceHuf: params.targetPriceHuf ?? null,
        notifyOnInStock: params.notifyOnInStock === false ? 0 : 1,
        notifyOnRestock: params.notifyOnRestock === false ? 0 : 1,
    });
    const row = selectById.get(id);
    if (!row)
        throw new Error("Alert not found");
    return mapAlert(row);
}
export function deleteAlert(id, userId) {
    deleteStmt.run(id, userId);
}
function mapAlert(row) {
    return {
        id: row.id,
        productId: row.product_id,
        userId: row.user_id,
        email: row.user_email || row.email, // Support both joined and direct email
        targetPriceHuf: row.target_price_huf,
        notifyOnInStock: Boolean(row.notify_on_in_stock),
        notifyOnRestock: Boolean(row.notify_on_restock),
        active: Boolean(row.active),
        lastNotifiedAt: row.last_notified_at,
        lastNotifiedPriceHuf: row.last_notified_price_huf,
        lastNotifiedInStock: row.last_notified_in_stock === null
            ? null
            : Boolean(row.last_notified_in_stock),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=alertRepo.js.map