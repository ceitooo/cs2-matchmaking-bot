const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getOrCreatePlayer, getInviteCount, INVITES_PER_REWARD, db } = require("../db/database");

const REGION_ROLES = ["Argentina", "Brasil", "Perú", "Chile", "Paraguay", "Uruguay", "México", "Bolivia", "Europa", "América / EEUU", "Asia"];
const LANGUAGE_ROLES = ["Español", "Inglés", "Portugués", "Japonés", "Otro idioma"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Muestra tu perfil de comunidad (invitaciones, región, idioma, recordatorios)")
    .addUserOption((o) => o.setName("usuario").setDescription("Ver el perfil de otro usuario").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: "❌ No encontré a ese usuario en el server.", flags: 64 });
    }

    const player = getOrCreatePlayer(target.id, target.username);
    const uses = getInviteCount(interaction.guild.id, target.id);
    const faltan = uses % INVITES_PER_REWARD === 0 ? INVITES_PER_REWARD : INVITES_PER_REWARD - (uses % INVITES_PER_REWARD);

    const region = member.roles.cache.find((r) => REGION_ROLES.includes(r.name))?.name ?? "Sin definir";
    const language = member.roles.cache.find((r) => LANGUAGE_ROLES.includes(r.name))?.name ?? "Sin definir";

    const activeReminders = db
      .prepare("SELECT COUNT(*) as count FROM subscriptions WHERE guild_id = ? AND user_id = ? AND expires_at > ?")
      .get(interaction.guild.id, target.id, Date.now()).count;

    const embed = new EmbedBuilder()
      .setTitle(`👤 Perfil de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setColor(0x9b59b6)
      .addFields(
        { name: "En el server desde", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: "ELO", value: `${player.elo}`, inline: true },
        { name: "Invitaciones", value: `${uses} (faltan ${faltan} para el próximo premio)`, inline: true },
        { name: "Región", value: region, inline: true },
        { name: "Idioma", value: language, inline: true },
        { name: "Recordatorios activos", value: `${activeReminders}`, inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  }
};
