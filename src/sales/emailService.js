const nodemailer = require("nodemailer");

function getTransporter() {
  if (!process.env.BREVO_SMTP_KEY) return null;
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: "b1ec58001@smtp-brevo.com",
      pass: process.env.BREVO_SMTP_KEY
    }
  });
}

async function sendRobloxPurchaseEmail(toEmail, { keyValue, planLabel, ref, days }) {
  if (!toEmail) return;
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] BREVO_SMTP_KEY no configurado, no se envía el mail.");
    return;
  }

  const expiryLine = days
    ? `Esta key vence en ${days} días a partir de su activación.`
    : "";

  const subject = "Tu acceso a Ceitus Roblox External";

  const text =
    `Gracias por comprar Ceitus Roblox External.\n\n` +
    `Tu key de acceso es:\n\n  ${keyValue}\n\n` +
    `Plan: ${planLabel}\n` +
    `Referencia de compra: ${ref}\n\n` +
    `Abrí el loader de Ceitus Roblox, entrá a Activar, pegá la key y listo.\n\n` +
    (expiryLine ? expiryLine + "\n\n" : "") +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `AVISO IMPORTANTE — NO SOLICITES REEMBOLSO\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Al completar la compra aceptaste los Términos de Servicio de Ceitus:\n\n` +
    `• El acceso es entregado de forma digital e inmediata al pago.\n` +
    `• No se realizan reembolsos una vez entregada la key de acceso.\n` +
    `• El uso del software es bajo tu exclusiva responsabilidad.\n` +
    `• Si experimentás problemas técnicos, contactanos en nuestro servidor de Discord antes de abrir cualquier disputa.\n\n` +
    `Disputas o chargebacks sin haber contactado soporte primero pueden resultar en el bloqueo permanente de tu cuenta de PayPal.\n\n` +
    `Guardá este mail — no hay recuperación de key.`;

  const html =
    `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:540px;margin:auto;background:#0a0a0d;color:#e0e0e0;padding:24px;border-radius:12px">` +
    `<h2 style="color:#ff4444;margin-top:0">Ceitus 「Roblox」 External</h2>` +
    `<p>Gracias por tu compra. Tu key de acceso es:</p>` +
    `<p style="font-size:18px;font-weight:bold;background:#111;color:#8be9fd;padding:14px 18px;border-radius:8px;letter-spacing:1px;word-break:break-all">${keyValue}</p>` +
    `<p><b>Plan:</b> ${planLabel}<br><b>Referencia:</b> <code>${ref}</code></p>` +
    `<p>Abrí el loader de <b>Ceitus Roblox</b>, entrá a <b>Activar</b>, pegá la key y listo.</p>` +
    (expiryLine ? `<p style="color:#ffb84d">${expiryLine}</p>` : "") +
    `<hr style="border-color:#333;margin:20px 0">` +
    `<div style="background:#1a0000;border:1px solid #5c0000;border-radius:8px;padding:16px">` +
    `<h3 style="color:#ff4444;margin-top:0">⚠️ AVISO — NO SOLICITES REEMBOLSO</h3>` +
    `<p style="font-size:13px;color:#ccc">Al completar la compra aceptaste los Términos de Servicio de Ceitus:</p>` +
    `<ul style="font-size:13px;color:#ccc;line-height:1.7">` +
    `<li>El acceso es entregado de forma digital e inmediata al pago.</li>` +
    `<li>No se realizan reembolsos una vez entregada la key de acceso.</li>` +
    `<li>El uso del software es bajo tu exclusiva responsabilidad.</li>` +
    `<li>Si experimentás problemas técnicos, contactanos en Discord antes de abrir cualquier disputa.</li>` +
    `</ul>` +
    `<p style="font-size:12px;color:#ff4444;font-weight:bold">Disputas o chargebacks sin haber contactado soporte primero pueden resultar en el bloqueo permanente de tu cuenta de PayPal.</p>` +
    `</div>` +
    `<p style="color:#666;font-size:12px;margin-top:16px">Guardá este mail — no hay recuperación de key.</p>` +
    `</div>`;

  await transporter.sendMail({
    from: '"Ceitus" <holadariobueno@gmail.com>',
    to: toEmail,
    subject,
    text,
    html
  });
}

module.exports = { sendRobloxPurchaseEmail };
