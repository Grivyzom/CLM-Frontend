import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { getUsuariosPlataforma, updateUsuarioPlataforma, deleteUsuarioPlataforma, resetPasswordUsuarioPlataforma, getTenants } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { fmtDate, fmtDateTime } from '../utils/formatters';
import TopbarActions from '../components/layout/TopbarActions';
import Pagination from '../components/ui/Pagination';
import SortableHeader from '../components/ui/SortableHeader';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatusBadge from '../components/ui/StatusBadge';
import ActionDropdown from '../components/ui/ActionDropdown';
import Toast from '../components/ui/Toast';
import Svg from '../components/ui/Svg';
import './Usuarios.css';

gsap.registerPlugin(useGSAP);

const PAGE_SIZE = 20;

const TIPO_CUENTA_FILTROS = ['TODOS', 'PLATAFORMA', 'EMPRESA', 'CLIENTE'];
const TIPO_CUENTA_LABEL = { TODOS: 'Todos', PLATAFORMA: 'Plataforma', EMPRESA: 'Empresa', CLIENTE: 'Cliente' };
const TIPO_CUENTA_META = {
  PLATAFORMA: { color: 'var(--violet-deep)', bg: 'var(--violet-tint)' },
  EMPRESA:    { color: 'var(--primary-deep)', bg: 'var(--primary-bg)' },
  CLIENTE:    { color: 'var(--cyan-deep)', bg: 'var(--cyan-tint)' },
};

const ESTADO_FILTROS = ['TODOS', 'ACTIVO', 'INACTIVO'];
const ESTADO_LABEL = { TODOS: 'Todos', ACTIVO: 'Activos', INACTIVO: 'Inactivos' };

const PLATFORM_ROLE_LABEL = { SUPERADMIN: 'Super Administrador', MODERADOR: 'Moderador', TRABAJADOR: 'Trabajador' };
const TENANT_ROLE_LABEL = { TENANT_ADMIN: 'Administrador de Cuenta', OPERADOR: 'Operador', AUDITOR: 'Auditor Legal', CLIENTE: 'Cliente Externo' };

const DORMANT_DAYS = 90;

// Nunca ingresó, o hace más de DORMANT_DAYS — cuenta candidata a revisar/depurar.
function esDormida(u) {
  if (!u.last_login) return true;
  const dias = (Date.now() - new Date(u.last_login).getTime()) / 86400000;
  return dias > DORMANT_DAYS;
}

const AVATAR_PALETTE = [
  { color: 'var(--primary)', bg: 'var(--primary-bg)' },
  { color: 'var(--cyan)', bg: 'var(--cyan-tint)' },
  { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
  { color: 'var(--violet-bright)', bg: 'var(--violet-tint)' },
  { color: 'var(--rose)', bg: 'var(--rose-tint)' },
  { color: 'var(--warning-bright)', bg: 'var(--warning-tint)' },
  { color: 'var(--sky)', bg: 'var(--sky-bg)' },
  { color: 'var(--teal)', bg: 'var(--teal-tint)' },
];

function getAvatar(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
  const idx = (name.charCodeAt(0) || 0) % AVATAR_PALETTE.length;
  return { initials: initials || '—', ...AVATAR_PALETTE[idx] };
}

function rolLabel(u) {
  if (u.tipo_cuenta === 'PLATAFORMA') return PLATFORM_ROLE_LABEL[u.platform_role] || u.platform_role || '—';
  return TENANT_ROLE_LABEL[u.role] || u.role || '—';
}

function nombreCompleto(u) {
  const nombre = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return nombre || '—';
}

// Moderador no gestiona pares ni superiores (Moderador/SuperAdmin de plataforma)
// — mismo candado que aplica el backend en PlatformUserDetailView.
function bloqueadoParaModerador(u, auth) {
  if (auth.user?.isSuperadmin) return false;
  return u.tipo_cuenta === 'PLATAFORMA' && (u.platform_role === 'SUPERADMIN' || u.platform_role === 'MODERADOR');
}

function SkeletonRow() {
  return (
    <tr className="us-skeleton-row">
      {[36, 140, 160, 190, 90, 120, 150, 80, 90].map((w, i) => (
        <td key={i}><div className="us-skeleton-bar" style={{ width: w }} /></td>
      ))}
    </tr>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const { user: authUser } = useAuth();
  const esUnoMismo = user.id === authUser?.id;
  const esPlataforma = user.tipo_cuenta === 'PLATAFORMA';

  const [form, setForm] = useState({
    email: user.email || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    role: user.role || '',
    platform_role: user.platform_role || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      };
      if (esPlataforma) {
        if (!esUnoMismo && form.platform_role !== user.platform_role) payload.platform_role = form.platform_role;
      } else if (form.role !== user.role) {
        payload.role = form.role;
      }
      if (form.password.trim()) payload.password = form.password.trim();

      const updated = await updateUsuarioPlataforma(user.id, payload);
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Error al guardar los cambios');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="us-modal-overlay" onClick={() => !saving && onClose()} />
      <div className="us-modal" role="dialog" aria-modal="true" aria-label="Editar usuario">
        <div className="us-modal-header">
          <div>
            <h2 className="us-modal-title">Editar usuario</h2>
            <p className="us-modal-subtitle">@{user.username}</p>
          </div>
          <button type="button" className="us-modal-close" onClick={() => !saving && onClose()} aria-label="Cerrar">
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-faint)" size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="us-modal-body">
            {error && (
              <div className="us-modal-error">
                <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={13} />
                {error}
              </div>
            )}

            <div className="us-field">
              <label className="us-label" htmlFor="us-email">Correo</label>
              <input id="us-email" className="us-input" type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="us-field-row">
              <div className="us-field">
                <label className="us-label" htmlFor="us-first-name">Nombre</label>
                <input id="us-first-name" className="us-input" type="text" value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="us-field">
                <label className="us-label" htmlFor="us-last-name">Apellido</label>
                <input id="us-last-name" className="us-input" type="text" value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>

            {esPlataforma ? (
              <div className="us-field">
                <label className="us-label" htmlFor="us-platform-role">Rol de plataforma</label>
                <select id="us-platform-role" className="us-select" value={form.platform_role}
                  disabled={esUnoMismo}
                  onChange={e => setForm({ ...form, platform_role: e.target.value })}>
                  {Object.entries(PLATFORM_ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {esUnoMismo && <p className="us-field-hint">No puedes cambiar tu propio rol de plataforma.</p>}
              </div>
            ) : (
              <div className="us-field">
                <label className="us-label" htmlFor="us-role">Rol</label>
                <select id="us-role" className="us-select" value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}>
                  {Object.entries(TENANT_ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="us-field">
              <label className="us-label" htmlFor="us-password">Nueva contraseña</label>
              <input id="us-password" className="us-input" type="password" placeholder="Dejar en blanco para no cambiarla"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>

          <div className="us-modal-footer">
            <button type="button" className="us-btn-cancel" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="us-btn-submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function Usuarios() {
  const auth = useAuth();
  const { confirm, alert: alertModal } = useConfirm();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('TODOS');
  const [estado, setEstado] = useState('TODOS');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState([]);
  const [ordering, setOrdering] = useState('username');

  const [editUser, setEditUser] = useState(null);
  const [actionMenuFor, setActionMenuFor] = useState(null);
  const [toast, setToast] = useState(null);

  const containerRef = useRef(null);
  const rowsAnimatedRef = useRef(false);
  const requestSeq = useRef(0);
  const searchTimerRef = useRef(null);
  const actionBtnRefs = useRef({});
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Lista de empresas para el filtro — carga una sola vez, es liviana.
  useEffect(() => {
    getTenants().then(res => setTenants(res.results || res)).catch(() => {});
  }, []);

  // Debounce de búsqueda: evita disparar un fetch por cada tecla.
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  const fetchUsuarios = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getUsuariosPlataforma({
        search: debouncedSearch,
        tipo_cuenta: tipoCuenta,
        estado,
        tenant_id: tenantId,
        ordering,
        page,
        page_size: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) return;
      setData(result);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message || 'Error al cargar los usuarios');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, tipoCuenta, estado, tenantId, ordering, page]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const users = data?.results || [];
  const stats = data?.stats;
  const totalCount = data?.count || 0;
  const totalPages = data?.total_pages || 1;

  const updateFilterTipo = (value) => { setTipoCuenta(value); setPage(1); };
  const updateFilterEstado = (value) => { setEstado(value); setPage(1); };
  const updateFilterTenant = (value) => { setTenantId(value); setPage(1); };

  const updateUserLocally = (updated) => {
    setData(prev => prev && {
      ...prev,
      results: prev.results.map(u => u.id === updated.id ? { ...u, ...updated } : u),
    });
  };

  const handleToggleActive = async (u) => {
    try {
      const updated = await updateUsuarioPlataforma(u.id, { is_active: !u.is_active });
      updateUserLocally(updated);
      showToast(updated.is_active ? 'Cuenta activada' : 'Cuenta desactivada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al cambiar el estado', 'error');
    }
  };

  const handleResetPassword = async (u) => {
    try {
      const isConfirmed = await confirm({
        title: 'Cambiar contraseña',
        message: `Se enviará un correo a "${u.email}" con un enlace para que @${u.username} defina una nueva contraseña. ¿Continuar?`,
        action: async () => { await resetPasswordUsuarioPlataforma(u.id); },
      });
      if (isConfirmed) showToast('Correo de restablecimiento enviado', 'success');
    } catch (err) {
      alertModal({ title: 'Error al enviar el correo', message: err.message, isDangerous: true });
    }
  };

  const handleDelete = async (u) => {
    try {
      const isConfirmed = await confirm({
        title: 'Eliminar cuenta',
        message: `¿Eliminar la cuenta "@${u.username}"? Esta acción no se puede deshacer.`,
        isDangerous: true,
        action: async () => { await deleteUsuarioPlataforma(u.id); },
      });
      if (isConfirmed) {
        showToast('Cuenta eliminada', 'success');
        fetchUsuarios();
      }
    } catch (err) {
      alertModal({ title: 'Error al eliminar la cuenta', message: err.message, isDangerous: true });
    }
  };

  useGSAP(() => {
    if (sessionStorage.getItem('usuarios_animated') === 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const header = containerRef.current?.querySelector('.us-header');
    const toolbar = containerRef.current?.querySelector('.us-toolbar');
    const tl = gsap.timeline({ onComplete: () => sessionStorage.setItem('usuarios_animated', 'true') });
    tl.fromTo(header, { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' });
    if (toolbar) {
      tl.fromTo(toolbar, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.18');
    }
  }, { scope: containerRef });

  useGSAP(() => {
    if (loading || rowsAnimatedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rows = containerRef.current?.querySelectorAll('.us-row');
    if (!rows || !rows.length) return;
    gsap.fromTo(rows, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.02, ease: 'power2.out', clearProps: 'transform,opacity' });
    rowsAnimatedRef.current = true;
  }, { dependencies: [loading], scope: containerRef });

  return (
    <div className="usuarios-container" ref={containerRef}>
      <div className="usuarios-header us-header">
        <div>
          <p className="usuarios-header-label">Administración Global</p>
          <h1 className="usuarios-header-title">Usuarios</h1>
        </div>
        <div className="usuarios-header-actions">
          <TopbarActions />
        </div>
      </div>

      <div className="usuarios-content">
        {stats && (
          <div className="us-kpi-row">
            <div className="us-kpi-card">
              <span className="us-kpi-label">Total</span>
              <span className="us-kpi-value">{stats.total}</span>
            </div>
            <div className="us-kpi-card">
              <span className="us-kpi-label">Activos</span>
              <span className="us-kpi-value us-kpi-success">{stats.activos}</span>
            </div>
            <div className="us-kpi-card">
              <span className="us-kpi-label">Inactivos</span>
              <span className="us-kpi-value us-kpi-muted">{stats.inactivos}</span>
            </div>
            <div className="us-kpi-card">
              <span className="us-kpi-label">Plataforma</span>
              <span className="us-kpi-value">{stats.plataforma}</span>
            </div>
            <div className="us-kpi-card">
              <span className="us-kpi-label">Empresa</span>
              <span className="us-kpi-value">{stats.empresa}</span>
            </div>
            <div className="us-kpi-card">
              <span className="us-kpi-label">Cliente</span>
              <span className="us-kpi-value">{stats.cliente}</span>
            </div>
          </div>
        )}

        <div className="usuarios-table-container">
          <div className="us-toolbar">
            <div className="us-search-wrapper">
              <div className="us-search-icon">
                <Svg paths={['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35']} color="var(--text-faint)" size={13} />
              </div>
              <input
                type="text"
                className="us-search-input"
                placeholder="Buscar por usuario, correo, nombre o empresa…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="us-filter-pills">
              {TIPO_CUENTA_FILTROS.map(f => (
                <button key={f} type="button" className={`us-filter-pill ${tipoCuenta === f ? 'active' : ''}`}
                  onClick={() => updateFilterTipo(f)}>
                  {TIPO_CUENTA_LABEL[f]}
                </button>
              ))}
            </div>
            <div className="us-filter-pills">
              {ESTADO_FILTROS.map(f => (
                <button key={f} type="button" className={`us-filter-pill ${estado === f ? 'active' : ''}`}
                  onClick={() => updateFilterEstado(f)}>
                  {ESTADO_LABEL[f]}
                </button>
              ))}
            </div>

            <select
              className="us-tenant-select"
              value={tenantId}
              onChange={e => updateFilterTenant(e.target.value)}
              aria-label="Filtrar por empresa"
            >
              <option value="">Todas las empresas</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.razon_social}</option>
              ))}
            </select>

            <div className="us-spacer" />
            <span className="us-toolbar-count">
              {loading ? '—' : `${totalCount} ${totalCount === 1 ? 'usuario' : 'usuarios'}`}
            </span>
          </div>

          <table className="usuarios-table">
            <thead>
              <tr>
                <th className="us-th-avatar" aria-hidden="true"></th>
                <th><SortableHeader label="Usuario" field="username" ordering={ordering} onSort={setOrdering} /></th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tipo de cuenta</th>
                <th>Rol</th>
                <th>Empresa / Cliente</th>
                <th>Estado</th>
                <th><SortableHeader label="Fecha de alta" field="date_joined" ordering={ordering} onSort={setOrdering} /></th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan="10"><ErrorBanner message={error} onRetry={fetchUsuarios} /></td></tr>
              ) : loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr className="us-empty-row">
                  <td colSpan="10">
                    <div className="us-empty-state">
                      <Svg paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']}
                        circles={[{ cx: 9, cy: 7, r: 4 }]} color="var(--text-faint)" size={28} strokeWidth={1.4} />
                      <p className="us-empty-title">Sin resultados</p>
                      <p className="us-empty-subtitle">Ningún usuario coincide con los filtros actuales.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const avatar = getAvatar(nombreCompleto(u) !== '—' ? nombreCompleto(u) : u.username);
                  const tipoMeta = TIPO_CUENTA_META[u.tipo_cuenta] || { color: 'var(--text-muted)', bg: 'var(--neutral-200)' };
                  const esUnoMismo = u.id === auth.user?.id;
                  const bloqueado = bloqueadoParaModerador(u, auth);

                  const items = [];
                  if (!bloqueado) {
                    items.push({
                      label: 'Editar',
                      icon: <Svg paths={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} color="var(--text-muted)" size={13} />,
                      onClick: () => setEditUser(u),
                    });
                    if (u.email) {
                      items.push({
                        label: 'Cambiar contraseña',
                        icon: <Svg paths={['M4 4h16v16H4z', 'm4 6 8 6 8-6']} color="var(--text-muted)" size={13} />,
                        onClick: () => handleResetPassword(u),
                      });
                    }
                    if (!esUnoMismo) {
                      items.push({
                        label: u.is_active ? 'Desactivar' : 'Activar',
                        icon: <Svg paths={['M9 12l2 2 4-4m7 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z']} color="var(--text-muted)" size={13} />,
                        onClick: () => handleToggleActive(u),
                      });
                      items.push({
                        label: 'Eliminar',
                        icon: <Svg paths={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3', 'M10 11v6', 'M14 11v6']} color="var(--danger)" size={13} />,
                        onClick: () => handleDelete(u),
                      });
                    }
                  }

                  return (
                    <tr key={u.id} className={`us-row ${esDormida(u) ? 'us-row-dormida' : ''}`}>
                      <td className="us-cell-avatar">
                        <div className="us-avatar" style={{ color: avatar.color, background: avatar.bg }}>{avatar.initials}</div>
                      </td>
                      <td className="us-username-col">@{u.username}</td>
                      <td>{nombreCompleto(u)}</td>
                      <td className="us-cell-email">{u.email || '—'}</td>
                      <td>
                        <span className="us-tipo-badge" style={{ color: tipoMeta.color, background: tipoMeta.bg }}>
                          {TIPO_CUENTA_LABEL[u.tipo_cuenta] || u.tipo_cuenta}
                        </span>
                      </td>
                      <td>{rolLabel(u)}</td>
                      <td>
                        {u.tenant_razon_social || '—'}
                        {u.cliente_nombre && (
                          <div className="us-cell-subtext">Cliente: {u.cliente_nombre}</div>
                        )}
                      </td>
                      <td><StatusBadge estado={u.is_active ? 'Activo' : 'Inactivo'} /></td>
                      <td className="us-cell-date">
                        {fmtDate(u.date_joined)}
                        <div className={`us-cell-subtext ${esDormida(u) ? 'us-dormida' : ''}`}>
                          {esDormida(u) && (
                            <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--warning-bright)" size={10} />
                          )}
                          Último acceso: {u.last_login ? fmtDateTime(u.last_login) : 'Nunca'}
                        </div>
                      </td>
                      <td>
                        {items.length > 0 && (
                          <>
                            <button
                              ref={el => { actionBtnRefs.current[u.id] = el; }}
                              className="us-action-btn"
                              onClick={() => setActionMenuFor(actionMenuFor === u.id ? null : u.id)}
                              aria-label="Acciones"
                            >
                              <Svg paths={['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z']} color="var(--text-muted)" size={15} />
                            </button>
                            {actionMenuFor === u.id && (
                              <ActionDropdown
                                anchorRef={{ current: actionBtnRefs.current[u.id] }}
                                onClose={() => setActionMenuFor(null)}
                                items={items}
                              />
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!loading && !error && totalCount > 0 && (
            <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} setPage={setPage} itemName="usuarios" />
          )}
        </div>
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={(updated) => {
            updateUserLocally(updated);
            setEditUser(null);
            showToast('Cambios guardados', 'success');
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
