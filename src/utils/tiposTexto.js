// Tipos de texto de la biblioteca legal — espejo de TipoTextoClausula (backend).
// CLAUSULA es el cuerpo legal tradicional; el resto son textos de apoyo
// (saludos, introducciones, despedidas, cierres, firmas) para armar documentos
// completos sin redactar desde cero.

export const TIPOS_TEXTO = [
  { value: 'CLAUSULA', label: 'Cláusula' },
  { value: 'SALUDO', label: 'Saludo / Apertura' },
  { value: 'INTRODUCCION', label: 'Introducción / Preámbulo' },
  { value: 'DESPEDIDA', label: 'Despedida' },
  { value: 'CIERRE', label: 'Cierre legal' },
  { value: 'FIRMA', label: 'Bloque de firmas' },
  { value: 'OTRO', label: 'Otro texto útil' },
];

const LABELS = Object.fromEntries(TIPOS_TEXTO.map(t => [t.value, t.label]));

export function labelTipoTexto(tipo) {
  return LABELS[tipo] || LABELS.CLAUSULA;
}

// Tipos que abren y cierran un documento profesional (mismos que el backend
// usa en plantillas/services/sugerencias.py).
export const TIPOS_APERTURA = ['SALUDO', 'INTRODUCCION'];
export const TIPOS_CIERRE = ['DESPEDIDA', 'CIERRE', 'FIRMA'];
