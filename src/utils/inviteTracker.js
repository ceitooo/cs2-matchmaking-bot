// Cache en memoria: guildId -> Map(code -> { uses, inviterId })
const cache = new Map();

async function primeGuildInvites(guild) {
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return;

  const map = new Map();
  for (const invite of invites.values()) {
    map.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviter?.id ?? null });
  }
  cache.set(guild.id, map);
}

async function primeAllGuilds(client) {
  for (const guild of client.guilds.cache.values()) {
    await primeGuildInvites(guild).catch(() => {});
  }
}

/**
 * Compara el estado actual de invitaciones contra el cache para detectar cuál se usó.
 * Devuelve { inviterId, code } o null si no se pudo determinar (ej. vanity URL).
 */
async function resolveInviter(guild) {
  const before = cache.get(guild.id) ?? new Map();
  const invitesAfter = await guild.invites.fetch().catch(() => null);
  if (!invitesAfter) return null;

  const after = new Map();
  let result = null;

  for (const invite of invitesAfter.values()) {
    after.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviter?.id ?? null });

    const prev = before.get(invite.code);
    const prevUses = prev?.uses ?? 0;
    if ((invite.uses ?? 0) > prevUses) {
      result = { inviterId: invite.inviter?.id ?? null, code: invite.code };
    }
  }

  // Detecta invitaciones nuevas que ya vinieron con uses=1 (creadas y usadas casi al mismo tiempo)
  if (!result) {
    for (const invite of invitesAfter.values()) {
      if (!before.has(invite.code) && (invite.uses ?? 0) > 0) {
        result = { inviterId: invite.inviter?.id ?? null, code: invite.code };
        break;
      }
    }
  }

  cache.set(guild.id, after);
  return result;
}

module.exports = { primeGuildInvites, primeAllGuilds, resolveInviter };
