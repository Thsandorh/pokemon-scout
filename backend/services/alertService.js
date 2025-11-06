import { listActiveAlerts, markAlertNotified, } from "../repositories/alertRepo.js";
import { sendAlertEmail } from "./emailService.js";
import { APP_CONFIG } from "../config.js";
export async function evaluateAlertsForProduct(input) {
    const alerts = listActiveAlerts(input.product.id);
    for (const alert of alerts) {
        if (shouldNotify(alert, input)) {
            await sendNotification(alert, input.product);
        }
    }
}
export async function evaluateAlertsBulk(joins) {
    for (const join of joins) {
        const alert = {
            id: join.alert.id,
            productId: join.product.id,
            email: join.alert.email,
            targetPriceHuf: join.alert.targetPriceHuf,
            notifyOnInStock: join.alert.notifyOnInStock,
            notifyOnRestock: join.alert.notifyOnRestock,
            active: true,
            lastNotifiedAt: null,
            lastNotifiedPriceHuf: join.alert.lastNotifiedPriceHuf,
            lastNotifiedInStock: join.alert.lastNotifiedInStock,
            createdAt: "",
            updatedAt: "",
        };
        if (shouldNotify(alert, { product: join.product, priceChanged: true, stockChanged: true })) {
            await sendNotification(alert, join.product);
        }
    }
}
function shouldNotify(alert, input) {
    const { product, previous, priceChanged, stockChanged } = input;
    let notify = false;
    if (alert.targetPriceHuf != null &&
        product.currentPriceHuf != null &&
        product.currentPriceHuf <= alert.targetPriceHuf &&
        (priceChanged ||
            alert.lastNotifiedPriceHuf == null ||
            product.currentPriceHuf < alert.lastNotifiedPriceHuf)) {
        notify = true;
    }
    if (alert.notifyOnInStock && product.inStock) {
        const wasOut = previous ? !previous.inStock : alert.lastNotifiedInStock !== true;
        if (wasOut && (stockChanged || alert.lastNotifiedInStock !== true)) {
            notify = true;
        }
    }
    if (alert.notifyOnRestock &&
        stockChanged &&
        product.inStock &&
        previous &&
        !previous.inStock) {
        notify = true;
    }
    return notify;
}
async function sendNotification(alert, product) {
    const priceText = product.currentPriceHuf
        ? `${product.currentPriceHuf.toLocaleString("hu-HU")} Ft`
        : "Ismeretlen ár";
    const subject = `Pokémon árriasztás: ${product.name} ${product.inStock ? "elérhető" : ""}`;
    const url = product.productUrl.startsWith("http")
        ? product.productUrl
        : new URL(product.productUrl, APP_CONFIG.metagames.baseUrl).toString();
    const html = `
    <p>Szia!</p>
    <p>A(z) <strong>${product.name}</strong> termék frissült a Metagames kínálatában.</p>
    <ul>
      <li>Ár: ${priceText}</li>
      <li>Rendelhető: ${product.inStock ? "igen" : "nem"}</li>
      <li>Állapot: ${product.status ?? "ismeretlen"}</li>
    </ul>
    <p><a href="${url}">Nézd meg a terméket</a></p>
    <p>— Pokémon Scout</p>
  `;
    await sendAlertEmail({
        to: alert.email,
        subject,
        html,
        text: `${product.name} — ${priceText} — ${url}`,
    });
    markAlertNotified(alert.id, {
        priceHuf: product.currentPriceHuf ?? null,
        inStock: product.inStock,
    });
}
//# sourceMappingURL=alertService.js.map