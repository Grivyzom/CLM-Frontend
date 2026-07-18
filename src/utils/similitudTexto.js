// Similitud entre títulos de cláusula (encabezado de plantilla HTML vs nombre
// de cláusula de biblioteca). Sirve para sugerir la cláusula que corresponde a
// cada sección "cuerpo_clausula_N" y advertir cuando la elegida no calza.

const STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'o', 'u', 'en', 'a', 'al',
  'un', 'una', 'por', 'para', 'con', 'sin', 'se', 'su', 'sus', 'que', 'este',
  'esta', 'presente', 'presentes',
  // Ordinales de cláusula: no aportan al significado del título.
  'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'septima',
  'octava', 'novena', 'decima', 'undecima', 'duodecima', 'decimotercera',
  'decimocuarta', 'decimoquinta', 'clausula',
]);

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Solape de tokens significativos ∈ [0, 1] relativo al título más corto.
 * "SEGUNDA: Otorgamiento de la Licencia" vs "Otorgamiento de Licencia" → 1.
 * "DÉCIMA: Confidencialidad" vs "Notificaciones entre las partes" → 0.
 */
export function similitudTitulos(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach(w => { if (tb.has(w)) inter += 1; });
  return inter / Math.min(ta.size, tb.size);
}

// Bajo este umbral, la cláusula elegida se considera ajena al encabezado.
export const UMBRAL_COINCIDENCIA = 0.34;
