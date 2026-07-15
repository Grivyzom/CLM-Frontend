import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIncidencias } from '../hooks/useIncidencias';
import { updateIncidencia, createComentario } from '../api';
import NewIncidenciaModal from './NewIncidenciaModal';
import Pagination from '../components/ui/Pagination';
import StatusBadge from '../components/ui/StatusBadge';
import Svg from '../components/ui/Svg';
import TopbarActions from '../components/layout/TopbarActions';
import { fmtDateTime } from '../utils/formatters';
import './Reporte.css';

const ESTADO_CFG = {
  ABIERTO:      { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)', dot: 'var(--danger)' },
  EN_PROGRESO:  { color: 'var(--warning-deep)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', dot: 'var(--warning-bright)' },
  RESUELTO:     { color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)', dot: 'var(--success)' },
  CERRADO:      { color: 'var(--text-faint)', bg: 'var(--bg-topbar)', border: 'var(--border)', dot: 'var(--border-strong)' },
};
const ESTADO_LABELS = { ABIERTO: 'Abierto', EN_PROGRESO: 'En progreso', RESUELTO: 'Resuelto', CERRADO: 'Cerrado' };

const SEVERIDAD_CFG = {
  BAJA:     { color: 'var(--text-muted)', bg: 'var(--bg-topbar)', border: 'var(--border)', dot: 'var(--border-strong)' },
  MEDIA:    { color: 'var(--sky)', bg: 'var(--sky-border)', border: 'var(--sky)', dot: 'var(--sky)' },
  ALTA:     { color: 'var(--warning-deep)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', dot: 'var(--warning-bright)' },
  CRITICA:  { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)', dot: 'var(--danger)' },
};
const SEVERIDAD_LABELS = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica' };

function SkeletonRow() {
  return (
    <div className="rp-row rp-skeleton-row">
      {[220, 100, 90, 90, 120, 70].map((w, i) => (
        <div key={i} className="rp-skeleton-bar" style={{ width: w }} />
      ))}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rp-error-wrap">
      <div className="rp-error-pill">
        <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={16} />
        <span>{message}</span>
      </div>
      <br />
      <button className="rp-btn" onClick={onRetry}>
        <Svg paths={['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15']} color="var(--text-muted)" size={13} />
        Reintentar
      </button>
    </div>
  );
}

function DetailPanel({ incidencia, detail, loading, onClose, isStaff, canManage, currentUserId, onChanged }) {
  const [mensaje, setMensaje] = useState('');
  const [esInterno, setEsInterno] = useState(false);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const data = detail || incidencia;
  if (!data) return null;

  const handleEstadoChange = async (e) => {
    try {
      await updateIncidencia(data.id, { estado: e.target.value });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAsignarme = async () => {
    try {
      await updateIncidencia(data.id, { asignado_a_id: currentUserId });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitComentario = async (e) => {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('mensaje', mensaje.trim());
      if (isStaff && esInterno) formData.append('es_interno', 'true');
      files.forEach(f => formData.append('adjuntos', f));
      await createComentario(data.id, formData);
      setMensaje('');
      setEsInterno(false);
      setFiles([]);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rp-detail-panel" role="dialog" aria-label="Detalle de incidencia">
      <div className="rp-detail-header">
        <div>
          <p className="rp-detail-eyebrow">Incidencia #{data.id}</p>
          <h2 className="rp-detail-title">{data.titulo}</h2>
        </div>
        <button className="rp-detail-close" onClick={onClose} aria-label="Cerrar panel">
          <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-faint)" size={14} />
        </button>
      </div>

      <div className="rp-detail-badges">
        <StatusBadge estado={data.estado} config={ESTADO_CFG} label={ESTADO_LABELS[data.estado]} />
        <StatusBadge estado={data.severidad} config={SEVERIDAD_CFG} label={SEVERIDAD_LABELS[data.severidad]} />
        {isStaff && <span className="rp-detail-cliente">{data.cliente_nombre}</span>}
      </div>

      {loading ? (
        <div className="rp-detail-loading">Cargando…</div>
      ) : (
        <div className="rp-detail-body">
          {error && <div className="rp-detail-error">{error}</div>}

          <section>
            <p className="rp-detail-section-title">Descripción</p>
            <p className="rp-detail-text">{data.descripcion}</p>
          </section>

          {data.software_nombre && (
            <section>
              <p className="rp-detail-section-title">Software afectado</p>
              <p className="rp-detail-text">{data.software_nombre}</p>
            </section>
          )}

          {data.sla && (
            <section>
              <p className="rp-detail-section-title">SLA de respuesta</p>
              <p className="rp-detail-text">
                Plazo: {data.sla.plazo_horas}h — vence {fmtDateTime(data.sla.vencimiento)}
                {' '}
                <span style={{ color: data.sla.cumplido ? 'var(--success-deep)' : (data.sla.en_riesgo ? 'var(--danger)' : 'var(--text-muted)') }}>
                  ({data.sla.cumplido ? 'cumplido' : (data.sla.en_riesgo ? 'en riesgo' : 'pendiente')})
                </span>
              </p>
            </section>
          )}

          {canManage && (
            <section className="rp-detail-manage">
              <p className="rp-detail-section-title">Gestión</p>
              <div className="rp-detail-manage-row">
                <select className="rp-select" value={data.estado} onChange={handleEstadoChange}>
                  {Object.keys(ESTADO_LABELS).map(k => <option key={k} value={k}>{ESTADO_LABELS[k]}</option>)}
                </select>
                <span className="rp-detail-asignado">
                  {data.asignado_a_nombre ? `Asignado a ${data.asignado_a_nombre}` : 'Sin asignar'}
                </span>
                {data.asignado_a_id !== currentUserId && (
                  <button className="rp-btn rp-btn-sm" onClick={handleAsignarme}>Asignarme</button>
                )}
              </div>
            </section>
          )}

          {Array.isArray(data.adjuntos) && data.adjuntos.length > 0 && (
            <section>
              <p className="rp-detail-section-title">Adjuntos</p>
              <div className="rp-adjuntos-list">
                {data.adjuntos.map(a => (
                  <a key={a.id} href={a.archivo} target="_blank" rel="noreferrer" className="rp-adjunto-chip">
                    <Svg paths={['M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48']} color="var(--text-muted)" size={12} />
                    {a.nombre}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="rp-detail-section-title">Timeline</p>
            <div className="rp-timeline">
              {(data.comentarios || []).length === 0 && (
                <p className="rp-timeline-empty">Sin respuestas aún.</p>
              )}
              {(data.comentarios || []).map(c => (
                <div key={c.id} className={`rp-timeline-item ${c.es_interno ? 'internal' : ''}`}>
                  <div className="rp-timeline-head">
                    <span className="rp-timeline-author">{c.autor_nombre || 'Usuario'}</span>
                    {c.es_interno && <span className="rp-timeline-tag">Nota interna</span>}
                    <span className="rp-timeline-date">{fmtDateTime(c.fecha_creacion)}</span>
                  </div>
                  <p className="rp-timeline-msg">{c.mensaje}</p>
                  {Array.isArray(c.adjuntos) && c.adjuntos.length > 0 && (
                    <div className="rp-adjuntos-list">
                      {c.adjuntos.map(a => (
                        <a key={a.id} href={a.archivo} target="_blank" rel="noreferrer" className="rp-adjunto-chip">{a.nombre}</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <form className="rp-detail-footer" onSubmit={handleSubmitComentario}>
        <textarea
          className="rp-textarea"
          placeholder="Escribe una respuesta…"
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          rows={3}
        />
        <div className="rp-detail-footer-row">
          {isStaff && (
            <label className="rp-checkbox-label">
              <input type="checkbox" checked={esInterno} onChange={e => setEsInterno(e.target.checked)} />
              Nota interna (no visible al cliente)
            </label>
          )}
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="rp-file-input" />
          <button type="submit" className="rp-btn rp-btn-primary" disabled={sending || !mensaje.trim()}>
            {sending ? 'Enviando…' : 'Responder'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Reporte() {
  const { user, isClienteExterno } = useAuth();
  const isStaff = !isClienteExterno;
  const {
    incidencias, stats, totalCount, totalPages, loading, error,
    page, pageSize, setPage, filters, updateFilter, selectedId, setSelectedId,
    detail, detailLoading, refetch,
  } = useIncidencias({ canSeeStats: isStaff });

  const [showNewModal, setShowNewModal] = useState(false);

  const selectedIncidencia = incidencias.find(i => i.id === selectedId) || null;
  const canManage = isStaff;

  const dateDisplay = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="rp-container">
      <div className="rp-topbar">
        <div className="rp-topbar-left">
          <h1 className="rp-topbar-title">Reporte de Incidencias</h1>
          <p className="rp-topbar-subtitle">
            {isStaff ? 'Bandeja de incidencias reportadas por clientes' : 'Reporta fallas del software que tienes contratado'}
          </p>
        </div>
        <div className="rp-topbar-right">
          <span className="rp-topbar-date">{dateDisplay}</span>
          <div className="rp-topbar-divider" />
          <button className="rp-btn rp-btn-primary" onClick={() => setShowNewModal(true)}>
            <Svg paths={['M12 5v14M5 12h14']} color="var(--text-on-accent)" size={13} />
            Reportar incidencia
          </button>
          <TopbarActions />
        </div>
      </div>

      <div className="rp-body">
        {isStaff && stats && (
          <div className="rp-stats-grid">
            <div className="rp-stat-card">
              <p className="rp-stat-label">Total</p>
              <p className="rp-stat-value">{stats.total}</p>
            </div>
            <div className="rp-stat-card">
              <p className="rp-stat-label">Abiertas</p>
              <p className="rp-stat-value" style={{ color: 'var(--danger)' }}>{stats.abiertas}</p>
            </div>
            <div className="rp-stat-card">
              <p className="rp-stat-label">En progreso</p>
              <p className="rp-stat-value" style={{ color: 'var(--warning-bright)' }}>{stats.en_progreso}</p>
            </div>
            <div className="rp-stat-card">
              <p className="rp-stat-label">Críticas abiertas</p>
              <p className="rp-stat-value" style={{ color: 'var(--danger)' }}>{stats.criticas_abiertas}</p>
            </div>
          </div>
        )}

        <div className="rp-filters">
          <input
            className="rp-search"
            placeholder="Buscar por título o descripción…"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
          />
          <select className="rp-select" value={filters.estado} onChange={e => updateFilter('estado', e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.keys(ESTADO_LABELS).map(k => <option key={k} value={k}>{ESTADO_LABELS[k]}</option>)}
          </select>
          <select className="rp-select" value={filters.severidad} onChange={e => updateFilter('severidad', e.target.value)}>
            <option value="">Toda severidad</option>
            {Object.keys(SEVERIDAD_LABELS).map(k => <option key={k} value={k}>{SEVERIDAD_LABELS[k]}</option>)}
          </select>
          {isStaff && (
            <button
              className={`rp-btn rp-btn-sm ${filters.asignado_a === String(user?.id) ? 'active' : ''}`}
              onClick={() => updateFilter('asignado_a', filters.asignado_a ? '' : String(user?.id))}
            >
              Asignadas a mí
            </button>
          )}
        </div>

        <div className="rp-table-card">
          <div className="rp-table-head">
            <span style={{ flex: 2 }}>Título</span>
            {isStaff && <span style={{ flex: 1 }}>Cliente</span>}
            <span style={{ flex: 1 }}>Software</span>
            <span style={{ width: 100 }}>Severidad</span>
            <span style={{ width: 110 }}>Estado</span>
            <span style={{ width: 130 }}>Fecha</span>
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={refetch} />
          ) : loading ? (
            <>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</>
          ) : incidencias.length === 0 ? (
            <div className="rp-empty">
              <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--text-faint)" size={28} />
              <p>No hay incidencias reportadas.</p>
            </div>
          ) : (
            incidencias.map(inc => (
              <div key={inc.id} className="rp-row" onClick={() => setSelectedId(inc.id)}>
                <span style={{ flex: 2, fontWeight: 500 }}>{inc.titulo}</span>
                {isStaff && <span style={{ flex: 1, color: 'var(--text-muted)' }}>{inc.cliente_nombre}</span>}
                <span style={{ flex: 1, color: 'var(--text-muted)' }}>{inc.software_nombre || '—'}</span>
                <span style={{ width: 100 }}>
                  <StatusBadge estado={inc.severidad} config={SEVERIDAD_CFG} label={SEVERIDAD_LABELS[inc.severidad]} />
                </span>
                <span style={{ width: 110 }}>
                  <StatusBadge estado={inc.estado} config={ESTADO_CFG} label={ESTADO_LABELS[inc.estado]} />
                </span>
                <span style={{ width: 130, color: 'var(--text-muted)', fontSize: 11 }}>{fmtDateTime(inc.fecha_creacion)}</span>
              </div>
            ))
          )}
        </div>

        {!loading && !error && totalCount > 0 && (
          <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} setPage={setPage} itemName="incidencias" />
        )}
      </div>

      {selectedId && (
        <>
          <div className="rp-detail-overlay" onClick={() => setSelectedId(null)} />
          <DetailPanel
            incidencia={selectedIncidencia}
            detail={detail}
            loading={detailLoading}
            onClose={() => setSelectedId(null)}
            isStaff={isStaff}
            canManage={canManage}
            currentUserId={user?.id}
            onChanged={refetch}
          />
        </>
      )}

      {showNewModal && (
        <NewIncidenciaModal
          onClose={() => setShowNewModal(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
