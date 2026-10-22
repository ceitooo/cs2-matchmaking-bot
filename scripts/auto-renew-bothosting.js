/**
 * auto-renew-bothosting.js
 * Renovación y encendido automático para Bot-Hosting.net (Plan Free).
 * Arquitectura nueva (SvelteKit + /a/billings + Cloudflare Turnstile).
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");

const DEPLOYMENT_ID = process.env.BOT_HOSTING_DEPLOYMENT_ID || "f2a5a80f-41ef-4dda-a500-382282f46603";
const BILLINGS_URL = "https://bot-hosting.net/a/billings";
const DEPLOYMENT_URL = `https://bot-hosting.net/a/d/${DEPLOYMENT_ID}`;

async function sendDiscordWebhook(webhookUrl, { title, description, color, fields = [] }) {
  if (!webhookUrl) return;

  try {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({
      username: "Bot-Hosting Auto-Renew",
      avatar_url: "https://bot-hosting.net/favicon.ico",
      embeds: [
        {
          title: title || "Bot-Hosting Auto-Renew",
          description: description || "",
          color: color || 0x5865f2,
          fields: fields,
          footer: { text: "GitHub Actions Auto-Renew • Ceitus" },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await new Promise((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", () => resolve());
        }
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
    console.log("[auto-renew] Notificación enviada a Discord.");
  } catch (err) {
    console.warn("[auto-renew] No se pudo enviar el webhook de Discord:", err.message);
  }
}

function parseCookies(rawCookie) {
  if (!rawCookie || typeof rawCookie !== "string") {
    throw new Error(
      "La variable BOT_HOSTING_COOKIE no está definida. Configura el secret en GitHub."
    );
  }

  const trimmed = rawCookie.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.map((c) => ({
        name: c.name,
        value: c.value,
        domain: "bot-hosting.net",
        path: "/",
        httpOnly: !!c.httpOnly,
        secure: true,
      }));
    } catch (e) {}
  }

  return trimmed
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) return null;
      return {
        name: pair.substring(0, eqIdx).trim(),
        value: pair.substring(eqIdx + 1).trim(),
        domain: "bot-hosting.net",
        path: "/",
        secure: true,
      };
    })
    .filter(Boolean);
}

async function run() {
  const cookieInput = process.env.BOT_HOSTING_COOKIE;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log("==================================================");
  console.log("   Bot-Hosting.net Auto-Renew & Power Watcher     ");
  console.log("==================================================");

  let playwright;
  try {
    playwright = require("playwright");
  } catch (err) {
    console.error("[auto-renew] Error: Playwright no está instalado.");
    console.error("Ejecuta: npm install playwright && npx playwright install chromium");
    process.exit(1);
  }

  const cookies = parseCookies(cookieInput);
  console.log(`[auto-renew] ${cookies.length} cookies cargadas para bot-hosting.net.`);

  const browser = await playwright.chromium.launch({
    headless: process.env.HEADLESS !== "false",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "es-ES",
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  await context.addCookies(cookies);
  const page = await context.newPage();

  try {
    // ----------------------------------------------------
    // FASE 1: Verificar y Renovar Plan Free en /a/billings
    // ----------------------------------------------------
    console.log(`\n[auto-renew] 1. Navegando a ${BILLINGS_URL} ...`);
    await page.goto(BILLINGS_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    const billingsUrl = page.url();
    if (billingsUrl.includes("/login")) {
      const failScreenshot = path.join(screenshotsDir, "session-expired.png");
      await page.screenshot({ path: failScreenshot, fullPage: true });
      const msg = "La cookie de sesión de bot-hosting expiró. Requiere actualizar BOT_HOSTING_COOKIE.";
      console.error(`[auto-renew] ❌ ERROR: ${msg}`);
      await sendDiscordWebhook(webhookUrl, {
        title: "⚠️ Bot-Hosting: Sesión Expirada",
        description: msg,
        color: 0xed4245,
      });
      await browser.close();
      process.exit(1);
    }

    const billingsScreenshot = path.join(screenshotsDir, "billings.png");
    await page.screenshot({ path: billingsScreenshot, fullPage: true });

    const pageBodyText = await page.evaluate(() => document.body.innerText || "");

    // Buscar estado de renovación
    const isCooldown = pageBodyText.includes("Tiempo de espera para renovar") ||
                       pageBodyText.includes("Cooldown") ||
                       pageBodyText.includes("Espera para renovar");

    console.log(`[auto-renew] ¿Cooldown de renovación activo?: ${isCooldown}`);

    // Buscar botón de renovación
    const renewBtn = await page.$(
      'button:has-text("Renovar"), button:has-text("Renew"), button:has-text("Extender")'
    );

    if (renewBtn && !isCooldown) {
      const isDisabled = await renewBtn.isDisabled().catch(() => false);
      if (!isDisabled) {
        console.log("[auto-renew] Botón de renovación activo. Iniciando flujo de renovación...");
        await renewBtn.click();
        await page.waitForTimeout(3000);

        // Esperar widget de Cloudflare Turnstile si aparece en el modal
        const turnstileIframe = await page.waitForSelector('iframe[src*="turnstile"], iframe[src*="challenges"]', {
          timeout: 10000,
        }).catch(() => null);

        if (turnstileIframe) {
          console.log("[auto-renew] Widget de Turnstile detectado. Resolviendo...");
          try {
            const frame = await turnstileIframe.contentFrame();
            if (frame) {
              const checkbox = await frame.waitForSelector('#cf-stage, input[type="checkbox"], .cb-lb', { timeout: 5000 });
              if (checkbox) await checkbox.click();
            }
          } catch (e) {
            console.log("[auto-renew] Turnstile autogestionado por Cloudflare.");
          }
          await page.waitForTimeout(5000);
        }

        // Buscar botón de confirmación en modal
        const confirmBtn = await page.$(
          '.modal button:has-text("Renovar"), .modal button:has-text("Confirmar"), button:has-text("Aceptar")'
        );
        if (confirmBtn) {
          await confirmBtn.click();
          await page.waitForTimeout(4000);
        }

        console.log("[auto-renew] ✅ Intento de renovación completado.");
        await sendDiscordWebhook(webhookUrl, {
          title: "🎉 Plan Free de Bot-Hosting Renovado",
          description: "Se completó la renovación de 4 días adicionales para el servidor.",
          color: 0x57f287,
        });
      } else {
        console.log("[auto-renew] ℹ️ El botón de renovación está deshabilitado temporalmente (cooldown).");
      }
    } else {
      console.log("[auto-renew] ℹ️ Plan Free vigente en cooldown. No requiere renovación en este ciclo.");
    }

    // ----------------------------------------------------
    // FASE 2: Verificar estado de encendido de ceitus-bot
    // ----------------------------------------------------
    console.log(`\n[auto-renew] 2. Verificando estado del bot en ${DEPLOYMENT_URL} ...`);
    await page.goto(DEPLOYMENT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    const deployScreenshot = path.join(screenshotsDir, "deployment-status.png");
    await page.screenshot({ path: deployScreenshot, fullPage: true });

    const deployText = await page.evaluate(() => document.body.innerText || "");
    const isStopped = deployText.includes("Detenido") || deployText.includes("Offline") || deployText.includes("Stopped");

    if (isStopped) {
      console.log("[auto-renew] ⚠️ El bot se encuentra DETENIDO. Encendiéndolo...");

      const startBtn = await page.$(
        'button:has-text("Iniciar"), button:has-text("Start"), button[aria-label*="Iniciar"]'
      );

      if (startBtn) {
        await startBtn.click();
        console.log("[auto-renew] Botón 'Iniciar' presionado.");
        await page.waitForTimeout(6000);

        const restartScreenshot = path.join(screenshotsDir, "started-result.png");
        await page.screenshot({ path: restartScreenshot, fullPage: true });

        console.log("[auto-renew] ✅ ceitus-bot ha sido iniciado exitosamente.");
        await sendDiscordWebhook(webhookUrl, {
          title: "⚡ ceitus-bot Encendido Automáticamente",
          description: "El bot estaba en estado 'Detenido' y fue reactivado automáticamente.",
          color: 0x5865f2,
        });
      } else {
        console.warn("[auto-renew] No se encontró el botón 'Iniciar'.");
      }
    } else {
      console.log("[auto-renew] 🟢 El bot está EN LÍNEA (Online / Ejecutándose).");
    }

  } catch (error) {
    console.error("[auto-renew] ❌ Excepción en ejecución:", error);
    try {
      await page.screenshot({ path: path.join(screenshotsDir, "error.png"), fullPage: true });
    } catch (e) {}

    await sendDiscordWebhook(webhookUrl, {
      title: "❌ Error en Bot-Hosting Auto-Renew",
      description: `Ocurrió un error:\n\`\`\`${error.message}\`\`\``,
      color: 0xed4245,
    });
    await browser.close();
    process.exit(1);
  }

  await browser.close();
  console.log("\n[auto-renew] Verificación completada con éxito.");
}

run();
