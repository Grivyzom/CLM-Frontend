/**
 * api.js — Cliente HTTP central para el backend Django
 * Usa fetch con credentials: 'include' para enviar la cookie de sesión.
 * El proxy de Vite redirige /api/* → http://localhost:12001/api/*
 */

const BASE = '/api';

/**
 * Obtiene el CSRF token desde las cookies (Django lo envía como csrftoken).
 */
function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * Wrapper base de fetch — adjunta credentials y CSRF automáticamente.
 */
async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(method !== 'GET' ? { 'X-CSRFToken': getCsrfToken() } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',   // Envía cookies de sesión Django
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.error || err.detail || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  // 204 No Content — sin cuerpo
  if (res.status === 204) return null;

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Login con usuario + contraseña (+ otp_token opcional para 2FA, remember para sesión persistente).
 */
export async function apiLogin({ username, password, otp_token, remember }) {
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password, ...(otp_token ? { otp_token } : {}), remember: !!remember }),
  });
}

/**
 * Cierra sesión en el backend.
 */
export async function apiLogout() {
  return request('/auth/logout/', { method: 'POST' });
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

/**
 * Lista paginada de clientes con soporte a filtros.
 *
 * @param {Object} params
 * @param {string}  params.search       - Texto libre
 * @param {string}  params.estado       - 'Todos' | 'Activo' | 'En revisión' | 'Inactivo'
 * @param {string}  params.tipo         - 'Todos' | 'juridica' | 'natural'
 * @param {string}  params.fecha_desde  - YYYY-MM-DD
 * @param {string}  params.fecha_hasta  - YYYY-MM-DD
 * @param {number}  params.page         - Página (default 1)
 * @param {number}  params.page_size    - Registros/página (default 20)
 *
 * @returns {{ count, page, page_size, total_pages, stats, results }}
 */
export async function getClientes(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)       qs.set('search',       params.search);
  if (params.estado && params.estado !== 'Todos') qs.set('estado', params.estado);
  if (params.tipo   && params.tipo   !== 'Todos') qs.set('tipo',   params.tipo);
  if (params.fecha_desde)  qs.set('fecha_desde',  params.fecha_desde);
  if (params.fecha_hasta)  qs.set('fecha_hasta',  params.fecha_hasta);
  if (params.page)         qs.set('page',         params.page);
  if (params.page_size)    qs.set('page_size',    params.page_size);

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/clientes/${query}`);
}

/**
 * Estadísticas globales de clientes (llamada liviana).
 * @returns {{ total, activos, en_revision, inactivos }}
 */
export async function getClientesStats() {
  return request('/clientes/stats/');
}

/**
 * Detalle de un cliente por ID.
 * @param {number} id
 */
export async function getClienteDetail(id) {
  return request(`/clientes/${id}/`);
}

/**
 * Crear nuevo cliente.
 * @param {Object} data - { tipo: 'natural'|'juridica', email_principal, telefono_contacto, ... }
 */
export async function createCliente(data) {
  return request('/clientes/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualizar cliente por ID (PATCH).
 * @param {number} id
 * @param {Object} data - Campos a actualizar
 */
export async function updateCliente(id, data) {
  return request(`/clientes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Cambiar estado (activo/inactivo) de un cliente.
 * @param {number} id
 * @param {boolean} isActive
 */
export async function updateClienteStatus(id, isActive) {
  return request(`/clientes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

/**
 * Eliminar cliente por ID.
 * @param {number} id
 */
export async function deleteCliente(id) {
  return request(`/clientes/${id}/`, {
    method: 'DELETE',
  });
}

// ─── Exportar / Importar clientes ─────────────────────────────────────────────

function buildClientesFilterQs(filters = {}) {
  const qs = new URLSearchParams();
  if (filters.search)                              qs.set('search', filters.search);
  if (filters.estado && filters.estado !== 'Todos') qs.set('estado', filters.estado);
  if (filters.tipo   && filters.tipo   !== 'Todos') qs.set('tipo', filters.tipo);
  if (filters.fecha_desde)                          qs.set('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta)                          qs.set('fecha_hasta', filters.fecha_hasta);
  return qs;
}

/**
 * Descarga el listado de clientes (respetando filtros activos) como Excel o CSV.
 * Dispara la descarga en el navegador. Lanza Error si falla (o DOMException 'AbortError' si se cancela).
 * @param {'excel'|'csv'} format
 * @param {Object} filters - mismos filtros que getClientes (search, estado, tipo, fecha_desde, fecha_hasta)
 * @param {Object} options
 * @param {number[]} [options.ids]   - si viene con elementos, exporta SOLO esos clientes (ignora filters)
 * @param {AbortSignal} [options.signal] - para cancelar la descarga en curso
 */
export async function exportClientes(format, filters = {}, options = {}) {
  const path = format === 'csv' ? 'csv' : 'excel';
  const qs = buildClientesFilterQs(filters);
  if (options.ids && options.ids.length > 0) {
    qs.set('ids', options.ids.join(','));
  }
  const query = qs.toString() ? `?${qs.toString()}` : '';

  const res = await fetch(`${BASE}/documentos/exportar/clientes/${path}/${query}`, {
    credentials: 'include',
    signal: options.signal,
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.error || err.detail || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : (format === 'csv' ? 'clientes.csv' : 'clientes.xlsx');

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Importa clientes desde un archivo Excel (.xls/.xlsx).
 * @param {File} file
 * @returns {{ creados: string[], actualizados: string[], errores: {fila:number, error:string}[] }}
 */
export async function importClientesExcel(file) {
  const formData = new FormData();
  formData.append('archivo', file);
  return request('/documentos/importar/clientes/excel/', {
    method: 'POST',
    body: formData,
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * KPIs, series históricas (6 meses) y contratos por vencer para la vista general.
 * @returns {{ kpis, chart_area, chart_bar, urgent_contracts }}
 */
export async function getDashboard() {
  return request('/dashboard/');
}
