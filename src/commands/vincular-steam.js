const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getVerifyStartUrl } = require("../steam/server");

module.exports = {
  data: new SlashCommandBuilder().setName("vincular-steam").setDescription("Vincula tu cuenta de Steam a tu perfil del bot"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🔗 Vincula tu cuenta de Steam")
      .setColor(0x1b2838)
      .setDescription("Presiona el botón para iniciar sesión con Discord y Steam y confirmar tu identidad.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Vincular Steam").setStyle(ButtonStyle.Link).setURL(getVerifyStartUrl()).setEmoji("🔗")
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  }
};
