import type { Product } from "../types.js";
import type { ProductAlertJoin } from "../repositories/productRepo.js";
export type AlertEvaluationInput = {
    product: Product;
    previous?: Product;
    priceChanged: boolean;
    stockChanged: boolean;
};
export declare function evaluateAlertsForProduct(input: AlertEvaluationInput): Promise<void>;
export declare function evaluateAlertsBulk(joins: ProductAlertJoin[]): Promise<void>;
//# sourceMappingURL=alertService.d.ts.map