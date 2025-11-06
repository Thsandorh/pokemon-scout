import type { Database as SqlJsDatabase } from "sql.js";
declare class PreparedStatement {
    private readonly database;
    private readonly sql;
    constructor(database: SqlJsDatabase, sql: string);
    private withStatement;
    all(...params: unknown[]): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
    run(...params: unknown[]): void;
}
declare class DatabaseWrapper {
    private readonly database;
    constructor(database: SqlJsDatabase);
    prepare(sql: string): PreparedStatement;
    exec(sql: string): void;
}
export declare const db: DatabaseWrapper;
export declare function migrate(): void;
export declare function flushDatabase(): void;
export declare function closeDatabase(): void;
export {};
//# sourceMappingURL=db.d.ts.map