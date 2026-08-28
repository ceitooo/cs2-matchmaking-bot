const express = require("express");
const { db } = require("../db/database");
const { completeVerification } = require("./verifyActions");

const PORT = process.env.STEAM_AUTH_PORT || 3000;
const BASE_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const CLIENT_ID = process.env.CLIENT_ID;

function extractSteamId64(claimedId) {
  const match = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/.exec(claimedId);
  return match ? match[1] : null;
}

function getVerifyStartUrl() {
  return `${BASE_URL}/auth/start`;
}

function startSteamAuthServer(client) {
  const app = express();

  // Paso 1: el botón del panel apunta aquí directamente (link estático, sin mensajes intermedios)
  app.get("/auth/start", (req, res) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${BASE_URL}/auth/discord/callback`,
      response_type: "token",
      scope: "identify"
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  // Paso 2: Discord nos manda el access_token en el fragmento (#), que solo el navegador puede leer.
  // Esta página usa JS para leerlo, identificar al usuario, y continuar hacia Steam.
  app.get("/auth/discord/callback", (req, res) => {
    res.send(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 60px; background:#1b1e24; color:#fff;">
        <h2>Conectando con Discord...</h2>
        <script>
          const hash = new URLSearchParams(window.location.hash.slice(1));
          const token = hash.get("access_token");
          if (!token) {
            document.body.innerHTML = "<h2>No se pudo autenticar con Discord. Vuelve a intentarlo desde el servidor.</h2>";
          } else {
            fetch("https://discord.com/api/users/@me", { headers: { Authorization: "Bearer " + token } })
              .then((r) => r.json())
              .then((user) => {
                window.location.href = "/auth/steam/start?discord_id=" + encodeURIComponent(user.id);
              })
              .catch(() => {
                document.body.innerHTML = "<h2>No se pudo verificar tu cuenta de Discord.</h2>";
              });
          }
        </script>
      </body></html>
    `);
  });

  // Paso 3: ya sabemos qué usuario de Discord es, ahora lo mandamos a loguearse con Steam
  app.get("/auth/steam/start", (req, res) => {
    const discordId = req.query.discord_id;
    if (!discordId || !/^\d{5,25}$/.test(discordId)) {
      return res.status(400).send("Solicitud inválida.");
    }

    const params = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": `${BASE_URL}/auth/steam/callback?discord_id=${discordId}`,
      "openid.realm": BASE_URL,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select"
    });

    res.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
  });

  // Paso 4: Steam confirma la identidad, vinculamos y disparamos las acciones (rol, apodo, etc.)
  app.get("/auth/steam/callback", async (req, res) => {
    const discordUserId = req.query.discord_id;
    if (!discordUserId) {
      return res.status(400).send("Enlace inválido o expirado. Vuelve a presionar el botón en Discord.");
    }

    const verifyParams = new URLSearchParams(req.query);
    verifyParams.delete("discord_id");
    verifyParams.set("openid.mode", "check_authentication");

    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString()
    });
    const verifyText = await verifyRes.text();

    if (!verifyText.includes("is_valid:true")) {
      return res.status(400).send("No se pudo verificar tu identidad de Steam.");
    }

    const steamId = extractSteamId64(req.query["openid.claimed_id"]);
    if (!steamId) {
      return res.status(400).send("No se pudo leer tu Steam ID.");
    }

    db.prepare("UPDATE players SET steam_id = ? WHERE user_id = ?").run(steamId, discordUserId);

    res.send(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 60px; background:#1b1e24; color:#fff;">
        <h1>✅ Cuenta de Steam vinculada</h1>
        <p>Ya puedes volver a Discord.</p>
      </body></html>
    `);

    completeVerification(client, discordUserId, steamId).catch((err) => console.error("Error post-verificación:", err));
  });

  app.listen(PORT, () => {
    console.log(`Servidor de autenticación Steam escuchando en el puerto ${PORT}`);
  });
}

module.exports = { startSteamAuthServer, getVerifyStartUrl };
