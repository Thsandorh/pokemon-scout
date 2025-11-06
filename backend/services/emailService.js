import nodemailer from "nodemailer";
import { APP_CONFIG } from "../config.js";
const { email } = APP_CONFIG;
const transporter = email.smtpHost && email.smtpUser && email.smtpPass
    ? nodemailer.createTransport({
        host: email.smtpHost,
        port: email.smtpPort,
        secure: email.smtpPort === 465,
        auth: {
            user: email.smtpUser,
            pass: email.smtpPass,
        },
    })
    : null;
export async function sendAlertEmail(params) {
    if (!transporter) {
        console.log("[DEV EMAIL]", JSON.stringify({
            to: params.to,
            subject: params.subject,
            text: params.text,
        }, null, 2));
        return;
    }
    await transporter.sendMail({
        from: APP_CONFIG.email.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text ?? params.html.replace(/<[^>]+>/g, " "),
    });
}
//# sourceMappingURL=emailService.js.map