# CS2 Matchmaking Bot

Bot de Discord para armar partidas 5v5 estilo CS2: cola, panel con botones, balanceo por ELO, canales de voz temporales y vinculación con Steam para evitar cuentas falsas.

## Configuración

### 1. Crear la app de Discord
1. Ve a https://discord.com/developers/applications → New Application
2. En **Bot**, crea el bot y copia el **Token**
3. En **OAuth2 → URL Generator**, marca `bot` y `applications.commands`, y permisos: Manage Channels, Manage Roles, Send Messages, Embed Links, Connect. Usa esa URL para invitarlo a tu server.
4. Copia el **Application ID** (Client ID) desde General Information.

### 2. Steam API Key
1. Entra a https://steamcommunity.com/dev/apikey (necesitas tener Steam Guard activo)
2. Registra un dominio (puede ser `localhost` para pruebas)
3. Copia la key

### 3. Variables de entorno
Copia `.env.example` a `.env` y rellena:

```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...          # id de tu servidor, para que los comandos aparezcan al instante
STEAM_API_KEY=...
STEAM_AUTH_PORT=3000
PUBLIC_URL=http://localhost:3000   # o tu túnel/dominio público
```

> `PUBLIC_URL` debe ser accesible desde el navegador del jugador para que Steam pueda redirigir de vuelta. En local puedes usar [ngrok](https://ngrok.com/): `ngrok http 3000` y poner esa URL https en `PUBLIC_URL`.

### 4. Instalar y correr

```bash
npm install
npm run deploy-commands
npm start
```

## Uso

- `/panel` (admin) — publica el panel de matchmaking con botones Unirse / Salir / Mis stats
- `/vincular-steam` — el jugador vincula su cuenta de Steam (requerido para poder unirse a la cola)
- `/stats [jugador]` — ELO, winrate y stats públicas de CS2 vía Steam
- `/resultado partida_id ganador` (admin) — confirma el ganador, ajusta ELO y borra los canales de la partida

## Cómo funciona

1. Los jugadores se vinculan una vez con Steam (login real, no falsificable).
2. Se unen a la cola desde el panel. Al llegar a 10 jugadores, el bot arma dos equipos balanceados por ELO, crea una categoría con 2 canales de voz privados + 1 canal de texto, y publica el resumen de la partida.
3. Juegan la partida en su servidor CS2 (asignación manual de servidor, esta versión no reserva servidores dedicados).
4. Un admin cierra la partida con `/resultado`, se recalcula el ELO de todos los jugadores y se limpian los canales temporales.

## Notas

- La base de datos es SQLite local (`data/matchmaking.db`), usando el módulo nativo `node:sqlite` (requiere Node 22.5+, sin compilación).
- El tamaño de cola (10 jugadores) se puede cambiar en `src/utils/matchmaking.js` (`QUEUE_SIZE`).
- Las stats de CS2 vía Steam Web API solo se muestran si el perfil del jugador es público.
