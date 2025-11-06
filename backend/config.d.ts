export declare const APP_CONFIG: {
    port: number;
    baseUrl: string;
    basePath: string;
    metagames: {
        baseUrl: string;
        concurrency: number;
        pageLimit: number | undefined;
        sleepMs: number;
    };
    sqlite: {
        file: string;
    };
    email: {
        from: string;
        smtpHost: string | undefined;
        smtpPort: number;
        smtpUser: string | undefined;
        smtpPass: string | undefined;
    };
    cron: string;
};
//# sourceMappingURL=config.d.ts.map