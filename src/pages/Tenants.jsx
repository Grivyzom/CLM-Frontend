import React, { useState, useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { getTenants, createTenant } from '../api';
import { fmtDate } from '../utils/formatters';
import TopbarActions from '../components/layout/TopbarActions';
import Svg from '../components/ui/Svg';
import './Tenants.css';

gsap.registerPlugin(useGSAP);

const CATEGORIA_META = {
  COBRE: { label: 'Cobre', color: 'var(--orange)', bg: 'var(--orange-tint)' },
  PLATA: { label: 'Plata', color: 'var(--text-muted)', bg: 'var(--neutral-200)' },
  PLATINO: { label: 'Platino', color: 'var(--cyan-deep)', bg: 'var(--cyan-tint)' },
  DIAMANTE: { label: 'Diamante', color: 'var(--indigo)', bg: 'var(--indigo-bg)' },
  OBSIDIANA: { label: 'Obsidiana', color: 'var(--violet-deep)', bg: 'var(--violet-tint)' },
};

const ESTADO_FILTROS = ['TODOS', 'ACTIVO', 'GRACIA', 'SUSPENDIDO'];
const ESTADO_LABEL = { TODOS: 'Todos', ACTIVO: 'Activo', GRACIA: 'En gracia', SUSPENDIDO: 'Suspendido' };

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

function SkeletonRow() {
  return (
    <tr className="tn-skeleton-row">
      {[36, 220, 90, 90, 100].map((w, i) => (
        <td key={i}>
          <div className="tn-skeleton-bar" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

function NewTenantModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({ razon_social: '', categoria: 'COBRE', estado: 'ACTIVO' });
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
      await createTenant(formData);
      onCreated();
    } catch (err) {
      setError(err.message || 'Error al crear la empresa');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="tn-modal-overlay" onClick={() => !saving && onClose()} />
      <div className="tn-modal" role="dialog" aria-modal="true" aria-label="Nueva Empresa">
        <div className="tn-modal-header">
          <div>
            <h2 className="tn-modal-title">Nueva Empresa</h2>
            <p className="tn-modal-subtitle">Alta manual de un tenant en la plataforma</p>
          </div>
          <button
            type="button"
            className="tn-modal-close"
            onClick={() => !saving && onClose()}
            aria-label="Cerrar"
          >
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-faint)" size={13} />
          </button>
        </div>

        <form id="new-tenant-form" onSubmit={handleSubmit}>
          <div className="tn-modal-body">
            {error && (
              <div className="tn-modal-error">
                <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={13} />
                {error}
              </div>
            )}

            <div className="tn-field">
              <label className="tn-label" htmlFor="tn-razon-social">Razón Social</label>
              <input
                id="tn-razon-social"
                className="tn-input"
                type="text"
                required
                autoFocus
                placeholder="ej: Grivyzom Servicios SpA"
                value={formData.razon_social}
                onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
              />
            </div>

            <div className="tn-field-row">
              <div className="tn-field">
                <label className="tn-label" htmlFor="tn-categoria">Categoría (Plan)</label>
                <select
                  id="tn-categoria"
                  className="tn-select"
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                >
                  {Object.entries(CATEGORIA_META).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
              </div>

              <div className="tn-field">
                <label className="tn-label" htmlFor="tn-estado">Estado</label>
                <select
                  id="tn-estado"
                  className="tn-select"
                  value={formData.estado}
                  onChange={e => setFormData({ ...formData, estado: e.target.value })}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="GRACIA">En Periodo de Gracia</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                </select>
              </div>
            </div>
          </div>

          <div className="tn-modal-footer">
            <button type="button" className="tn-btn-cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="tn-btn-submit" disabled={saving}>
              {saving ? 'Creando…' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const containerRef = useRef(null);
  const rowsAnimatedRef = useRef(false);

  const loadTenants = () => {
    setLoading(true);
    getTenants()
      .then(data => setTenants(data.results || data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenants.filter(t => {
      const matchesSearch = !term || t.razon_social?.toLowerCase().includes(term);
      const matchesEstado = estadoFilter === 'TODOS' || t.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [tenants, search, estadoFilter]);

  // Entrada en dos fases: la estructura (header/toolbar) anima al montar sin
  // esperar el fetch; las filas de la tabla animan aparte una vez cargadas.
  useGSAP(() => {
    if (sessionStorage.getItem('tenants_animated') === 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const header = containerRef.current?.querySelector('.tn-header');
    const toolbar = containerRef.current?.querySelector('.tn-toolbar');

    const tl = gsap.timeline({ onComplete: () => sessionStorage.setItem('tenants_animated', 'true') });
    tl.fromTo(header, { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' });
    if (toolbar) {
      tl.fromTo(toolbar, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.18');
    }
  }, { scope: containerRef });

  useGSAP(() => {
    if (loading || rowsAnimatedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rows = containerRef.current?.querySelectorAll('.tn-row');
    if (!rows || !rows.length) return;
    gsap.fromTo(rows, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' });
    rowsAnimatedRef.current = true;
  }, { dependencies: [loading], scope: containerRef });

  return (
    <div className="tenants-container" ref={containerRef}>
      <div className="tenants-header tn-header">
        <div>
          <p className="tenants-header-label">Administración Global</p>
          <h1 className="tenants-header-title">Empresas (Tenants)</h1>
        </div>
        <div className="tenants-header-actions">
          <button className="tenants-btn-primary" onClick={() => setShowModal(true)}>
            <Svg paths={['M12 5v14', 'M5 12h14']} color="currentColor" size={14} />
            Nueva Empresa
          </button>
          <div className="tn-topbar-actions-wrap">
            <TopbarActions />
          </div>
        </div>
      </div>

      <div className="tenants-content">
        <div className="tenants-table-container">
          <div className="tn-toolbar">
            <div className="tn-search-wrapper">
              <div className="tn-search-icon">
                <Svg paths={['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35']} color="var(--text-faint)" size={13} />
              </div>
              <input
                type="text"
                className="tn-search-input"
                placeholder="Buscar por razón social…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="tn-filter-pills">
              {ESTADO_FILTROS.map(f => (
                <button
                  key={f}
                  type="button"
                  className={`tn-filter-pill ${estadoFilter === f ? 'active' : ''}`}
                  onClick={() => setEstadoFilter(f)}
                >
                  {ESTADO_LABEL[f]}
                </button>
              ))}
            </div>

            <div className="tn-spacer" />
            <span className="tn-toolbar-count">
              {loading ? '—' : `${filtered.length} ${filtered.length === 1 ? 'empresa' : 'empresas'}`}
            </span>
          </div>

          <table className="tenants-table">
            <thead>
              <tr>
                <th className="tn-th-avatar" aria-hidden="true"></th>
                <th>Razón Social</th>
                <th>Categoría (Plan)</th>
                <th>Estado</th>
                <th>Creado el</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr className="tn-empty-row">
                  <td colSpan="5">
                    <div className="tn-empty-state">
                      <Svg
                        paths={['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 9h1', 'M9 13h1', 'M14 9h1', 'M14 13h1', 'M10 21v-4h4v4']}
                        color="var(--text-faint)"
                        size={28}
                        strokeWidth={1.4}
                      />
                      {tenants.length === 0 ? (
                        <>
                          <p className="tn-empty-title">Aún no hay empresas registradas</p>
                          <p className="tn-empty-subtitle">Crea la primera empresa para comenzar a operar la plataforma.</p>
                        </>
                      ) : (
                        <>
                          <p className="tn-empty-title">Sin resultados</p>
                          <p className="tn-empty-subtitle">Ninguna empresa coincide con los filtros actuales.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const avatar = getAvatar(t.razon_social || '');
                  const catMeta = CATEGORIA_META[t.categoria] || { label: t.categoria, color: 'var(--text-muted)', bg: 'var(--neutral-200)' };
                  return (
                    <tr key={t.id} className="tn-row">
                      <td className="tn-cell-avatar">
                        <div className="tn-avatar" style={{ color: avatar.color, background: avatar.bg }}>
                          {avatar.initials}
                        </div>
                      </td>
                      <td className="tenant-name-col">{t.razon_social}</td>
                      <td>
                        <span className="tenant-badge" style={{ color: catMeta.color, background: catMeta.bg }}>
                          {catMeta.label}
                        </span>
                      </td>
                      <td>
                        <span className={`tenant-badge tenant-badge-${t.estado.toLowerCase()}`}>
                          {ESTADO_LABEL[t.estado] || t.estado}
                        </span>
                      </td>
                      <td className="tn-cell-date">{fmtDate(t.fecha_creacion)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NewTenantModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            loadTenants();
          }}
        />
      )}
    </div>
  );
}
