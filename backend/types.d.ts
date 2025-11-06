export type Store = {
    id: string;
    slug: string;
    name: string;
    baseUrl: string;
    createdAt: string;
    updatedAt: string;
};
export type Product = {
    id: string;
    storeId: string;
    remoteId: string | null;
    slug: string | null;
    name: string;
    productUrl: string;
    imageUrl: string | null;
    category: string | null;
    currentPriceHuf: number | null;
    currentCurrency: string | null;
    status: string | null;
    inStock: boolean;
    lastSeenAt: string;
    lastChangeAt: string | null;
    createdAt: string;
    updatedAt: string;
};
export type PriceSnapshot = {
    id: string;
    productId: string;
    priceHuf: number | null;
    currency: string | null;
    inStock: boolean;
    status: string | null;
    rawPrice: string | null;
    collectedAt: string;
};
export type PriceAlert = {
    id: string;
    productId: string;
    email: string;
    targetPriceHuf: number | null;
    notifyOnInStock: boolean;
    notifyOnRestock: boolean;
    active: boolean;
    lastNotifiedAt: string | null;
    lastNotifiedPriceHuf: number | null;
    lastNotifiedInStock: boolean | null;
    createdAt: string;
    updatedAt: string;
};
export type ScrapedProduct = {
    remoteId: string | null;
    slug: string | null;
    name: string;
    url: string;
    imageUrl: string | null;
    category: string | null;
    priceHuf: number | null;
    currency: string | null;
    statusText: string | null;
    inStock: boolean;
    rawPrice: string | null;
};
//# sourceMappingURL=types.d.ts.map