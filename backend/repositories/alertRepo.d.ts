import type { PriceAlert } from "../types.js";
export declare function createAlert(params: {
    productId: string;
    email: string;
    targetPriceHuf?: number;
    notifyOnInStock?: boolean;
    notifyOnRestock?: boolean;
}): PriceAlert;
export declare function listActiveAlerts(productId: string): PriceAlert[];
export declare function markAlertNotified(id: string, details: {
    priceHuf: number | null;
    inStock: boolean;
}): void;
export declare function deactivateAlert(id: string): void;
export declare function getAlert(id: string): PriceAlert | undefined;
//# sourceMappingURL=alertRepo.d.ts.map