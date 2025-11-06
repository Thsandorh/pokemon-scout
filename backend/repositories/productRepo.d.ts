import type { Product, ScrapedProduct } from "../types.js";
export type UpsertResult = {
    product: Product;
    priceChanged: boolean;
    stockChanged: boolean;
    previous?: Product;
};
export declare function upsertProduct(storeId: string, scraped: ScrapedProduct): UpsertResult;
export type ListFilters = {
    storeId?: string;
    search?: string;
    inStock?: boolean;
    limit?: number;
    offset?: number;
};
export declare function listProducts(filters?: ListFilters): Product[];
export declare function getProduct(id: string): Product | undefined;
export type ProductAlertJoin = {
    product: Product;
    alert: {
        id: string;
        email: string;
        targetPriceHuf: number | null;
        notifyOnInStock: boolean;
        notifyOnRestock: boolean;
        lastNotifiedInStock: boolean | null;
        lastNotifiedPriceHuf: number | null;
    };
};
export declare function listProductsNeedingAlerts(): ProductAlertJoin[];
//# sourceMappingURL=productRepo.d.ts.map