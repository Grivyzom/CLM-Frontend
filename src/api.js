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
  if (params.ordering)     qs.set('ordering',     params.ordering);
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

// ─── Contratos ────────────────────────────────────────────────────────────────

/**
 * Lista paginada de contratos con datos reales.
 * @param {Object} params
 * @param {string} [params.search]   - Texto libre (ID, cliente, software)
 * @param {string} [params.etapa]    - Valor de EtapaContrato o 'Todos'
 * @param {number} [params.software] - ID del software
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 */
export async function getContratos(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)                            qs.set('search', params.search);
  if (params.etapa && params.etapa !== 'Todos')  qs.set('etapa', params.etapa);
  if (params.software)                           qs.set('software', params.software);
  if (params.ordering)                           qs.set('ordering', params.ordering);
  if (params.page)                               qs.set('page', params.page);
  if (params.page_size)                          qs.set('page_size', params.page_size);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/contratos/${query}`);
}

/** KPIs para el StatsStrip de Contratos. */
export async function getContratoStats() {
  return request('/contratos/stats/');
}

/** Detalle completo de un contrato: historial, documentos, anexos, obligaciones SLA. */
export async function getContratoDetail(id) {
  return request(`/contratos/${id}/`);
}

/**
 * Crea un nuevo contrato (etapa BORRADOR).
 * @param {Object} data - { cliente_id, software_id, sla_id, tipo_contrato, monto,
 *                           fecha_inicio, fecha_vencimiento?, frecuencia_facturacion?,
 *                           dias_gracia_autorizados? }
 */
export async function createContrato(data) {
  return request('/contratos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Actualiza campos comerciales o transiciona de etapa (pasar `etapa` + `notas`). */
export async function updateContrato(id, data) {
  return request(`/contratos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Elimina un contrato (solo permitido en etapa Borrador). */
export async function deleteContrato(id) {
  return request(`/contratos/${id}/`, { method: 'DELETE' });
}

/** Obtiene la lista de obligaciones de un contrato. */
export async function getObligaciones(contratoId) {
  return request(`/contratos/${contratoId}/obligaciones/`);
}

/** Crea una nueva obligación para un contrato. */
export async function createObligacion(contratoId, data) {
  return request(`/contratos/${contratoId}/obligaciones/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Actualiza una obligación existente. */
export async function updateObligacion(id, data) {
  return request(`/obligaciones/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Elimina una obligación. */
export async function deleteObligacion(id) {
  return request(`/obligaciones/${id}/`, { method: 'DELETE' });
}

/** Obtiene el historial de auditoría de una obligación. */
export async function getObligacionHistorial(id) {
  return request(`/obligaciones/${id}/historial/`);
}

/** Enmienda un contrato y crea una nueva versión en Borrador. */
export async function enmendarContrato(id) {
  return request(`/contratos/${id}/enmendar/`, { method: 'POST' });
}

/**
 * Descarga contratos como Excel o CSV. Dos modos mutuamente excluyentes:
 * - `clienteId`: exporta TODOS los contratos vinculados a ese cliente.
 * - `search`: busca por nomenclatura estandarizada (ej. 'CTR-000041') o por
 *   nombre del contrato (software licenciado / tipo de contrato). No busca
 *   por cliente — para eso está `clienteId`.
 * Dispara la descarga en el navegador. Lanza Error si falla.
 * @param {'excel'|'csv'} format
 * @param {Object} params
 * @param {number} [params.clienteId]
 * @param {string} [params.search]
 * @param {number[]} [params.ids] - selección manual; ignora clienteId/search
 */
export async function exportContratos(format, { clienteId, search, ids } = {}) {
  const path = format === 'csv' ? 'csv' : 'excel';
  const qs = new URLSearchParams();
  if (ids && ids.length > 0) {
    qs.set('ids', ids.join(','));
  } else if (clienteId) {
    qs.set('cliente_id', clienteId);
  } else if (search) {
    qs.set('search', search);
  }
  const query = qs.toString() ? `?${qs.toString()}` : '';

  const res = await fetch(`${BASE}/documentos/exportar/contratos/${path}/${query}`, {
    credentials: 'include',
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
  const filename = match ? match[1] : (format === 'csv' ? 'contratos.csv' : 'contratos.xlsx');

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Catálogo: Software / SLA ─────────────────────────────────────────────────

/** Lista de software del catálogo (para selects). */
export async function getSoftwareList() {
  return request('/catalogo/software/');
}

/** Lista de SLA del catálogo (para selects y obligaciones de contrato). */
export async function getSLAs() {
  return request('/slas/');
}

// ─── Generación de documentos ──────────────────────────────────────────────────

/**
 * Genera el documento base de un contrato desde su plantilla activa.
 * @param {Object} data - { contrato_id, plantilla_id?, forzar? }
 */
export async function generarDocumentoContrato(data) {
  return request('/plantillas/documentos/generar/', {
    method: 'POST',
    body: JSON.stringify(data),
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

// ─── Plantillas ───────────────────────────────────────────────────────────────

/**
 * Lista de plantillas de documentos registradas en el catálogo.
 *
 * @param {Object} params
 * @param {string}  [params.tipo_contrato]  - 'RECURRENTE' | 'PERPETUO' | 'PRO_BONO' | 'INTERNO'
 * @param {number}  [params.software]       - ID del software (filtra plantillas de ese producto)
 * @param {boolean} [params.activa]         - Filtrar por activa/inactiva
 * @param {string}  [params.modo_origen]    - 'archivo' | 'clausulas'
 *
 * @returns {Array<{id, nombre, tipo_contrato, tipo_contrato_display, software_id, software_nombre,
 *                  modo_origen, modo_origen_display, version_codigo, activa, fecha_creacion, usos}>}
 */
export async function getPlantillas(params = {}) {
  const qs = new URLSearchParams();
  if (params.tipo_contrato) qs.set('tipo_contrato', params.tipo_contrato);
  if (params.software)      qs.set('software',      params.software);
  if (params.activa !== undefined) qs.set('activa', params.activa ? 'true' : 'false');
  if (params.modo_origen)   qs.set('modo_origen',   params.modo_origen);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/plantillas/plantillas/${query}`);
}

/**
 * Registra una nueva plantilla.
 * @param {FormData} formData
 */
export async function createPlantilla(formData) {
  return request('/plantillas/plantillas/', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Detalle de una plantilla por ID.
 * @param {number} id
 * @returns {{ id, nombre, tipo_contrato, software_id, version_codigo, activa, fecha_creacion }}
 */
export async function getPlantillaDetail(id) {
  return request(`/plantillas/plantillas/${id}/`);
}

/**
 * Activa o desactiva una plantilla.
 * @param {number}  id
 * @param {boolean} activa
 */
export async function togglePlantillaActiva(id, activa) {
  return request(`/plantillas/plantillas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ activa }),
  });
}

/**
 * Lista paginada de documentos emitidos (DocumentoGenerado — registros inmutables).
 *
 * @param {Object} params
 * @param {number}  [params.software_id]   - Filtrar por software del contrato
 * @param {number}  [params.cliente_id]    - Filtrar por cliente del contrato
 * @param {number}  [params.contrato_id]   - Filtrar por contrato específico
 * @param {string}  [params.fecha_desde]   - Fecha mínima de generación (YYYY-MM-DD)
 * @param {string}  [params.fecha_hasta]   - Fecha máxima de generación (YYYY-MM-DD)
 * @param {number}  [params.page]          - Página (default 1)
 * @param {number}  [params.page_size]     - Tamaño de página (default 20, max 100)
 *
 * @returns {{ count, page, page_size, total_pages, results: Array }}
 */
export async function getEmitidos(params = {}) {
  const qs = new URLSearchParams();
  if (params.software_id)  qs.set('software_id',  params.software_id);
  if (params.cliente_id)   qs.set('cliente_id',   params.cliente_id);
  if (params.contrato_id)  qs.set('contrato_id',  params.contrato_id);
  if (params.fecha_desde)  qs.set('fecha_desde',  params.fecha_desde);
  if (params.fecha_hasta)  qs.set('fecha_hasta',  params.fecha_hasta);
  if (params.page)         qs.set('page',         params.page);
  if (params.page_size)    qs.set('page_size',    params.page_size);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/plantillas/emitidos/${query}`);
}

// ─── Cláusulas ───────────────────────────────────────────────────────────────

/**
 * Lista de cláusulas registradas en el catálogo.
 *
 * @returns {Array<{id, cat, name, risk, versions}>}
 */
export async function getClausulas() {
  return request(`/plantillas/clausulas/`);
}

/**
 * Crea una nueva cláusula y sus versiones.
 */
export async function createClausula(data) {
  return request(`/plantillas/clausulas/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualiza una cláusula existente.
 */
export async function updateClausula(id, data) {
  return request(`/plantillas/clausulas/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Productos / Tarifas ──────────────────────────────────────────────────────

/**
 * Lista de productos del catálogo.
 * @param {Object} params
 * @param {string} params.search    - Texto libre (SKU o nombre)
 * @param {string} params.categoria - 'Todos' | 'Software' | 'Servicio' | 'Soporte' | 'Formación'
 * @returns {Array<{id, sku, name, desc, cat, price, currency, unit, status}>}
 */
export async function getProductos(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)    qs.set('search',    params.search);
  if (params.categoria && params.categoria !== 'Todos') qs.set('categoria', params.categoria);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/catalogo/productos/${query}`);
}

/**
 * Crea un nuevo producto/tarifa en el catálogo.
 * @param {Object} data - { sku, name, desc, cat, price, currency, unit, status }
 */
export async function createProducto(data) {
  return request(`/catalogo/productos/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualiza un producto/tarifa existente en el catálogo.
 */
export async function updateProducto(id, data) {
  return request(`/catalogo/productos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Elimina un producto/tarifa del catálogo.
 */
export async function deleteProducto(id) {
  return request(`/catalogo/productos/${id}/`, {
    method: 'DELETE',
  });
}

