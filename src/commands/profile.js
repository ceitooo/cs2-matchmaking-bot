const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const MAX_SIZE = 4096;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Muestra el avatar o banner de un usuario en la máxima resolución")
    .addStringOption((opt) =>
      opt
        .setName("tipo")
        .setDescription("Qué querés ver")
        .setRequired(true)
        .addChoices({ name: "Avatar", value: "avatar" }, { name: "Banner", value: "banner" })
    )
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a consultar (por defecto vos)").setRequired(false)),

  async execute(interaction) {
    const targetOption = interaction.options.getUser("usuario") ?? interaction.user;
    const tipo = interaction.options.getString("tipo", true);

    await interaction.deferReply();

    const user = await interaction.client.users.fetch(targetOption.id, { force: true }).catch(() => targetOption);

    if (tipo === "avatar") {
      const url = user.displayAvatarURL({ size: MAX_SIZE, extension: user.avatar?.startsWith("a_") ? "gif" : "png" });
      const embed = new EmbedBuilder().setColor(0xe91e8c).setTitle(`Avatar de ${user.username}`).setImage(url);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Descargar / ver original").setStyle(ButtonStyle.Link).setURL(url).setEmoji("⬇️")
      );
      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    if (!user.banner) {
      const hasAccentColor = typeof user.accentColor === "number";
      return interaction.editReply({
        content: hasAccentColor
          ? `${user.username} no tiene banner de imagen, solo un color de perfil (\`#${user.accentColor.toString(16).padStart(6, "0")}\`).`
          : `${user.username} no tiene banner configurado.`
      });
    }

    const url = user.bannerURL({ size: MAX_SIZE, extension: user.banner?.startsWith("a_") ? "gif" : "png" });
    const embed = new EmbedBuilder().setColor(0xe91e8c).setTitle(`Banner de ${user.username}`).setImage(url);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Descargar / ver original").setStyle(ButtonStyle.Link).setURL(url).setEmoji("⬇️")
    );
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};
