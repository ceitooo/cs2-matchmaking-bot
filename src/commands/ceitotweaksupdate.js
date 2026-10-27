const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isStaffOrCeito } = require("../utils/permissions");

// Anuncia la última versión de CeitoTweaks con la descripción de su release
// en GitHub: después de publicar no hay que escribir nada a mano.
const LISTA = "https://api.github.com/repos/ceitooo/ceitotweaks/releases";
const RELEASE = `${LISTA}/latest`;
const PAGINA = "https://ceitotweaks.com/";
// #updates-ceitotweaks y #general, por ID: los nombres cambian con los emojis y
// los separadores, y con nombres el anuncio dejó de encontrar los canales.
const CANALES = ["1544100598495060023", "1473614742701736009"];
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

// Lo que trae cada release de GitHub, en el formato del anuncio.
function armarEmbed(release) {
  let texto = aDiscord(release.body || "Mejoras y correcciones varias.");
  const pie = `\n\n${PAGINA}`;
  // Un embed admite 4096 caracteres: si no entra, se corta y se manda a la release.
  if (texto.length + pie.length > 4096) {
    const resto = `\n\n… [ver todos los cambios](${release.html_url})`;
    texto = texto.slice(0, 4096 - pie.length - resto.length).replace(/\n[^\n]*$/, "") + resto;
  }
  return new EmbedBuilder()
    .setTitle(`🆕 CeitoTweaks ${release.tag_name}`)
    .setURL(release.html_url)
    .setColor(COLOR)
    .setDescription(texto + pie)
    .setTimestamp(new Date(release.published_at || Date.now()));
}

async function pedirGitHub(url) {
  const r = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "ceitus-bot" },
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  return r.json();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ceitotweaksupdate")
    .setDescription("Anuncia la última versión de CeitoTweaks con sus cambios (solo staff o ceito)")
    .addBooleanOption((o) =>
      o.setName("repetir").setDescription("Mandarla aunque esa versión ya se haya anunciado")
    )
    .addStringOption((o) =>
      o.setName("desde").setDescription("Última versión que ya está en el canal (ej. v1.17.15): manda todas las que siguen, en orden")
    ),

  async execute(interaction) {
    if (!isStaffOrCeito(interaction)) {
      return interaction.reply({ content: "❌ No tienes permiso para usar este comando.", flags: 64 });
    }
    await interaction.deferReply({ flags: 64 });

    const desde = (interaction.options.getString("desde") || "").trim();
    let releases;
    try {
      if (desde) {
        const tag = desde.startsWith("v") ? desde : `v${desde}`;
        const todas = (await pedirGitHub(`${LISTA}?per_page=100`))
          .filter((r) => !r.draft && !r.prerelease)
          .sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
        const i = todas.findIndex((r) => r.tag_name === tag);
        if (i < 0) return interaction.editReply(`❌ No encuentro la versión **${tag}** en GitHub.`);
        releases = todas.slice(i + 1);
        if (!releases.length) return interaction.editReply(`ℹ️ No hay versiones después de **${tag}**.`);
      } else {
        releases = [await pedirGitHub(RELEASE)];
      }
    } catch (e) {
      return interaction.editReply(`❌ No pude leer las versiones de GitHub: ${e.message}`);
    }

    const ultima = releases[releases.length - 1];
    if (!desde && leerAnunciada() === ultima.tag_name && !interaction.options.getBoolean("repetir")) {
      return interaction.editReply(`ℹ️ **${ultima.tag_name}** ya se anunció. Usá \`repetir: True\` para mandarla de nuevo.`);
    }

    const roles = ROLES.map((n) => interaction.guild.roles.cache.find((r) => r.name === n)).filter(Boolean);
    const canales = [];
    const fallas = [];
    for (const id of CANALES) {
      const canal = await interaction.guild.channels.fetch(id).catch(() => null);
      if (canal && canal.isTextBased()) canales.push(canal);
      else fallas.push(`<#${id}>: no lo encuentro`);
    }

    // Las versiones viejas van solo al canal de updates y sin mencionar a nadie;
    // la última va a todos los canales con las menciones, como siempre.
    const enviados = new Set();
    for (const release of releases) {
      const esUltima = release === ultima;
      for (const canal of esUltima ? canales : canales.slice(0, 1)) {
        const error = await canal
          .send({
            content: esUltima ? roles.join(" ") || undefined : undefined,
            embeds: [armarEmbed(release)],
            allowedMentions: { roles: esUltima ? roles.map((r) => r.id) : [] }
          })
          .then(() => null)
          .catch((e) => e.message);
        if (error) fallas.push(`${canal} (${release.tag_name}): ${error}`);
        else enviados.add(`${canal}`);
      }
    }
    if (!enviados.size) return interaction.editReply(`❌ No pude mandar el anuncio a ningún canal.\n${fallas.join("\n")}`);

    try {
      fs.writeFileSync(ANUNCIADA, JSON.stringify({ tag: ultima.tag_name, fecha: new Date().toISOString() }));
    } catch {
      // Si no se puede guardar, solo se pierde el aviso de "ya se anunció".
    }
    const cuales = releases.length > 1 ? `${releases.length} versiones (hasta **${ultima.tag_name}**)` : `**CeitoTweaks ${ultima.tag_name}**`;
    const aviso = fallas.length ? `\n⚠️ ${fallas.join("\n⚠️ ")}` : "";
    return interaction.editReply(`✅ ${cuales} anunciada${releases.length > 1 ? "s" : ""} en ${[...enviados].join(" y ")}.${aviso}`);
  }
};
