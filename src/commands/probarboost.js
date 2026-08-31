const { SlashCommandBuilder } = require("discord.js");
const { getGuildSettings } = require("../db/database");
const { buildBoostMessage } = require("../utils/boostBuilder");
const { isStaffOrCeito } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder().setName("probarboost").setDescription("Prueba el mensaje de boost configurado, sin boostear de verdad"),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }

    const settings = getGuildSettings(interaction.guild.id);

    if (!settings.boost_channel_id) {
      return interaction.reply({ content: "❌ No hay `boost_channel_id` guardado. Corré `/boost canal` primero.", flags: 64 });
    }

    const channel = await interaction.guild.channels.fetch(settings.boost_channel_id).catch((e) => {
      console.error("[probarboost] fetch falló:", e.message);
      return null;
    });

    if (!channel) {
      return interaction.reply({
        content: `❌ Tengo guardado el canal \`${settings.boost_channel_id}\` pero no lo pude encontrar (¿se borró o recreó?). Volvé a correr \`/boost canal\`.`,
        flags: 64
      });
    }

    const sent = await channel.send(buildBoostMessage(interaction.member, interaction.guild, settings)).catch((e) => {
      console.error("[probarboost] send falló:", e.message);
      return null;
    });

    if (!sent) {
      return interaction.reply({ content: `❌ Encontré el canal ${channel} pero no pude mandar el mensaje (revisá permisos del bot ahí).`, flags: 64 });
    }

    return interaction.reply({ content: `✅ Mensaje de prueba mandado en ${channel}.`, flags: 64 });
  }
};
