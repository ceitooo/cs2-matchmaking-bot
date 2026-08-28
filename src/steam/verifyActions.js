const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { db } = require("../db/database");
const { fetchSteamProfile } = require("../utils/steamStats");

const VERIFIED_ROLE_NAME = "✅ Steam Verificado";
const VERIFIED_ROLE_COLOR = 0x3498db;
const VERIFY_CHANNEL_NAME = "✅・verificar-steam";

async function getOrCreateVerifiedRole(guild) {
  let role = guild.roles.cache.find((r) => r.name === VERIFIED_ROLE_NAME);
  if (!role) {
    role = await guild.roles.create({
      name: VERIFIED_ROLE_NAME,
      color: VERIFIED_ROLE_COLOR,
      hoist: true,
      mentionable: false,
      reason: "Rol automático para jugadores con Steam vinculado"
    });
  }
  return role;
}

async function completeVerification(client, discordUserId, steamId) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const member = await guild.members.fetch(discordUserId).catch(() => null);
  if (!member) return;

  const profile = await fetchSteamProfile(steamId).catch(() => null);
  const steamName = profile?.personaname ?? null;

  if (steamName) {
    db.prepare("UPDATE players SET steam_name = ? WHERE user_id = ?").run(steamName, discordUserId);
    await member.setNickname(steamName, "Sincronizado con nombre de Steam").catch(() => {});
  }

  const role = await getOrCreateVerifiedRole(guild).catch(() => null);
  if (role) {
    await member.roles.add(role).catch(() => {});
  }

  const verifyChannel = guild.channels.cache.find((c) => c.name === VERIFY_CHANNEL_NAME);
  if (verifyChannel) {
    await verifyChannel.permissionOverwrites.edit(member.id, { ViewChannel: false }).catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setTitle("✅ Cuenta de Steam vinculada")
    .setColor(VERIFIED_ROLE_COLOR)
    .setDescription(
      `Tu cuenta ha sido verificada correctamente${steamName ? ` como **${steamName}**` : ""}.\n\n` +
      `- Se te asignó el rol **${VERIFIED_ROLE_NAME}**\n` +
      (steamName ? `- Tu apodo en el servidor se fijó a tu nombre de Steam\n` : "") +
      `- Ya puedes unirte a la cola de matchmaking`
    )
    .setThumbnail(profile?.avatarfull ?? null);

  await member.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { completeVerification, VERIFIED_ROLE_NAME };
