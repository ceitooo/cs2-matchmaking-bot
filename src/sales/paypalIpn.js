const http = require("http");
const { getRobloxTicketByRef, updateRobloxTicket, claimKey, getGuildSettings, getAvailableResources } = require("../db/database");
const { getPlan, buildTicketButtons } = require("./robloxPanel");
const { sendRobloxPurchaseEmail } = require("./emailService");
const { EmbedBuilder } = require("discord.js");

const PAYPAL_IPN_URL = "https://ipnpb.paypal.com/cgi-bin/webscr";
const RESOURCE = "ceitus-roblox";

let _client = null;

function setClient(client) {
  _client = client;
}

async function verifyIpn(rawBody) {
  const verifyBody = "cmd=_notify-validate&" + rawBody;
  const res = await fetch(PAYPAL_IPN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyBody
  });
  return (await res.text()).trim();
}

function parseBody(raw) {
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}

async function handleVerifiedPayment(data) {
  const ref = data.custom; // ORD-XXXXXXXX que pusimos en el link de PayPal
  if (!ref) return;

  const ticket = getRobloxTicketByRef(ref);
  if (!ticket) {
    console.warn("[paypal-ipn] No se encontró ticket con ref:", ref);
    return;
  }
  if (ticket.status === "completed") {
    console.log("[paypal-ipn] IPN duplicado para ref ya completada:", ref);
    return;
  }

  const plan = getPlan(ticket.plan);
  const guild = _client?.guilds.cache.get(ticket.guild_id);
  if (!guild) return;

  const key = claimKey(guild.id, RESOURCE, ticket.user_id);
  if (!key) {
    console.error("[paypal-ipn] Sin stock para entregar key a ref:", ref);
    const ch = await guild.channels.fetch(ticket.channel_id).catch(() => null);
    if (ch?.isTextBased()) {
      await ch.send("⚠️ **Pago recibido pero sin stock de keys.** Avisale al staff para entrega manual.").catch(() => {});
    }
    return;
  }

  updateRobloxTicket(ticket.channel_id, { status: "completed" });

  // Notificar en el canal del ticket
  const channel = await guild.channels.fetch(ticket.channel_id).catch(() => null);
  if (channel?.isTextBased()) {
    const deliveryEmbed = new EmbedBuilder()
      .setTitle("✅ ¡Pago confirmado! / Payment Confirmed!")
      .setColor(0x2ecc71)
      .setDescription(
        `<@${ticket.user_id}> — **Tu acceso a Ceitus Roblox External está listo:**\n\n` +
        `🔑 **Key:**\n\`\`\`${key.key_value}\`\`\`\n` +
        `**Plan:** ${plan?.labelEs ?? ticket.plan}\n` +
        `**Referencia:** \`${ref}\`\n\n` +
        `Abrí el loader, entrá a **Activar**, pegá la key y listo.\n` +
        `*Guardá este mensaje — no hay recuperación de key.*`
      )
      .setTimestamp();

    await channel.messages.fetch({ limit: 10 }).then((msgs) => {
      const panelMsg = msgs.find((m) => m.components.length > 0);
      if (panelMsg) panelMsg.edit({ components: [] }).catch(() => {});
    }).catch(() => {});

    await channel.send({ content: `<@${ticket.user_id}>`, embeds: [deliveryEmbed] });
  }

  // Asignar rol cliente
  const settings = getGuildSettings(guild.id);
  if (settings.roblox_customer_role_id) {
    const member = await guild.members.fetch(ticket.user_id).catch(() => null);
    if (member) await member.roles.add(settings.roblox_customer_role_id).catch(() => {});
  }

  // Canal de pruebas de compra
  if (settings.roblox_proofs_channel_id) {
    const proofsCh = await guild.channels.fetch(settings.roblox_proofs_channel_id).catch(() => null);
    if (proofsCh?.isTextBased()) {
      const member = await guild.members.fetch(ticket.user_id).catch(() => null);
      const proofEmbed = new EmbedBuilder()
        .setTitle("✅ Nueva compra — Ceitus Roblox External (PayPal)")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Comprador", value: member ? `${member}` : `<@${ticket.user_id}>`, inline: true },
          { name: "Plan",      value: plan?.labelEs ?? ticket.plan,                   inline: true },
          { name: "Monto",     value: `$${data.mc_gross ?? "?"} ${data.mc_currency ?? "USD"}`, inline: true },
          { name: "Ref",       value: `\`${ref}\``, inline: true }
        )
        .setTimestamp();
      await proofsCh.send({ embeds: [proofEmbed] }).catch(() => {});
    }
  }

  // Alerta de stock bajo
  const stock = getAvailableResources(guild.id).find((r) => r.resource === RESOURCE)?.stock ?? 0;
  if (stock <= 2 && settings.stock_keys_channel_id) {
    const stockCh = await guild.channels.fetch(settings.stock_keys_channel_id).catch(() => null);
    if (stockCh?.isTextBased()) {
      await stockCh.send(
        stock === 0
          ? `🚨 **${RESOURCE}** sin stock. Cargá más keys con \`/stock cargar\`.`
          : `⚠️ Stock bajo de **${RESOURCE}**: quedan **${stock}**.`
      ).catch(() => {});
    }
  }

  // Email anti-chargeback al comprador
  const payerEmail = data.payer_email;
  if (payerEmail) {
    sendRobloxPurchaseEmail(payerEmail, {
      keyValue: key.key_value,
      planLabel: plan ? `${plan.labelEs} (${plan.days} días)` : ticket.plan,
      ref,
      days: plan?.days ?? null
    }).catch((e) => console.error("[paypal-ipn] fallo envio de mail:", e.message));
  }

  console.log(`[paypal-ipn] Key entregada para ref=${ref} a user=${ticket.user_id}`);
}

function startIpnServer() {
  const port = parseInt(process.env.ROBLOX_IPN_PORT ?? "3001", 10);

  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/paypal-ipn") {
      res.writeHead(404);
      return res.end();
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", async () => {
      res.writeHead(200);
      res.end(); // PayPal exige 200 rápido

      try {
        const result = await verifyIpn(body);
        if (result !== "VERIFIED") {
          console.warn("[paypal-ipn] IPN no verificado:", result);
          return;
        }
        const data = parseBody(body);
        if (data.payment_status !== "Completed") return;
        await handleVerifiedPayment(data);
      } catch (e) {
        console.error("[paypal-ipn] Error procesando IPN:", e.message);
      }
    });
  });

  server.listen(port, () => {
    console.log(`[paypal-ipn] Servidor IPN escuchando en puerto ${port} — /paypal-ipn`);
  });

  server.on("error", (e) => {
    console.error("[paypal-ipn] Error en servidor IPN:", e.message);
  });
}

module.exports = { startIpnServer, setClient };
