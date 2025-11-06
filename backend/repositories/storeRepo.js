import { db } from "../db.js";
import { cuid } from "../utils/id.js";
const selectBySlug = db.prepare("SELECT * FROM stores WHERE slug = ?");
const selectAll = db.prepare("SELECT * FROM stores ORDER BY name ASC");
const insertStore = db.prepare(`INSERT INTO stores (id, slug, name, base_url)
   VALUES (?, ?, ?, ?)`);
const updateTimestamp = db.prepare(`UPDATE stores SET name = ?, base_url = ?, updated_at = datetime('now')
   WHERE id = ?`);
function mapDbStore(row) {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        baseUrl: row.base_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
export function ensureStore(slug, name, baseUrl) {
    const existingRow = selectBySlug.get(slug);
    const existing = existingRow ? mapDbStore(existingRow) : undefined;
    if (existing) {
        if (existing.name !== name || existing.baseUrl !== baseUrl) {
            updateTimestamp.run(name, baseUrl, existing.id);
            const updatedRow = selectBySlug.get(slug);
            return mapDbStore(updatedRow);
        }
        return existing;
    }
    const id = cuid();
    insertStore.run(id, slug, name, baseUrl);
    const inserted = selectBySlug.get(slug);
    return mapDbStore(inserted);
}
export function listStores() {
    const rows = selectAll.all();
    return rows.map(mapDbStore);
}
//# sourceMappingURL=storeRepo.js.map