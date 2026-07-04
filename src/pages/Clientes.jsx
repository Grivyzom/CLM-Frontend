import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getClienteDetail, deleteCliente, updateClienteStatus, exportClientes } from '../api';
import { useClientes } from '../hooks/useClientes';
import NewClientModal from './NewClientModal';
import EditClientModal from './EditClientModal';
import ImportClientsModal from './ImportClientsModal';
import './Clientes.css';
import Pagination from '../components/ui/Pagination';

// ─── Constantes visuales ─────────────────────────────────────────────────────
const CONTEXTS = ['Administración Global', 'SoftTrack Pro v3', 'ContaLite v2.1'];

const FILTER_ESTADOS  = ['Todos', 'Activo', 'En revisión', 'Inactivo'];
const FILTER_TIPOS    = ['Todos', 'juridica', 'natural'];
const FILTER_TIPO_LABELS = { Todos: 'Todos', juridica: 'Empresa', natural: 'Persona Natural' };

const STATUS_CFG = {
  'Activo':      { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  'En revisión': { color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  'Inactivo':    { color: '#b0aaa3', bg: '#efede8', border: '#d8d4cc', dot: '#c9c4bc' },
};

// Mapear tipo/sector del backend a colores visuales
function getTipoBadgeStyle(tipo) {
  if (tipo === 'juridica') return { label: 'Empresa',          color: '#5b21b6', bg: '#ede9fe' };
  if (tipo === 'natural')  return { label: 'Persona Natural',  color: '#065f46', bg: '#d1fae5' };
  return                          { label: tipo,               color: '#5c574f', bg: '#e5e2da' };
}

// Generar iniciales + color del avatar a partir del nombre/razón social
function getAvatarStyle(name = '') {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name.substring(0, 2)).toUpperCase();

  const PALETTE = [
    { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
    { color: '#0891b2', bg: '#cffafe' },
    { color: '#059669', bg: '#a7f3d0' },
    { color: '#7c3aed', bg: '#ddd6fe' },
    { color: '#be123c', bg: '#fecdd3' },
    { color: '#d97706', bg: '#fde68a' },
    { color: '#0284c7', bg: '#bae6fd' },
    { color: '#0d9488', bg: '#99f6e4' },
    { color: '#ea580c', bg: '#fed7aa' },
    { color: '#dc2626', bg: '#fecaca' },
  ];
  const idx = (name.charCodeAt(0) || 0) % PALETTE.length;
  return { initials, ...PALETTE[idx] };
}

// ─── Icons SVG ───────────────────────────────────────────────────────────────
function Svg({ paths = [], circles = [], size = 14, color = '#7c7670', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
      {circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
    </svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusBadge({ estado }) {
  const c = STATUS_CFG[estado] || STATUS_CFG['Inactivo'];
  return (
    <span className="cl-status-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="cl-status-dot" style={{ background: c.dot }} />
      {estado}
    </span>
  );
}

function TipoBadge({ tipo }) {
  const s = getTipoBadgeStyle(tipo);
  return (
    <span className="cl-tipo-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="cl-row" style={{ pointerEvents: 'none' }}>
      {[180, 120, 90, 130, 70, 80, 40, 60].map((w, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 6,
          background: 'linear-gradient(90deg, #e5e2da 25%, #d8d4cc 50%, #e5e2da 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          width: w, maxWidth: '100%',
        }} />
      ))}
    </div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
        <Svg paths={['M12 9v4M12 17h.01','M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="#dc2626" size={16} />
        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{message}</span>
      </div>
      <br />
      <button className="cl-btn" onClick={onRetry} style={{ margin: '0 auto' }}>
        <Svg paths={['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15']} color="#7c7670" size={13} />
        Reintentar
      </button>
    </div>
  );
}

// ─── Indeterminate Checkbox ───────────────────────────────────────────────────
function IndeterminateCheckbox({ indeterminate, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input type="checkbox" ref={ref} {...rest} />;
}

// ─── Detail Row helper ────────────────────────────────────────────────────────
function DetailRow({ label, children }) {
  return (
    <div className="cl-detail-row">
      <span className="cl-detail-row-label">{label}</span>
      <span className="cl-detail-row-value">{children}</span>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, loading, isDangerous }) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 998,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          border: '1px solid #d8d4cc',
          borderRadius: 8,
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          width: '90%',
          maxWidth: 380,
          padding: '24px',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#3b3631' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#7c7670', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 5,
              border: '1px solid #d8d4cc',
              background: '#efede8',
              color: '#3b3631',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => !loading && (e.target.style.background = '#e5e2da')}
            onMouseLeave={e => !loading && (e.target.style.background = '#efede8')}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 5,
              border: 'none',
              background: isDangerous ? '#dc2626' : '#2563eb',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s, opacity 0.12s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => !loading && (e.target.style.background = isDangerous ? '#b91c1c' : '#1d4ed8')}
            onMouseLeave={e => !loading && (e.target.style.background = isDangerous ? '#dc2626' : '#2563eb')}
          >
            {loading ? 'Procesando...' : isDangerous ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────
function ContextMenu({ clientId, pos, onClose, onEdit, onDelete, onChangeStatus, clientEstado }) {
  const [menuPos, setMenuPos] = React.useState({ top: pos.y, left: pos.x });
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = rect.width || 200;
    const menuHeight = rect.height || 120;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = pos.y;
    let left = pos.x;

    // Ajustar horizontalmente
    if (left + menuWidth + margin > viewportWidth) {
      left = Math.max(margin, pos.x - menuWidth - margin);
    } else {
      left = pos.x;
    }

    // Ajustar verticalmente
    if (top + menuHeight + margin > viewportHeight) {
      top = Math.max(margin, pos.y - menuHeight - margin);
    } else {
      top = pos.y;
    }

    setMenuPos({ top, left });
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 998,
        }}
      />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: menuPos.top,
          left: menuPos.left,
          background: '#fff',
          border: '1px solid #d8d4cc',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 999,
          minWidth: 180,
          animation: 'dropIn 0.15s ease-out',
        }}
      >
        <button
          onClick={() => { onEdit(clientId); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: '#5c574f',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderBottom: '1px solid #e5e2da',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Svg paths={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} color="#7c7670" size={14} />
          Editar
        </button>
        <button
          onClick={() => { onChangeStatus(clientId); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: '#5c574f',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderBottom: '1px solid #e5e2da',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Svg paths={['M9 12l2 2 4-4m7 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z']} color="#7c7670" size={14} />
          {clientEstado === 'Activo' ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={() => { onDelete(clientId); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: '#dc2626',
            textAlign: 'left',
            fontFamily: 'inherit',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Svg paths={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} color="#dc2626" size={14} />
          Eliminar
        </button>
      </div>
    </>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ clientId, onClose }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    getClienteDetail(clientId)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId) return null;

  const avatar = detail ? getAvatarStyle(detail.razon_social || detail.nombre_comercial || '') : { initials: '…', color: '#b0aaa3', bg: '#e5e2da' };

  return (
    <div className="cl-detail-panel" role="dialog" aria-label="Detalle de cliente">
      {/* Header */}
      <div className="cl-detail-header">
        <div className="cl-detail-header-left">
          <div className="cl-detail-avatar" style={{ background: avatar.bg, color: avatar.color }}>
            {loading ? '…' : avatar.initials}
          </div>
          <div>
            {loading
              ? <div style={{ width: 160, height: 14, background: '#d8d4cc', borderRadius: 4, marginBottom: 6 }} />
              : <h2 className="cl-detail-name">{detail?.razon_social || '—'}</h2>
            }
            {loading
              ? <div style={{ width: 100, height: 10, background: '#e5e2da', borderRadius: 4 }} />
              : <p className="cl-detail-sub">{detail?.nombre_comercial || ''}</p>
            }
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {detail && (
            <>
              <span
                title={`Registrado: ${new Date(detail.fecha_registro).toLocaleString('es-CL', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 5, cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Svg paths={['M8 2v4','M16 2v4','M3 10h18','M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']} color="#b0aaa3" size={14} />
              </span>
              <span
                title={`Última modificación: ${new Date(detail.fecha_modificacion).toLocaleString('es-CL', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 5, cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Svg paths={['M12 8v4l3 3','M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z']} color="#b0aaa3" size={14} />
              </span>
            </>
          )}
          <button className="cl-detail-close" onClick={onClose} aria-label="Cerrar panel">
            <Svg paths={['M18 6 6 18','M6 6l12 12']} color="#b0aaa3" size={13} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 20px', color: '#dc2626', fontSize: 12 }}>
          Error al cargar: {error}
        </div>
      )}

      {/* Badges */}
      {detail && (
        <div className="cl-detail-badges">
          <StatusBadge estado={detail.estado} />
          <TipoBadge tipo={detail.tipo} />
          <span className="cl-detail-sector-label">{detail.sector}</span>
        </div>
      )}

      {/* Body */}
      <div className="cl-detail-body">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 12, borderRadius: 4, background: '#e5e2da', width: `${60 + i * 8}%` }} />
            ))}
          </div>
        ) : detail ? (
          <>
            {/* Identificación Legal */}
            <div>
              <p className="cl-detail-section-title">
                <Svg paths={['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z']} color="#b0aaa3" size={12} />
                Identificación Legal
              </p>
              <div className="cl-detail-rows">
                <DetailRow label="Razón Social">{detail.razon_social}</DetailRow>
                <DetailRow label="Nombre Comercial">{detail.nombre_comercial}</DetailRow>
                <DetailRow label={detail.tipo === 'juridica' ? 'RUT' : 'RUN'}>
                  <span className="cl-rut-value">{detail.id_fiscal}</span>
                </DetailRow>
                <DetailRow label="Sector">{detail.sector}</DetailRow>
                <DetailRow label="Registrado">
                  {new Date(detail.fecha_registro).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })}
                </DetailRow>
              </div>
            </div>

            {/* Contacto Principal */}
            <div>
              <p className="cl-detail-section-title">
                <Svg paths={['M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z']} color="#b0aaa3" size={12} />
                Contacto Principal
              </p>
              <div className="cl-detail-rows">
                <DetailRow label="Nombre">{detail.contacto_principal || detail.razon_social}</DetailRow>
                <DetailRow label="Correo">{detail.email}</DetailRow>
                <DetailRow label="Teléfono">{detail.telefono || detail.contacto_tel || '—'}</DetailRow>
                {detail.contactos?.length > 0 && (
                  <DetailRow label="Cargo">{detail.contactos[0].cargo}</DetailRow>
                )}
              </div>
            </div>

            {/* Contratos */}
            <div>
              <p className="cl-detail-section-title">
                <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M16 13H8','M16 17H8']} color="#b0aaa3" size={12} />
                Contratos
              </p>
              <div className="cl-contracts-box">
                <div>
                  <p className="cl-contracts-num">{detail.contratos_count}</p>
                  <p className="cl-contracts-label">contratos registrados</p>
                </div>
              </div>

              {/* Lista de contratos activos */}
              <div style={{ marginTop: 10, border: '1px solid #e5e2da', borderRadius: 6, overflow: 'hidden' }}>
                {detail.contratos_activos?.length > 0 ? (
                  detail.contratos_activos.map((c, i) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '10px 12px',
                        borderBottom: i < detail.contratos_activos.length - 1 ? '1px solid #efede8' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#3b3631' }}>{c.software}</div>
                        <div style={{ color: '#7c7670', fontSize: 10, marginTop: 2 }}>
                          {c.tipo_contrato} · vence {c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '2px 8px', borderRadius: 999 }}>
                        ACTIVO
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px 12px', textAlign: 'center', color: '#b0aaa3', fontSize: 12 }}>
                    No hay contratos activos
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer */}
      {detail && (
        <div className="cl-detail-footer">
          <button
            className="cl-detail-footer-btn secondary"
            disabled={!detail.contratos_activos?.length}
            style={!detail.contratos_activos?.length ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Ver contratos
          </button>
          <button className="cl-detail-footer-btn primary">Nuevo contrato</button>
        </div>
      )}
    </div>
  );
}

// ─── Filter Dropdown ─────────────────────────────────────────────────────────
function FilterDropdown({ onClose, filters, updateFilter, anchorRef }) {
  const dropdownRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    let top = anchorRect.bottom + margin;
    let left = anchorRect.left;

    // Ajustar tras montar y medir el propio dropdown
    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjLeft = left;
      let adjTop = top;

      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, viewportWidth - rect.width - margin);
      }
      if (adjTop + rect.height + margin > viewportHeight) {
        adjTop = Math.max(margin, anchorRect.top - rect.height - margin);
      }

      setPos({ top: adjTop, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <div
      ref={dropdownRef}
      className="cl-filter-dropdown"
      role="dialog"
      aria-label="Filtros avanzados"
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
    >
      <p className="cl-filter-section-title">Estado</p>
      <div className="cl-filter-pills">
        {FILTER_ESTADOS.map(op => (
          <button key={op}
            className={`cl-filter-pill ${filters.estado === op ? 'active' : ''}`}
            onClick={() => updateFilter('estado', op)}>
            {op}
          </button>
        ))}
      </div>
      <p className="cl-filter-section-title">Tipo</p>
      <div className="cl-filter-pills">
        {FILTER_TIPOS.map(op => (
          <button key={op}
            className={`cl-filter-pill ${filters.tipo === op ? 'active' : ''}`}
            onClick={() => updateFilter('tipo', op)}>
            {FILTER_TIPO_LABELS[op]}
          </button>
        ))}
      </div>
      <div className="cl-filter-actions">
        <button className="cl-filter-cancel" onClick={onClose}>Cancelar</button>
        <button className="cl-filter-apply" onClick={onClose}>Aplicar</button>
      </div>
    </div>
  );
}

// ─── Action Dropdown (Exportar / Importar) ───────────────────────────────────
function ActionDropdown({ anchorRef, items, onClose }) {
  const dropdownRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    const top = anchorRect.bottom + margin;
    const left = anchorRect.left;

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let adjLeft = left;
      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, anchorRect.right - rect.width);
      }
      setPos({ top, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <div
      ref={dropdownRef}
      className="cl-action-dropdown"
      role="menu"
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className="cl-action-dropdown-item"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => { item.onClick(); onClose(); }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'info' }) {
  const CFG = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  };
  const c = CFG[type] || CFG.info;
  return (
    <div
      role="status"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
        padding: '12px 16px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500,
        animation: 'dropIn 0.15s ease-out', minWidth: 220,
      }}
    >
      {type === 'info' && <span className="cl-spinner" />}
      {type === 'success' && <Svg paths={['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3']} color={c.color} size={15} />}
      {type === 'error' && <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color={c.color} size={15} />}
      {message}
    </div>
  );
}



// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Clientes() {
  const [ctxIndex, setCtxIndex]         = useState(0);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [contextMenuClientId, setContextMenuClientId] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [confirmDeleteClientId, setConfirmDeleteClientId] = useState(null);
  const [deletingClientId, setDeletingClientId] = useState(null);
  const [editClientId, setEditClientId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const {
    clientes, stats, totalCount, totalPages,
    loading, error,
    page, pageSize, setPage,
    filters, updateFilter, resetFilters,
    refetch,
  } = useClientes();

  const filterBtnRef  = useRef(null);
  const filterDropRef = useRef(null);
  const exportBtnRef  = useRef(null);
  const exportDropRef = useRef(null);
  const importBtnRef  = useRef(null);
  const importDropRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info', autoHideMs = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    if (autoHideMs) {
      toastTimerRef.current = setTimeout(() => setToast(null), autoHideMs);
    }
  }, []);

  // Al cambiar de página o filtros, el índice de la última fila clickeada ya no aplica
  useEffect(() => {
    setLastSelectedIndex(null);
  }, [page, filters.search, filters.estado, filters.tipo, filters.fecha_desde, filters.fecha_hasta]);

  // Cerrar dropdowns (filtros / exportar / importar) al hacer clic fuera
  useEffect(() => {
    function handle(e) {
      if (filterOpen &&
          filterDropRef.current && !filterDropRef.current.contains(e.target) &&
          filterBtnRef.current  && !filterBtnRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
      if (exportOpen &&
          exportDropRef.current && !exportDropRef.current.contains(e.target) &&
          exportBtnRef.current  && !exportBtnRef.current.contains(e.target)) {
        setExportOpen(false);
      }
      if (importOpen &&
          importDropRef.current && !importDropRef.current.contains(e.target) &&
          importBtnRef.current  && !importBtnRef.current.contains(e.target)) {
        setImportOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [filterOpen, exportOpen, importOpen]);

  // Limpiar timer del toast al desmontar
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const handleExport = async (format) => {
    setExporting(true);
    showToast('Generando archivo...', 'info', 0);
    try {
      await exportClientes(format, {
        search: filters.search,
        estado: filters.estado,
        tipo: filters.tipo,
        fecha_desde: filters.fecha_desde,
        fecha_hasta: filters.fecha_hasta,
      });
      showToast('Archivo descargado con éxito', 'success');
    } catch (err) {
      showToast(`Error al exportar: ${err.message}`, 'error', 5000);
    } finally {
      setExporting(false);
    }
  };

  const handleImportSuccess = (resultado) => {
    setImportModalOpen(false);
    refetch();
    const { creados = [], actualizados = [], errores = [] } = resultado || {};
    if (errores.length > 0) {
      showToast(`Importados ${creados.length + actualizados.length}, ${errores.length} con errores`, 'error', 6000);
    } else {
      showToast(`Clientes importados con éxito (${creados.length} nuevos, ${actualizados.length} actualizados)`, 'success', 5000);
    }
  };

  const handleEditClient = (clientId) => {
    setEditClientId(clientId);
  };

  const handleDeleteClient = (clientId) => {
    setConfirmDeleteClientId(clientId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteClientId) return;
    setDeletingClientId(confirmDeleteClientId);

    try {
      await deleteCliente(confirmDeleteClientId);
      setConfirmDeleteClientId(null);
      setDeletingClientId(null);
      refetch();
    } catch (err) {
      alert(`Error al eliminar cliente: ${err.message}`);
      setDeletingClientId(null);
    }
  };

  const handleChangeStatus = async (clientId) => {
    const cliente = clientes.find(c => c.id === clientId);
    if (!cliente) return;

    const nuevoEstado = cliente.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const isActive = nuevoEstado === 'Activo';

    try {
      await updateClienteStatus(clientId, isActive);
      refetch();
    } catch (err) {
      alert(`Error al cambiar estado: ${err.message}`);
    }
  };

  const handleOpenContextMenu = (e, clientId) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenuClientId(clientId);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Selección múltiple: click normal togglea, shift+click selecciona rango (sobre la página actual)
  const handleRowSelect = useCallback((e, clientId, index) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          if (clientes[i]) next.add(clientes[i].id);
        }
      } else if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
    if (!e.shiftKey) setLastSelectedIndex(index);
  }, [clientes, lastSelectedIndex]);

  const pageIds = clientes.map(c => c.id);
  const selectedOnPageCount = pageIds.filter(id => selectedIds.has(id)).length;
  const allPageSelected = pageIds.length > 0 && selectedOnPageCount === pageIds.length;
  const somePageSelected = selectedOnPageCount > 0 && !allPageSelected;

  const handleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteCliente(id)));
      setBulkDeleteOpen(false);
      setBulkDeleting(false);
      clearSelection();
      refetch();
    } catch (err) {
      alert(`Error al eliminar clientes: ${err.message}`);
      setBulkDeleting(false);
    }
  };

  const dateDisplay = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date());

  const activeFilterCount = [
    filters.estado !== 'Todos',
    filters.tipo   !== 'Todos',
    !!filters.fecha_desde,
    !!filters.fecha_hasta,
  ].filter(Boolean).length;

  return (
    <div className="clientes-page">
      {/* ── Topbar ── */}
      <div className="cl-topbar">
        <div className="cl-topbar-left">
          <p>Enfoque Platform</p>
          <h1>Clientes</h1>
        </div>
        <div className="cl-topbar-right">
          <span className="cl-topbar-date">{dateDisplay}</span>
          <div className="cl-topbar-divider" />
          <div className="cl-ctx-badge">
            <span className="cl-ctx-dot" />
            {CONTEXTS[ctxIndex]}
            <Svg paths={['M6 9l6 6 6-6']} color="#2563eb" size={10} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="cl-body">
        {/* Stats */}
        <div className="cl-stats-grid">
          <div className="cl-stat-card">
            <div className="cl-stat-icon blue">
              <Svg paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75']} circles={[{cx:9,cy:7,r:4}]} color="#2563eb" size={18} />
            </div>
            <div>
              <p className="cl-stat-label">Total Clientes</p>
              <p className="cl-stat-value blue">{loading ? '—' : stats.total.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="cl-stat-card">
            <div className="cl-stat-icon green">
              <Svg paths={['M22 11.08V12a10 10 0 1 1-5.93-9.14','M22 4 12 14.01l-3-3']} color="#15803d" size={18} />
            </div>
            <div>
              <p className="cl-stat-label">Activos</p>
              <p className="cl-stat-value green">{loading ? '—' : stats.activos.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="cl-stat-card amber">
            <div className="cl-stat-icon amber">
              <Svg paths={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 6v6l4 2']} color="#d97706" size={18} />
            </div>
            <div>
              <p className="cl-stat-label" style={{ color: '#92400e' }}>En Revisión</p>
              <p className="cl-stat-value amber">{loading ? '—' : stats.en_revision.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="cl-stat-card">
            <div className="cl-stat-icon gray">
              <Svg paths={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M4.93 4.93l14.14 14.14']} color="#b0aaa3" size={18} />
            </div>
            <div>
              <p className="cl-stat-label">Inactivos</p>
              <p className="cl-stat-value gray">{loading ? '—' : stats.inactivos.toLocaleString('es-CL')}</p>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="cl-table-card">
          {/* Toolbar */}
          <div className="cl-toolbar">
            <div className="cl-search-wrapper">
              <div className="cl-search-icon">
                <Svg paths={['M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z']} color="#b0aaa3" size={14} />
              </div>
              <input
                id="clientes-search"
                type="text"
                className="cl-search-input"
                placeholder="Buscar cliente, RUT, sector…"
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
              />
            </div>

            {/* Date Range */}
            <div className="cl-date-range">
              <Svg paths={['M8 2v4','M16 2v4','M3 10h18','M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']} color="#b0aaa3" size={13} />
              <input
                type="date"
                className="cl-date-input"
                value={filters.fecha_desde}
                onChange={e => updateFilter('fecha_desde', e.target.value)}
              />
              <span className="cl-date-sep">→</span>
              <input
                type="date"
                className="cl-date-input"
                value={filters.fecha_hasta}
                onChange={e => updateFilter('fecha_hasta', e.target.value)}
              />
            </div>

            {/* Filter */}
            <div className="cl-filter-btn-wrap">
              <button
                id="clientes-filter-btn"
                ref={filterBtnRef}
                className={`cl-filter-btn ${filterOpen ? 'active' : ''}`}
                onClick={() => setFilterOpen(o => !o)}
              >
                <Svg paths={['M4 6h16M7 12h10M10 18h4']} color={filterOpen ? '#2563eb' : '#7c7670'} size={14} />
                Filtrar
                {activeFilterCount > 0 && <span className="cl-filter-count">{activeFilterCount}</span>}
              </button>
              {filterOpen && (
                <div ref={filterDropRef}>
                  <FilterDropdown
                    onClose={() => setFilterOpen(false)}
                    filters={filters}
                    updateFilter={updateFilter}
                    anchorRef={filterBtnRef}
                  />
                </div>
              )}
            </div>

            <div className="cl-spacer" />

            <div className="cl-filter-btn-wrap">
              <button
                id="clientes-import-btn"
                ref={importBtnRef}
                className={`cl-btn ${importOpen ? 'active' : ''}`}
                onClick={() => setImportOpen(o => !o)}
              >
                <Svg paths={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M17 8l-5-5-5 5','M12 3v12']} color="#7c7670" size={14} />
                Importar
              </button>
              {importOpen && (
                <div ref={importDropRef}>
                  <ActionDropdown
                    anchorRef={importBtnRef}
                    onClose={() => setImportOpen(false)}
                    items={[
                      {
                        label: 'Importar desde Excel',
                        icon: <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="#7c7670" size={14} />,
                        onClick: () => setImportModalOpen(true),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            <div className="cl-filter-btn-wrap">
              <button
                id="clientes-export-btn"
                ref={exportBtnRef}
                className={`cl-btn ${exportOpen ? 'active' : ''}`}
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
              >
                <Svg paths={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3']} color="#7c7670" size={14} />
                Exportar
              </button>
              {exportOpen && (
                <div ref={exportDropRef}>
                  <ActionDropdown
                    anchorRef={exportBtnRef}
                    onClose={() => setExportOpen(false)}
                    items={[
                      {
                        label: 'Exportar a Excel (.xlsx)',
                        icon: <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="#15803d" size={14} />,
                        onClick: () => handleExport('excel'),
                      },
                      {
                        label: 'Exportar a CSV',
                        icon: <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="#7c7670" size={14} />,
                        onClick: () => handleExport('csv'),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            <button
              id="clientes-new-btn"
              className="cl-btn-primary"
              onClick={() => setNewClientModalOpen(true)}
            >
              <Svg paths={['M12 5v14','M5 12h14']} color="#fff" size={14} />
              Nuevo Cliente
            </button>
          </div>

          {/* Active Filters Bar */}
          {activeFilterCount > 0 && (
            <div className="cl-active-filters">
              <span className="cl-filter-bar-label">Filtros activos:</span>
              {filters.estado !== 'Todos' && (
                <span className="cl-filter-tag active">
                  Estado: {filters.estado}
                  <button style={{ background:'none',border:'none',cursor:'pointer',padding:0,color:'inherit',fontWeight:700,marginLeft:2 }}
                    onClick={() => updateFilter('estado','Todos')} aria-label="Quitar filtro estado">×</button>
                </span>
              )}
              {filters.tipo !== 'Todos' && (
                <span className="cl-filter-tag active">
                  Tipo: {FILTER_TIPO_LABELS[filters.tipo] || filters.tipo}
                  <button style={{ background:'none',border:'none',cursor:'pointer',padding:0,color:'inherit',fontWeight:700,marginLeft:2 }}
                    onClick={() => updateFilter('tipo','Todos')} aria-label="Quitar filtro tipo">×</button>
                </span>
              )}
              {(filters.fecha_desde || filters.fecha_hasta) && (
                <span className="cl-filter-tag active">
                  {filters.fecha_desde || '…'} → {filters.fecha_hasta || '…'}
                  <button style={{ background:'none',border:'none',cursor:'pointer',padding:0,color:'inherit',fontWeight:700,marginLeft:2 }}
                    onClick={() => { updateFilter('fecha_desde',''); updateFilter('fecha_hasta',''); }} aria-label="Quitar filtro fecha">×</button>
                </span>
              )}
              <button className="cl-clear-filters" onClick={resetFilters}>Limpiar filtros</button>
            </div>
          )}

          {/* Bulk selection bar */}
          {selectedIds.size > 0 && (
            <div className="cl-bulk-bar">
              <span><b>{selectedIds.size}</b> seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
              <div className="cl-bulk-spacer" />
              <button className="cl-bulk-btn danger" onClick={() => setBulkDeleteOpen(true)}>
                <Svg paths={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} color="#dc2626" size={13} />
                Eliminar seleccionados
              </button>
              <button className="cl-bulk-btn" onClick={clearSelection}>
                Cancelar selección
              </button>
            </div>
          )}

          {/* Table Header */}
          <div className="cl-thead" role="row">
            <span className="cl-th-check">
              <IndeterminateCheckbox
                checked={allPageSelected}
                indeterminate={somePageSelected}
                onChange={handleSelectAllPage}
                disabled={pageIds.length === 0}
                aria-label="Seleccionar todos los clientes de la página"
              />
            </span>
            <span className="cl-th">
              Razón Social
              <Svg paths={['M8 9l4-4 4 4','M16 15l-4 4-4-4']} color="#2563eb" size={12} />
            </span>
            <span className="cl-th">ID Fiscal</span>
            <span className="cl-th">Sector</span>
            <span className="cl-th">Contacto</span>
            <span className="cl-th">Tipo</span>
            <span className="cl-th">Estado</span>
            <span className="cl-th">Contratos</span>
            <span className="cl-th">Acciones</span>
          </div>

          {/* Table Body */}
          <div className="cl-tbody" role="list">
            {error ? (
              <ErrorBanner message={error} onRetry={refetch} />
            ) : loading ? (
              Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            ) : clientes.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#b0aaa3', fontSize: 13 }}>
                No se encontraron clientes con los filtros actuales.
              </div>
            ) : (
              clientes.map((c, idx) => {
                const avatar   = getAvatarStyle(c.razon_social || c.nombre_comercial || '');
                const isSelected = selectedClientId === c.id;
                const isChecked  = selectedIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={`cl-row ${isSelected ? 'selected' : ''} ${isChecked ? 'checked' : ''}`}
                    role="listitem"
                    onClick={() => setSelectedClientId(isSelected ? null : c.id)}
                  >
                    {/* Checkbox */}
                    <div className="cl-cell-check">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => handleRowSelect(e, c.id, idx)}
                        aria-label={`Seleccionar ${c.razon_social}`}
                      />
                    </div>

                    {/* Razón Social */}
                    <div className="cl-cell-company">
                      <div className="cl-avatar" style={{ background: avatar.bg, color: avatar.color }}>
                        {avatar.initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cl-company-name">{c.razon_social}</div>
                        <div className="cl-company-sub">{c.nombre_comercial}</div>
                      </div>
                    </div>

                    {/* ID Fiscal */}
                    <div className="cl-cell-rut">{c.id_fiscal}</div>

                    {/* Sector */}
                    <div className="cl-cell-sector">{c.sector}</div>

                    {/* Contacto */}
                    <div style={{ minWidth: 0 }}>
                      <div className="cl-contact-name">{c.contacto_principal || c.razon_social}</div>
                      <div className="cl-contact-tel">{c.contacto_tel || c.email}</div>
                    </div>

                    {/* Tipo */}
                    <TipoBadge tipo={c.tipo} />

                    {/* Estado */}
                    <StatusBadge estado={c.estado} />

                    {/* Contratos */}
                    <div className="cl-cell-contracts">
                      <span className="cl-contract-num">{c.contratos_count}</span>
                      <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z']} color="#b0aaa3" size={12} />
                    </div>

                    {/* Acciones */}
                    <div className="cl-cell-actions">
                      <button
                        className="cl-action-btn"
                        title="Ver perfil"
                        id={`clientes-view-${c.id}`}
                        onClick={e => { e.stopPropagation(); setSelectedClientId(c.id); }}
                      >
                        <Svg paths={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z']} circles={[{cx:12,cy:12,r:3}]} color="#7c7670" size={13} />
                      </button>
                      <button
                        className="cl-action-btn"
                        title="Más opciones"
                        id={`clientes-more-${c.id}`}
                        onClick={e => handleOpenContextMenu(e, c.id)}
                      >
                        <Svg paths={['M12 5v.01','M12 12v.01','M12 19v.01','M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z']} color="#7c7670" size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && totalCount > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              setPage={setPage}
              itemName="clientes"
            />
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedClientId && (
        <DetailPanel
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
        />
      )}

      {/* New Client Modal */}
      {newClientModalOpen && (
        <NewClientModal
          onClose={() => setNewClientModalOpen(false)}
          onSuccess={() => {
            refetch();
            setNewClientModalOpen(false);
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenuClientId && (
        <ContextMenu
          clientId={contextMenuClientId}
          pos={contextMenuPos}
          onClose={() => setContextMenuClientId(null)}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onChangeStatus={handleChangeStatus}
          clientEstado={clientes.find(c => c.id === contextMenuClientId)?.estado || 'Activo'}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteClientId && (
        <ConfirmModal
          title="Eliminar cliente"
          message={`¿Eliminar cliente "${clientes.find(c => c.id === confirmDeleteClientId)?.razon_social || clientes.find(c => c.id === confirmDeleteClientId)?.nombre_comercial || ''}"? Esta acción no se puede deshacer.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteClientId(null)}
          loading={deletingClientId === confirmDeleteClientId}
          isDangerous
        />
      )}

      {/* Bulk Delete Confirm Modal */}
      {bulkDeleteOpen && (
        <ConfirmModal
          title="Eliminar clientes"
          message={`¿Eliminar ${selectedIds.size} cliente${selectedIds.size !== 1 ? 's' : ''} seleccionado${selectedIds.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkDeleting}
          isDangerous
        />
      )}

      {/* Edit Client Modal */}
      {editClientId && (
        <EditClientModal
          clientId={editClientId}
          onClose={() => setEditClientId(null)}
          onSuccess={() => {
            refetch();
            setEditClientId(null);
          }}
        />
      )}

      {/* Import Clients Modal */}
      {importModalOpen && (
        <ImportClientsModal
          onClose={() => setImportModalOpen(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
