const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getGuildSettings } = require("../db/database");

module.exports = {
  data: new SlashCommandBuilder().setName("seguridadinfo").setDescription("Explica qué hace cada nivel de seguridad anti-estafa"),

  async execute(interaction) {
    const settings = getGuildSettings(interaction.guildId);
    const actual = settings?.security_level ?? "medio";

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🛡️ Niveles de seguridad")
      .setDescription(`Nivel actual de este server: **${actual}**\n\nEsto se configura con \`/seguridad nivel\` (solo Ceito/Developer).`)
      .addFields(
        {
          name: "🟢 Básico",
          value:
            "Solo borra mensajes que linkeen un dominio de la lista negra (`/seguridad dominio agregar`). No revisa cuentas nuevas ni combina otras señales. El más permisivo."
        },
        {
          name: "🟡 Medio (recomendado)",
          value:
            "Todo lo de Básico, **más**: si una cuenta con menos de **1 mes de creada** (o que se unió al server hace menos de **24 horas**) manda un link junto con una imagen, el mensaje se borra, se le pone un warn y se lo silencia 10 minutos. Es el patrón típico de los bots de estafa (casino cripto, nitro falso, etc.)."
        },
        {
          name: "🔴 Estricto",
          value:
            "Todo lo de Medio, pero mucho más agresivo: cualquier cuenta con menos de **5 años de creada** (o que se unió hace menos de **7 días**) que mande link + imagen se elimina y se silencia 30 minutos. Prácticamente nadie con cuenta \"nueva\" se salva — bloquea muchísimo más, pero también puede afectar a miembros legítimos con cuentas recientes que compartan una captura."
        }
      )
      .setFooter({ text: "Siempre queda un log en el canal configurado con /seguridad canal-logs para que el staff revise." });

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
