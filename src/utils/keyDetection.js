// Ej: CEITUSROBLOX-ROJB-Q3DZ-61PE-5RU3 (prefijo del recurso + 4 bloques de 4
// caracteres). Sin \b al inicio/final a propósito: así también corta keys
// pegadas sin espacio entre ellas (el guion después del prefijo ya marca el
// límite).
const KEY_REGEX = /[A-Z][A-Z0-9]{1,19}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;

// Prefijos conocidos -> nombre de recurso "lindo" para mostrar. Si el
// prefijo de la key no está acá, se cae al comportamiento genérico
// (primera letra mayúscula, resto minúscula).
const RESOURCE_PREFIX_MAP = {
  CEITUSROBLOX: "Ceitus Roblox",
  CEITUSCS2: "Ceitus Counter Strike 2",
  DISNEYPREMIUM: "Disney Premium",
  NETFLIX: "Netflix",
  CEITOTWEAKS: "CeitoTweaks"
};

function resolveResourceName(rawPrefix) {
  const upper = rawPrefix.toUpperCase();
  if (RESOURCE_PREFIX_MAP[upper]) return RESOURCE_PREFIX_MAP[upper];
  return rawPrefix.charAt(0).toUpperCase() + rawPrefix.slice(1).toLowerCase();
}

// Extrae todas las keys de un texto sin importar cómo estén separadas
// (saltos de línea, comas, espacios, o pegadas una tras otra).
function extractKeys(text) {
  const matches = text.match(KEY_REGEX) || [];
  return [...new Set(matches.map((k) => k.trim().toUpperCase()))];
}

module.exports = { KEY_REGEX, RESOURCE_PREFIX_MAP, resolveResourceName, extractKeys };
