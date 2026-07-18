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
    // Solo 401 (sesión inválida/expirada) fuerza logout. Un 403 significa
    // "autenticado pero sin permiso sobre esto" (rol, plan, cliente no
    // concedido...) — tratarlo como logout expulsaba a roles restringidos
    // (Trabajador, Auditor) cada vez que tocaban algo fuera de su alcance.
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    let errMsg = `HTTP ${res.status}`;
    let fields = null;
    let errData = null;
    try {
      const err = await res.json();
      errData = err;
      if (err && typeof err === 'object') {
        // Excepción al criterio de arriba: el 403 CLIENTE_BLOQUEADO significa
        // que la cuenta del cliente fue bloqueada — su sesión ya no sirve.
        if (res.status === 403 && err.code === 'CLIENTE_BLOQUEADO') {
          window.dispatchEvent(new CustomEvent('auth:logout', {
            detail: { reason: 'CLIENTE_BLOQUEADO', message: err.error },
          }));
        }
        errMsg = err.error || err.detail || errMsg;
        // Errores de validación DRF por campo: { campo: ['msg'] | 'msg', ... }
        fields = {};
        for (const [k, v] of Object.entries(err)) {
          if (k === 'error' || k === 'detail') continue;
          fields[k] = Array.isArray(v) ? v.join(' ') : String(v);
        }
        if (Object.keys(fields).length === 0) fields = null;
        if (!err.error && !err.detail && fields) {
          errMsg = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(' · ');
        }
      }
    } catch (_) {}
    const error = new Error(errMsg);
    error.status = res.status;
    if (fields) error.fields = fields;
    if (errData) error.data = errData;
    throw error;
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
 * Activa la cuenta de portal de un cliente: valida uid+token del enlace del
 * correo de bienvenida y fija la contraseña en el mismo paso.
 */
export async function apiRegisterCliente({ uid, token, password }) {
  return request('/auth/register-cliente/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, password }),
  });
}

/**
 * Solicita el correo de restablecimiento de contraseña.
 * Acepta usuario o correo; la respuesta es genérica exista o no la cuenta.
 */
export async function apiPasswordReset({ identifier }) {
  return request('/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

/**
 * Confirma el restablecimiento: uid + token del enlace del correo + nueva contraseña.
 */
export async function apiPasswordResetConfirm({ uid, token, password }) {
  return request('/auth/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, password }),
  });
}

/**
 * Cierra sesión en el backend.
 */
export async function apiLogout() {
  return request('/auth/logout/', { method: 'POST' });
}

/**
 * Verifica si hay una sesión Django activa.
 * @returns {{ username: string, is_staff: boolean }}
 * @throws {Error} con status 401 si no hay sesión (o expiró).
 */
export async function apiMe() {
  return request('/auth/me/');
}

// ─── Tenants ─────────────────────────────────────────────────────────────────

export async function getTenants() {
  return request('/tenants/');
}

export async function createTenant(data) {
  return request('/tenants/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Usuarios (vista global de plataforma) ────────────────────────────────────

/**
 * Lista paginada de TODAS las cuentas de la plataforma (staff global,
 * usuarios de cualquier tenant y clientes externos).
 *
 * @param {Object} params
 * @param {string} params.search       - Texto libre (usuario, correo, nombre, empresa)
 * @param {string} params.tipo_cuenta  - 'TODOS' | 'PLATAFORMA' | 'EMPRESA' | 'CLIENTE'
 * @param {string} params.estado       - 'TODOS' | 'ACTIVO' | 'INACTIVO'
 * @param {string} params.ordering     - 'username' | '-username' | 'date_joined' | '-date_joined'
 * @param {number} params.page
 * @param {number} params.page_size
 *
 * @returns {{ count, page, page_size, total_pages, stats, results }}
 */
export async function getUsuariosPlataforma(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)                             qs.set('search', params.search);
  if (params.tipo_cuenta && params.tipo_cuenta !== 'TODOS') qs.set('tipo_cuenta', params.tipo_cuenta);
  if (params.estado && params.estado !== 'TODOS') qs.set('estado', params.estado);
  if (params.tenant_id)                           qs.set('tenant_id', params.tenant_id);
  if (params.ordering)                           qs.set('ordering', params.ordering);
  if (params.page)                                qs.set('page', params.page);
  if (params.page_size)                           qs.set('page_size', params.page_size);

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/tenants/usuarios/todos/${query}`);
}

export async function updateUsuarioPlataforma(id, data) {
  return request(`/tenants/usuarios/todos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteUsuarioPlataforma(id) {
  return request(`/tenants/usuarios/todos/${id}/`, { method: 'DELETE' });
}

/**
 * Envía al usuario el correo de "restablecer contraseña" (mismo flujo que
 * /recuperar), disparado por un Administrador/Moderador desde /usuarios.
 */
export async function resetPasswordUsuarioPlataforma(id) {
  return request(`/tenants/usuarios/todos/${id}/reset-password/`, { method: 'POST' });
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

/**
 * Importa cláusulas desde un archivo Excel (.xls/.xlsx).
 * @param {File} file
 */
export async function importClausulasExcel(file) {
  const formData = new FormData();
  formData.append('archivo', file);
  return request('/documentos/importar/clausulas/excel/', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Descarga las cláusulas en formato Excel (.xlsx).
 */
export async function exportClausulas() {
  const res = await fetch(`${BASE}/documentos/exportar/clausulas/excel/`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Error al exportar cláusulas');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `clausulas_export.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Contratos ────────────────────────────────────────────────────────────────

/**
 * Lista paginada de contratos con datos reales.
 * @param {Object} params
 * @param {string} [params.search]   - Texto libre (ID, cliente, software)
 * @param {string} [params.etapa]    - Valor de EtapaContrato o 'Todos'
 * @param {number} [params.software] - ID del software
 * @param {number} [params.cliente]  - ID del cliente (todos sus contratos)
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 */
export async function getContratos(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)                            qs.set('search', params.search);
  if (params.etapa && params.etapa !== 'Todos')  qs.set('etapa', params.etapa);
  if (params.software)                           qs.set('software', params.software);
  if (params.cliente)                            qs.set('cliente', params.cliente);
  if (params.ordering)                           qs.set('ordering', params.ordering);
  if (params.page)                               qs.set('page', params.page);
  if (params.page_size)                          qs.set('page_size', params.page_size);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/contratos/${query}`);
}

/**
 * KPIs para el StatsStrip de Contratos.
 * @param {Object} [params]
 * @param {number} [params.cliente] - Acota los KPIs a un cliente (Vista activa)
 */
export async function getContratoStats(params = {}) {
  const qs = new URLSearchParams();
  if (params.cliente) qs.set('cliente', params.cliente);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/contratos/stats/${query}`);
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

/** Sincroniza un contrato con un procesador externo (Word/Google Docs) o cambia el estado del bloqueo. */
export async function syncExternalContract(id, data) {
  return request(`/contratos/${id}/external-sync/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Administra el sobre de firma electrónica (DocuSign, Adobe, OTP) */
export async function manageSignature(id, data) {
  return request(`/contratos/${id}/firma/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Info pública del magic-link de firma OTP (token del enlace del correo,
 * sin sesión — la visita la contraparte externa).
 */
export async function apiFirmaTokenInfo(token) {
  return request(`/contratos/firmar/${encodeURIComponent(token)}/`);
}

/**
 * Confirma la firma desde el magic-link público. A diferencia del resto de
 * la API, la respuesta exitosa es el PDF final (Blob), no JSON — para que
 * el firmante externo se lleve su copia en el momento.
 */
export async function apiFirmaTokenConfirmar(token) {
  const res = await fetch(`${BASE}/contratos/firmar/${encodeURIComponent(token)}/confirmar/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.error || errMsg;
    } catch (_) {}
    const error = new Error(errMsg);
    error.status = res.status;
    throw error;
  }
  return res.blob();
}

/** Obtiene el estado de sincronización externa del contrato. */
export async function getExternalSyncStatus(id) {
  return request(`/contratos/${id}/external-sync/`);
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

/**
 * SLA técnico "N/A" del tenant (se crea una vez y se reutiliza). Para
 * contratos de plantillas administrativas (NDA, memorándums, fichas de
 * requerimientos) que no tienen nivel de servicio ni facturación real.
 */
export async function getSlaNA() {
  return request('/slas/na/');
}

// ─── Generación de documentos ──────────────────────────────────────────────────

/**
 * Genera el documento base de un contrato desde su plantilla activa.
 * @param {Object} data - { contrato_id, plantilla_id?, forzar?, campos? }
 */
export async function generarDocumentoContrato(data) {
  return request('/plantillas/documentos/generar/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Campos manuales que pide una plantilla HTML (ej. PARA/DE/ASUNTO de un
 * memorándum), para mostrarlos en un formulario antes de generar el
 * documento. Vacío si la plantilla no es HTML.
 * @param {Object} params
 * @param {number} [params.contratoId] - resuelve la plantilla activa de ese contrato si no se pasa plantillaId
 * @param {number} [params.plantillaId] - consulta directa a una plantilla ya elegida (no requiere contrato)
 * @returns {{plantilla_id: number, campos: Array<{nombre, label, default, multilinea}>}}
 */
export async function getCamposPlantilla({ contratoId, plantillaId } = {}) {
  const qs = new URLSearchParams();
  if (contratoId) qs.set('contrato_id', contratoId);
  if (plantillaId) qs.set('plantilla_id', plantillaId);
  return request(`/plantillas/documentos/campos/?${qs.toString()}`);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * KPIs, series históricas (6 meses) y contratos por vencer para la vista general.
 * @param {Object} [params]
 * @param {number} [params.cliente] - Acota las métricas a un cliente (Vista activa)
 * @returns {{ kpis, chart_area, chart_bar, urgent_contracts }}
 */
export async function getDashboard(params = {}) {
  const qs = new URLSearchParams();
  if (params.cliente) qs.set('cliente', params.cliente);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/dashboard/${query}`);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Métricas históricas y de composición de cartera para la vista /analytics.
 * @returns {{ kpis, flujo_contratos, vencimientos, por_software, top_clientes, por_tipo, por_sla }}
 */
export async function getAnalytics() {
  return request('/analytics/');
}

// ─── Plantillas ───────────────────────────────────────────────────────────────

/**
 * Obtiene las plantillas HTML disponibles en el backend.
 * Cada elemento es { ruta, nombre, tipo } — tipo null = plantilla global.
 *
 * @param {string} [tipoContrato] - Filtra por tipo (RECURRENTE, PERPETUO,
 *                                  PRO_BONO, INTERNO); incluye siempre las globales.
 * @returns {Array<{ruta: string, nombre: string, tipo: string|null}>}
 */
export async function getAvailableHtmlTemplates(tipoContrato) {
  const qs = tipoContrato ? `?tipo_contrato=${encodeURIComponent(tipoContrato)}` : '';
  return request(`/plantillas/plantillas/html-templates/${qs}`);
}

/**
 * Lista de plantillas de documentos registradas en el catálogo.
 *
 * @param {Object} params
 * @param {string}  [params.tipo_contrato]  - 'RECURRENTE' | 'PERPETUO' | 'PRO_BONO' | 'INTERNO'
 * @param {number}  [params.software]       - ID del software (filtra plantillas de ese producto)
 * @param {boolean} [params.incluir_globales] - Junto a `software`, incluye también las plantillas
 *                                              globales (sin software), que el motor usa como fallback
 * @param {boolean} [params.activa]         - Filtrar por activa/inactiva
 * @param {string}  [params.modo_origen]    - 'archivo' | 'clausulas'
 * @param {string}  [params.codigo_prefijo] - Familia de documento (ej. NDA) — trae todas sus versiones
 *
 * @returns {Array<{id, nombre, tipo_contrato, tipo_contrato_display, software_id, software_nombre,
 *                  modo_origen, modo_origen_display, version_codigo, codigo_prefijo, activa,
 *                  fecha_creacion, usos}>}
 */
export async function getPlantillas(params = {}) {
  const qs = new URLSearchParams();
  if (params.tipo_contrato) qs.set('tipo_contrato', params.tipo_contrato);
  if (params.software)      qs.set('software',      params.software);
  if (params.incluir_globales) qs.set('incluir_globales', 'true');
  if (params.activa !== undefined) qs.set('activa', params.activa ? 'true' : 'false');
  if (params.modo_origen)   qs.set('modo_origen',   params.modo_origen);
  if (params.codigo_prefijo) qs.set('codigo_prefijo', params.codigo_prefijo);
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
 * Fuerza la regeneración de la vista previa de una plantilla.
 */
export async function regenerarPreviewPlantilla(id) {
  return request(`/plantillas/plantillas/${id}/regenerar-preview/`, { method: 'POST' });
}

/**
 * Contratos que usan esta versión de plantilla (uno por contrato, con la
 * fecha de su generación más reciente).
 * @param {number} id
 * @returns {{ plantilla_id, plantilla_nombre, plantilla_version, total_contratos,
 *             results: Array<{contrato_id, contrato_display, nombre, cliente_id,
 *             cliente_nombre, software_id, software_nombre, etapa, etapa_display,
 *             status, monto, fecha_ultima_generacion, total_generaciones}> }}
 */
export async function getPlantillaContratos(id) {
  return request(`/plantillas/plantillas/${id}/contratos/`);
}

/**
 * Activa o desactiva una plantilla.
 * @param {number}  id
 * @param {boolean} activa
 * @param {boolean} [confirmar] - Confirma reemplazar la versión activa actual de la misma
 *                                combinación tipo_contrato/software (backend responde 409 sin esto).
 */
export async function togglePlantillaActiva(id, activa, confirmar = false) {
  return request(`/plantillas/plantillas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ activa, confirmar }),
  });
}

/**
 * Elimina una versión de plantilla. El backend responde 409 si la versión
 * generó documentos (registro inmutable): en ese caso solo puede archivarse.
 * @param {number} id
 */
export async function deletePlantilla(id) {
  return request(`/plantillas/plantillas/${id}/`, {
    method: 'DELETE',
  });
}

/**
 * Actualiza una plantilla existente.
 * @param {number} id
 * @param {FormData|Object} formDataOrData
 */
export async function updatePlantilla(id, formDataOrData) {
  const isFormData = formDataOrData instanceof FormData;
  return request(`/plantillas/plantillas/${id}/`, {
    method: 'PATCH',
    body: isFormData ? formDataOrData : JSON.stringify(formDataOrData),
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
export async function getClausulas(tipo) {
  const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  return request(`/plantillas/clausulas/${qs}`);
}

/**
 * Índice compacto de la biblioteca agrupado por tipo de texto (una sola
 * consulta en el backend, sin cuerpos completos).
 *
 * @returns {{total, tipos: Array<{tipo, label, items}>}}
 */
/**
 * PDF efímero del documento con los campos actuales (vista previa en vivo del
 * borrador). No persiste nada ni consume correlativo. Devuelve un Blob para
 * embeber vía URL.createObjectURL. Solo plantillas HTML (422 en otros modos).
 */
export async function previewBorradorPdf(contratoId, campos, clausulas) {
  const body = { contrato_id: contratoId, campos: campos || {} };
  // Solo se envían si el editor de cláusulas está abierto: el backend las
  // aplica al contrato en memoria (sin guardar) para renderizar el borrador.
  if (clausulas !== undefined) body.clausulas = clausulas;
  const res = await fetch(`${BASE}/plantillas/documentos/preview-borrador/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.error || err.detail || msg;
    } catch (_) {}
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return res.blob();
}

export async function getClausulasIndice(tipo) {
  const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  return request(`/plantillas/clausulas/indice/${qs}`);
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
 * Obtiene el detalle de un producto/tarifa por su ID.
 * @param {number|string} id
 */
export async function getProducto(id) {
  return request(`/catalogo/productos/${id}/`);
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

// ─── Legal / Auditoria ─────────────────────────────────────────────────────────

/**
 * Obtiene las métricas de compliance y logs de auditoría para la vista de Auditoría Legal.
 * @returns {{ kpis, riskDistribution, criticalContracts, auditLogs }}
 */
export async function getAuditoria() {
  return request('/legal/auditoria/');
}

/**
 * Obtiene el último análisis de la IA para un contrato.
 */
export async function getAnalisisIA(contratoId) {
  return request(`/legal/contratos/${contratoId}/analisis-ia/`);
}

/**
 * Ejecuta un nuevo análisis de la IA sobre el contrato.
 */
export async function runAnalisisIA(contratoId) {
  return request(`/legal/contratos/${contratoId}/analisis-ia/analizar/`, {
    method: 'POST',
  });
}


// ─── Incidencias ───────────────────────────────────────────────────────────────

/**
 * Lista paginada de incidencias, scoped por rol (CLIENTE ve solo las suyas).
 * @param {Object} params
 * @param {string} [params.search]
 * @param {string} [params.estado]     - ABIERTO | EN_PROGRESO | RESUELTO | CERRADO
 * @param {string} [params.severidad]  - BAJA | MEDIA | ALTA | CRITICA
 * @param {number} [params.contrato]
 * @param {number} [params.asignado_a]
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 */
export async function getIncidencias(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)      qs.set('search', params.search);
  if (params.estado)      qs.set('estado', params.estado);
  if (params.severidad)   qs.set('severidad', params.severidad);
  if (params.contrato)    qs.set('contrato', params.contrato);
  if (params.asignado_a)  qs.set('asignado_a', params.asignado_a);
  if (params.page)        qs.set('page', params.page);
  if (params.page_size)   qs.set('page_size', params.page_size);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/incidencias/${query}`);
}

/** Agregados de incidencias (solo staff) para badge/header de la bandeja. */
export async function getIncidenciaStats() {
  return request('/incidencias/stats/');
}

/** Detalle completo de una incidencia: comentarios, historial, adjuntos, SLA. */
export async function getIncidenciaDetail(id) {
  return request(`/incidencias/${id}/`);
}

/**
 * Crea una incidencia. Siempre FormData (soporta adjuntos incluso sin archivos).
 * @param {FormData} formData - titulo, descripcion, severidad, contrato_id?, software_id?,
 *                               cliente_id (solo si el autor es staff reportando en nombre de otro), adjuntos[]
 */
export async function createIncidencia(formData) {
  return request('/incidencias/', {
    method: 'POST',
    body: formData,
  });
}

/** Cambiar estado/asignado_a/severidad (requiere staff interno). */
export async function updateIncidencia(id, data) {
  return request(`/incidencias/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Lista de comentarios de una incidencia. */
export async function getComentariosIncidencia(incidenciaId) {
  return request(`/incidencias/${incidenciaId}/comentarios/`);
}

/**
 * Agrega un comentario/respuesta. Siempre FormData (soporta adjuntos).
 * @param {number} incidenciaId
 * @param {FormData} formData - mensaje, es_interno? (solo staff), adjuntos[]
 */
export async function createComentarioIncidencia(incidenciaId, formData) {
  return request(`/incidencias/${incidenciaId}/comentarios/`, {
    method: 'POST',
    body: formData,
  });
}

// ─── Workspace de cliente ──────────────────────────────────────────────────────

/**
 * Payload agregado del workspace: perfil, contratos, incidencias,
 * usuarios_cuenta (solo staff/tenant), membresía y actividad.
 */
export async function getClienteWorkspace(id) {
  return request(`/clientes/${id}/workspace/`);
}

/**
 * Timeline derivado de facturación (solo lectura): eventos desde contratos y
 * perdonazos — no son pagos confirmados.
 */
export async function getClienteTimelinePagos(id) {
  return request(`/clientes/${id}/timeline-pagos/`);
}

/** Historial de correos enviados al cliente (incluye intentos fallidos). */
export async function getCorreosCliente(id) {
  return request(`/clientes/${id}/correos/`);
}

/** Obtiene los archivos que pueden ser adjuntados a un correo para este cliente. */
export async function getArchivosAdjuntables(id) {
  return request(`/clientes/${id}/archivos-adjuntables/`);
}


/**
 * Envía un correo al cliente y lo registra en el historial.
 * @param {Object} data - { asunto, cuerpo, destinatario? }
 */
export async function enviarCorreoCliente(id, data) {
  return request(`/clientes/${id}/enviar-correo/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Notificaciones ────────────────────────────────────────────────────────────

/**
 * Lista de notificaciones dentro del alcance del usuario.
 * @param {Object} params - { cliente?, solo_no_leidas?, limit?, para_staff? }
 */
export async function getNotificaciones(params = {}) {
  const qs = new URLSearchParams();
  if (params.cliente)        qs.set('cliente', params.cliente);
  if (params.solo_no_leidas) qs.set('solo_no_leidas', '1');
  if (params.limit)          qs.set('limit', params.limit);
  if (params.para_staff)     qs.set('para_staff', '1');
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/notificaciones/${query}`);
}

/**
 * Crea una notificación in-app para un cliente (solo staff/tenant).
 * @param {Object} data - { cliente_id, titulo, cuerpo, tipo? INFO|AVISO|URGENTE }
 */
export async function createNotificacion(data) {
  return request('/notificaciones/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Marca una notificación como leída. */
export async function marcarNotificacionLeida(id) {
  return request(`/notificaciones/${id}/leer/`, { method: 'POST' });
}

/** Marca todas las notificaciones del alcance como leídas. */
export async function marcarNotificacionesLeidas() {
  return request('/notificaciones/leer-todas/', { method: 'POST' });
}

/** Conteo de no leídas para el badge de la campana. */
export async function getNotificacionesUnreadCount(params = {}) {
  const query = new URLSearchParams();
  if (params.para_staff) query.append('para_staff', 1);
  return request(`/notificaciones/unread-count/?${query.toString()}`);
}

// ─── Toma de Requerimientos ─────────────────────────────────────────────────

/**
 * Lista de Requerimientos, filtrable por cliente o contrato.
 * @param {Object} params - { cliente?, contrato? }
 */
export async function getRequerimientos(params = {}) {
  const qs = new URLSearchParams();
  if (params.cliente)  qs.set('cliente', params.cliente);
  if (params.contrato) qs.set('contrato', params.contrato);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/requerimientos/${query}`);
}

/** Detalle de un Requerimiento (incluye la plantilla de preguntas usada). */
export async function getRequerimientoDetail(id) {
  return request(`/requerimientos/${id}/`);
}

/**
 * Crea un Requerimiento nuevo.
 * @param {Object} data - { cliente_id, contrato_id?, categoria_producto? }
 */
export async function createRequerimiento(data) {
  return request('/requerimientos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Guarda (parcialmente) las respuestas de un Requerimiento en BORRADOR. */
export async function updateRequerimientoRespuestas(id, respuestas) {
  return request(`/requerimientos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ respuestas }),
  });
}

/** Plantilla de preguntas activa para una categoría de Producto. */
export async function getPlantillaRequerimientoActiva(categoria) {
  return request(`/requerimientos/plantillas/?categoria=${encodeURIComponent(categoria)}`);
}

/**
 * Genera el documento (docx+pdf) final de un Requerimiento.
 * @param {number} id
 * @param {Object} [opts] - { forzar? }
 */
export async function generarRequerimientoDocumento(id, opts = {}) {
  return request(`/requerimientos/${id}/generar/`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

// ─── Comentarios Contrato ──────────────────────────────────────────────────
export async function getComentariosContrato(contratoId) {
  return request(`/contratos/${contratoId}/comentarios/`);
}

export async function createComentarioContrato(contratoId, payload) {
  return request(`/contratos/${contratoId}/comentarios/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteComentario(comentarioId) {
  return request(`/comentarios/${comentarioId}/`, {
    method: 'DELETE',
  });
}
