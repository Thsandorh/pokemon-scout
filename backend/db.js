import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";
import { APP_CONFIG } from "./config.js";
function normalizeParams(params) {
    if (params.length === 0)
        return undefined;
    if (params.length === 1) {
        const single = params[0];
        if (Array.isArray(single))
            return single;
        if (typeof single === "object" && single !== null) {
            const prototype = Object.getPrototypeOf(single);
            if (prototype === Object.prototype || prototype === null) {
                const source = single;
                const namedParams = {};
                for (const [key, value] of Object.entries(source)) {
                    namedParams[key] = value;
                    if (typeof key === "string" &&
                        key.length > 0 &&
                        !key.startsWith(":") &&
                        !key.startsWith("@") &&
                        !key.startsWith("$")) {
                        namedParams[`:${key}`] = value;
                        namedParams[`@${key}`] = value;
                        namedParams[`$${key}`] = value;
                    }
                }
                return namedParams;
            }
        }
        return [single];
    }
    return params;
}
const dbPath = path.isAbsolute(APP_CONFIG.sqlite.file)
    ? APP_CONFIG.sqlite.file
    : path.join(process.cwd(), APP_CONFIG.sqlite.file);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const SQL = await initSqlJs({
    locateFile: (file) => path.resolve(moduleDir, "../node_modules/sql.js/dist", file),
});
let sqlite;
if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlite = new SQL.Database(new Uint8Array(fileBuffer));
}
else {
    sqlite = new SQL.Database();
}
let persistScheduled = false;
let persistTimer = null;
let closed = false;
function persistNow() {
    const data = sqlite.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}
function schedulePersist() {
    if (closed)
        return;
    if (persistScheduled)
        return;
    persistScheduled = true;
    persistTimer = setTimeout(() => {
        persistScheduled = false;
        persistTimer = null;
        persistNow();
    }, 50);
}
class PreparedStatement {
    database;
    sql;
    constructor(database, sql) {
        this.database = database;
        this.sql = sql;
    }
    withStatement(params, executor) {
        const statement = this.database.prepare(this.sql);
        try {
            const bindValue = normalizeParams(params);
            if (bindValue !== undefined) {
                statement.bind(bindValue);
            }
            return executor(statement);
        }
        finally {
            statement.free();
        }
    }
    all(...params) {
        return this.withStatement(params, (stmt) => {
            const rows = [];
            while (stmt.step()) {
                rows.push(stmt.getAsObject());
            }
            return rows;
        });
    }
    get(...params) {
        return this.withStatement(params, (stmt) => {
            const hasRow = stmt.step();
            return hasRow ? stmt.getAsObject() : undefined;
        });
    }
    run(...params) {
        return this.withStatement(params, (stmt) => {
            const bindValue = normalizeParams(params);
            if (bindValue !== undefined) {
                stmt.run(bindValue);
            }
            else {
                stmt.run();
            }
            schedulePersist();
        });
    }
}
class DatabaseWrapper {
    database;
    constructor(database) {
        this.database = database;
    }
    prepare(sql) {
        return new PreparedStatement(this.database, sql);
    }
    exec(sql) {
        this.database.run(sql);
        schedulePersist();
    }
}
export const db = new DatabaseWrapper(sqlite);
export function migrate() {
    const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
  `;
    const createStores = `
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`;
    const createProducts = `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      remote_id TEXT,
      slug TEXT,
      name TEXT NOT NULL,
      product_url TEXT NOT NULL,
      image_url TEXT,
      category TEXT,
      current_price_huf INTEGER,
      current_currency TEXT,
      status TEXT,
      in_stock INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_change_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );`;
    const createProductIndexes = `
    CREATE UNIQUE INDEX IF NOT EXISTS products_store_url_idx
      ON products(store_id, product_url);
    CREATE INDEX IF NOT EXISTS products_store_slug_idx
      ON products(store_id, slug);
  `;
    const createSnapshots = `
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      price_huf INTEGER,
      currency TEXT,
      in_stock INTEGER NOT NULL,
      status TEXT,
      raw_price TEXT,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS price_snapshots_product_idx
      ON price_snapshots(product_id, collected_at DESC);
  `;
    const createAlerts = `
    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      target_price_huf INTEGER,
      notify_on_in_stock INTEGER NOT NULL DEFAULT 1,
      notify_on_restock INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      last_notified_at TEXT,
      last_notified_price_huf INTEGER,
      last_notified_in_stock INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(product_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS price_alerts_user_idx ON price_alerts(user_id);
    CREATE INDEX IF NOT EXISTS price_alerts_product_idx ON price_alerts(product_id);
  `;
    // Migration: Check if we need to recreate price_alerts table with user_id
    const checkUserIdColumn = db.prepare("PRAGMA table_info(price_alerts)").all();
    const hasUserId = checkUserIdColumn.some((col) => col.name === "user_id");
    if (checkUserIdColumn.length > 0 && !hasUserId) {
        console.log("[MIGRATION] Recreating price_alerts table with user_id support");
        db.exec(`
      DROP TABLE IF EXISTS price_alerts;
    `);
    }
    db.exec([
        createUsers,
        createStores,
        createProducts,
        createProductIndexes,
        createSnapshots,
        createAlerts,
    ].join("\n"));
}
export function flushDatabase() {
    if (closed)
        return;
    if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
        persistScheduled = false;
    }
    persistNow();
}
export function closeDatabase() {
    if (closed)
        return;
    flushDatabase();
    sqlite.close();
    closed = true;
}
migrate();
//# sourceMappingURL=db.js.map