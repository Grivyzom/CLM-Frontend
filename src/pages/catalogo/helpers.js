// Helpers puros compartidos por las vistas del Catálogo (sin JSX).

export const TIPO_COLOR = {
  RECURRENTE: { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
  PERPETUO:   { color: 'var(--primary)', bg: 'var(--primary-bg)' },
  PRO_BONO:   { color: 'var(--violet-bright)', bg: 'var(--violet-tint)' },
  INTERNO:    { color: 'var(--warning-bright)', bg: 'var(--warning-tint)' },
};

export const TIPO_CAT = {
  RECURRENTE: 'Comercial',
  PERPETUO:   'Comercial',
  PRO_BONO:   'Legal',
  INTERNO:    'Operaciones',
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

export function formatPrecio(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return `$${n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const PRODUCTO_VACIO = { name: '', desc: '', cat: 'Software', tipo_licencia: 'Comercial', price: '', currency: 'USD', unit: '', status: 'Activo', datos_adicionales: {} };

export const TEMPLATE_VACIO = { nombre: '', tipo_contrato: 'RECURRENTE', version_codigo: '', software_id: '', modo_origen: 'archivo', archivo_docx: null, clausulas_seleccionadas: [], ruta_plantilla_html: '', codigo_prefijo: '', requiere_sla_facturacion: true };

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

