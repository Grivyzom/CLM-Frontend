/**
 * formatters.js — Funciones de formateo reutilizables en la aplicación.
 */

export function fmtMoney(n) {
  const num = Number(n);
  if (!num) return '—';
  return `$${num.toLocaleString('es-CL', { maximumFractionDigits: 0 })} USD`;
}

export function fmtDate(d) {
  if (!d) return '—';
  const datePart = String(d).split('T')[0];
  const [y, m, day] = datePart.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

export function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return fmtDate(d);
  return dt.toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function contratoIdDisplay(id) {
  return `CTR-${String(id).padStart(6, '0')}`;
}
