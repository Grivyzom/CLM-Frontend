// Helpers puros compartidos por las vistas del Catálogo (sin JSX).

export const TIPO_COLOR = {
  RECURRENTE:    { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
  PERPETUO:      { color: 'var(--primary)', bg: 'var(--primary-bg)' },
  PRO_BONO:      { color: 'var(--violet-bright)', bg: 'var(--violet-tint)' },
  INTERNO:       { color: 'var(--warning-bright)', bg: 'var(--warning-tint)' },
  REQUERIMIENTO: { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
  ERS:           { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
};

export const TIPO_CAT = {
  RECURRENTE:    'Comercial',
  PERPETUO:      'Comercial',
  PRO_BONO:      'Legal',
  INTERNO:       'Operaciones',
  REQUERIMIENTO: 'Técnico',
  ERS:           'Técnico',
};

export function derivarAbbr(nombre) {
  // Toma las primeras letras de las palabras principales (excluye artículos)
  const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'e',
                        'para', 'con', 'por', 'a', 'en', 'un', 'una']);
  const words = nombre.split(/\s+/).filter(w => !stop.has(w.toLowerCase()));
  const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return initials || nombre.substring(0, 3).toUpperCase();
}

export function formatearFecha(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export function normalizeApiPlantilla(p) {
  const tc = TIPO_COLOR[p.tipo_contrato] || TIPO_COLOR.RECURRENTE;
  return {
    id:      p.id,
    tenant_id: p.tenant_id,
    tenant_nombre: p.tenant_nombre,
    name:    p.nombre,
    abbr:    derivarAbbr(p.nombre),
    cat:     TIPO_CAT[p.tipo_contrato] || 'General',
    version: p.version_codigo,
    vars:    null,   // el backend no expone conteo de variables por ahora
    // Borrador = nunca confirmada (eliminable); Aprobado = confirmada y activa;
    // Inactivo = confirmada pero archivada (solo reactivable, no eliminable).
    status:  p.confirmada === false ? 'Borrador' : (p.activa ? 'Aprobado' : 'Inactivo'),
    updated: formatearFecha(p.fecha_creacion),
    uses:    p.usos || 0,
    color:   tc.color,
    bg:      tc.bg,
    tipo_contrato: p.tipo_contrato,
    software_id:   p.software_id,
    modo_origen:   p.modo_origen,
    ruta_plantilla_html: p.ruta_plantilla_html,
    requiere_sla_facturacion: p.requiere_sla_facturacion !== false,
    _raw: p,
  };
}

export function getTagStyles(tipo) {
  if (tipo === 'Estándar') return { tagColor: 'var(--success-deep)', tagBg: 'var(--success-bg)' };
  if (tipo === 'Alternativa') return { tagColor: 'var(--warning)', tagBg: 'var(--warning-bg)' };
  return { tagColor: 'var(--violet)', tagBg: 'var(--violet-bg)' };
}

export const PRODUCTO_CATEGORIAS = ['Bot', 'Agente', 'Script', 'Software', 'Auditoría', 'Consultoría'];

// ─── Monedas ─────────────────────────────────────────────────────────────────

/** Monedas soportadas de primera clase en el selector de precio. */
export const MONEDAS = [
  { code: 'CLP', label: 'Peso chileno', symbol: '$',   locale: 'es-CL', decimals: 0 },
  { code: 'USD', label: 'Dólar EE.UU.', symbol: 'US$', locale: 'en-US', decimals: 2 },
  { code: 'EUR', label: 'Euro',         symbol: '€',   locale: 'de-DE', decimals: 2 },
];

export const MONEDA_POR_CODIGO = Object.fromEntries(MONEDAS.map(m => [m.code, m]));

/**
 * Tasas de referencia expresadas como "cuántas unidades de la moneda equivalen
 * a 1 USD". Sirven para convertir el monto al cambiar de divisa y para mostrar
 * equivalencias aproximadas: NO son un tipo de cambio en vivo, el valor
 * contractual siempre es el monto en la moneda seleccionada.
 */
export const TASAS_REFERENCIA_USD = { USD: 1, CLP: 950, EUR: 0.92 };

/** Fecha de referencia de las tasas anteriores (para mostrarla en la UI). */
export const TASAS_REFERENCIA_FECHA = '2026-07-01';

export function esMonedaConocida(code) {
  return !!TASAS_REFERENCIA_USD[String(code || '').toUpperCase()];
}

/**
 * Convierte un monto entre dos monedas con las tasas de referencia.
 * Devuelve null si alguna moneda no está tarifada o el monto no es numérico.
 */
export function convertirMonto(monto, desde, hacia) {
  const n = Number(monto);
  if (!Number.isFinite(n)) return null;
  const from = TASAS_REFERENCIA_USD[String(desde || '').toUpperCase()];
  const to = TASAS_REFERENCIA_USD[String(hacia || '').toUpperCase()];
  if (!from || !to) return null;
  return (n / from) * to;
}

/** Redondeo apropiado a la moneda destino (CLP no usa decimales). */
export function redondearAMoneda(monto, code) {
  const n = Number(monto);
  if (!Number.isFinite(n)) return n;
  const dec = MONEDA_POR_CODIGO[String(code || '').toUpperCase()]?.decimals ?? 2;
  const factor = 10 ** dec;
  return Math.round(n * factor) / factor;
}

/**
 * Formatea un monto en su moneda. Con monedas conocidas usa el formato local
 * (símbolo y decimales correctos); con divisas libres antepone el código.
 */
export function formatMoneda(monto, code, { conCodigo = false } = {}) {
  const n = Number(monto);
  if (!Number.isFinite(n)) return String(monto ?? '—');
  const cfg = MONEDA_POR_CODIGO[String(code || '').toUpperCase()];
  if (!cfg) {
    const base = n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return code ? `${code} ${base}` : `$${base}`;
  }
  const valor = n.toLocaleString(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  });
  return conCodigo ? `${cfg.symbol} ${valor} ${cfg.code}` : `${cfg.symbol} ${valor}`;
}

/** Formato compacto para la tabla: respeta la moneda del ítem. */
export function formatPrecio(price, currency) {
  return formatMoneda(price, currency);
}

// ─── Plataformas de software ────────────────────────────────────────────────

/** Etiqueta corta para mostrar en badges (el valor guardado es más verboso). */
export const PLATAFORMA_LABEL = {
  'App Web': 'Web',
  'App Android': 'Android',
  'App iOS': 'iOS',
  'App Multiplataforma': 'Híbrida',
  'Software Nativo PC': 'Windows',
  'Software Nativo Mac': 'macOS',
  'Servicio Backend': 'Backend / API',
  'Otro': 'Otro',
};

export const PRODUCTO_VACIO = { name: '', desc: '', cat: 'Software', tipo_licencia: 'Comercial', price: '', currency: 'CLP', unit: '', status: 'Activo', datos_adicionales: {}, tenant_id: '' };

export const TEMPLATE_VACIO = { nombre: '', tipo_contrato: 'RECURRENTE', version_codigo: '', software_id: '', modo_origen: 'archivo', archivo_docx: null, clausulas_seleccionadas: [], ruta_plantilla_html: '', codigo_prefijo: '', requiere_sla_facturacion: true, tenant_id: '', terminos_condiciones: null };

/**
 * Agrupa plantillas normalizadas (normalizeApiPlantilla) por familia de documento
 * (codigo_prefijo, ej. NDA) — cada familia trae todas sus versiones ordenadas de
 * más reciente a más antigua, y un "representante" (la versión activa, o si
 * ninguna está activa, la más reciente) para mostrar en la card del catálogo.
 */
export function groupPlantillasByFamilia(plantillas) {
  const mapa = new Map();
  for (const p of plantillas) {
    const clave = p._raw?.codigo_prefijo || p.name;
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(p);
  }

  const familias = [];
  for (const [prefijo, versiones] of mapa) {
    const ordenadas = [...versiones].sort(
      (a, b) => new Date(b._raw?.fecha_creacion || 0) - new Date(a._raw?.fecha_creacion || 0)
    );
    const representante = ordenadas.find(v => v.status === 'Aprobado') || ordenadas[0];
    familias.push({
      prefijo,
      representante,
      versiones: ordenadas,
      totalVersiones: ordenadas.length,
      totalUsos: ordenadas.reduce((acc, v) => acc + (v.uses || 0), 0),
      fechaUltima: ordenadas[0]._raw?.fecha_creacion,
    });
  }

  familias.sort((a, b) => new Date(b.fechaUltima || 0) - new Date(a.fechaUltima || 0));
  return familias;
}

