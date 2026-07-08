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
    status:  p.activa ? 'Aprobado' : 'Inactivo',
    updated: formatearFecha(p.fecha_creacion),
    uses:    p.usos || 0,
    color:   tc.color,
    bg:      tc.bg,
    tipo_contrato: p.tipo_contrato,
    software_id:   p.software_id,
    modo_origen:   p.modo_origen,
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

export const TEMPLATE_VACIO = { nombre: '', tipo_contrato: 'PLAZO_FIJO', version_codigo: '', software_id: '', modo_origen: 'archivo', archivo_docx: null, clausulas_seleccionadas: [] };

