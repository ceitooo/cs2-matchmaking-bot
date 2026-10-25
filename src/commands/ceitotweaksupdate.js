const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

// Anuncia la última versión de CeitoTweaks con la descripción de su release
// en GitHub: después de publicar no hay que escribir nada a mano.
const RELEASE = "https://api.github.com/repos/ceitooo/ceitotweaks/releases/latest";
const PAGINA = "https://ceitotweaks.com/";
// #ceitotweaks-updates y #🗣️┃general
const CANALES = [/^ceitotweaks-updates$/, /(^|┃)general$/];
const ROLES = ["CeitoTweaks", "User"];
const COLOR = 0x9b59b6;
const ANUNCIADA = path.join(__dirname, "..", "..", "data", "ceitotweaks-anunciada.json");

const EMOJIS = [
  [/ceitoclip|clip|grabaci/i, "🎬"],
  [/mando|stream/i, "🎮"],
  [/ceitoaim|aim/i, "🎯"],
  [/perfil|nivel/i, "👤"],
  [/descuento|oferta/i, "🏷️"],
  [/voz/i, "🎙️"],
  [/optimiz|rendimiento|tweak/i, "⚡"],
  [/men[uú]|interfaz|dise[nñ]o/i, "🎨"],
  [/m[aá]s|otros|arreglos|correcciones/i, "⚙️"]
];

// El Markdown de GitHub al estilo de los anuncios: el título (##) en negrita,
// cada sección (**Nombre** solo en su línea) con su emoji y las viñetas con •.
function aDiscord(body) {
  return body
    .replace(/\r/g, "")
    .split("\n")
    .map((linea) => {
      const titulo = linea.match(/^#{1,3}\s+(.*)$/);
      if (titulo) return `**${titulo[1].trim()}**`;
      const seccion = linea.match(/^\*\*([^*]+)\*\*\s*$/);
      if (seccion) {
        const emoji = (EMOJIS.find(([re]) => re.test(seccion[1])) || [null, "🔹"])[1];
        return `${emoji} **${seccion[1].trim()}**`;
      }
      return linea.replace(/^\s*[-*]\s+/, "• ");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function leerAnunciada() {
  try {
    return JSON.parse(fs.readFileSync(ANUNCIADA, "utf8")).tag;
  } catch {
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ceitotweaksupdate")
    .setDescription("Anuncia la última versión de CeitoTweaks con sus cambios (solo staff o ceito)")
    .addBooleanOption((o) =>
      o.setName("repetir").setDescription("Mandarla aunque esa versión ya se haya anunciado")
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }
    await interaction.deferReply({ flags: 64 });

    let release;
    try {
      const r = await fetch(RELEASE, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "ceitus-bot" },
        signal: AbortSignal.timeout(15000)
      });
      if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
      release = await r.json();
    } catch (e) {
      return interaction.editReply(`❌ No pude leer la última versión de GitHub: ${e.message}`);
    }

    const tag = release.tag_name;
    if (leerAnunciada() === tag && !interaction.options.getBoolean("repetir")) {
      return interaction.editReply(`ℹ️ **${tag}** ya se anunció. Usá \`repetir: True\` para mandarla de nuevo.`);
    }

    let texto = aDiscord(release.body || "Mejoras y correcciones varias.");
    const pie = `\n\n${PAGINA}`;
    // Un embed admite 4096 caracteres: si no entra, se corta y se manda a la release.
    if (texto.length + pie.length > 4096) {
      const resto = `\n\n… [ver todos los cambios](${release.html_url})`;
      texto = texto.slice(0, 4096 - pie.length - resto.length).replace(/\n[^\n]*$/, "") + resto;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🆕 CeitoTweaks ${tag}`)
      .setURL(release.html_url)
      .setColor(COLOR)
      .setDescription(texto + pie)
      .setTimestamp(new Date(release.published_at || Date.now()));

    const roles = ROLES.map((n) => interaction.guild.roles.cache.find((r) => r.name === n)).filter(Boolean);
    const enviados = [];
    for (const nombre of CANALES) {
      const canal = interaction.guild.channels.cache.find((c) => c.isTextBased() && nombre.test(c.name.toLowerCase()));
      if (!canal) continue;
      const ok = await canal
        .send({ content: roles.join(" ") || undefined, embeds: [embed], allowedMentions: { roles: roles.map((r) => r.id) } })
        .then(() => true)
        .catch(() => false);
      if (ok) enviados.push(`${canal}`);
    }
    if (!enviados.length) return interaction.editReply("❌ No pude mandar el anuncio a ningún canal.");

    try {
      fs.writeFileSync(ANUNCIADA, JSON.stringify({ tag, fecha: new Date().toISOString() }));
    } catch {
      // Si no se puede guardar, solo se pierde el aviso de "ya se anunció".
    }
    return interaction.editReply(`✅ **CeitoTweaks ${tag}** anunciada en ${enviados.join(" y ")}.`);
  }
};
