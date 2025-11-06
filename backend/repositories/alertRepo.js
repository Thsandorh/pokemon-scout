import { db } from "../db.js";
import { cuid } from "../utils/id.js";
const insertAlert = db.prepare(`INSERT INTO price_alerts (
     id, product_id, email, target_price_huf,
     notify_on_in_stock, notify_on_restock, active
   ) VALUES (
     @id, @productId, @email, @targetPriceHuf,
     @notifyOnInStock, @notifyOnRestock, 1
   )`);
const selectByProduct = db.prepare(`SELECT * FROM price_alerts WHERE product_id = ? AND active = 1`);
const selectById = db.prepare(`SELECT * FROM price_alerts WHERE id = ?`);
const selectByProductEmail = db.prepare(`SELECT * FROM price_alerts WHERE product_id = ? AND email = ?`);
const updateNotification = db.prepare(`UPDATE price_alerts
     SET last_notified_at = datetime('now'),
         last_notified_price_huf = @priceHuf,
         last_notified_in_stock = @inStock,
         updated_at = datetime('now')
   WHERE id = @id`);
const deactivateStmt = db.prepare(`UPDATE price_alerts
     SET active = 0,
         updated_at = datetime('now')
   WHERE id = ?`);
export function createAlert(params) {
    const exists = selectByProductEmail.get(params.productId, params.email);
    if (exists) {
        throw new Error("Alert already exists for this product and email");
    }
    const id = cuid();
    insertAlert.run({
        id,
        productId: params.productId,
        email: params.email,
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
function mapAlert(row) {
    return {
        id: row.id,
        productId: row.product_id,
        email: row.email,
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