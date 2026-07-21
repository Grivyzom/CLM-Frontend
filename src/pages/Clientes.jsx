import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { getClienteDetail, getContratos, deleteCliente, updateClienteStatus, exportClientes } from '../api';
import { useClientes } from '../hooks/useClientes';
import { useAuth } from '../contexts/AuthContext';

gsap.registerPlugin(useGSAP);
import NewClientModal from './NewClientModal';
import EditClientModal from './EditClientModal';
import ImportClientsModal from './ImportClientsModal';
import './Clientes.css';
import Pagination from '../components/ui/Pagination';
import SortableHeader from '../components/ui/SortableHeader';
import Svg from '../components/ui/Svg';
import StatusBadge from '../components/ui/StatusBadge';
import TipoBadge from '../components/ui/TipoBadge';
import SkeletonRow from '../components/ui/SkeletonRow';
import ErrorBanner from '../components/ui/ErrorBanner';
import IndeterminateCheckbox from '../components/ui/IndeterminateCheckbox';
import CopyableValue from '../components/ui/CopyableValue';
import { useConfirm } from '../contexts/ConfirmContext';
import ContextMenu from '../components/ui/ContextMenu';
import ActionDropdown from '../components/ui/ActionDropdown';
import Toast from '../components/ui/Toast';
import TopbarActions from '../components/layout/TopbarActions';
import { fmtMoney, fmtDate, contratoIdDisplay, clienteIdDisplay } from '../utils/formatters';
import SEO from '../components/SEO';

// ─── Constantes visuales ─────────────────────────────────────────────────────
const FILTER_ESTADOS  = ['Todos', 'Activo', 'En revisión', 'Inactivo'];
const FILTER_TIPOS    = ['Todos', 'juridica', 'natural'];
const FILTER_TIPO_LABELS = { Todos: 'Todos', juridica: 'Empresa', natural: 'Persona Natural' };

const CATEGORIA_META = {
  COBRE: { label: 'Cobre', color: 'var(--orange)', bg: 'var(--orange-tint)' },
  PLATA: { label: 'Plata', color: 'var(--text-muted)', bg: 'var(--neutral-200)' },
  PLATINO: { label: 'Platino', color: 'var(--cyan-deep)', bg: 'var(--cyan-tint)' },
  DIAMANTE: { label: 'Diamante', color: 'var(--indigo)', bg: 'var(--indigo-bg)' },
  OBSIDIANA: { label: 'Obsidiana', color: 'var(--violet-deep)', bg: 'var(--violet-tint)' },
};

// Generar iniciales + color del avatar a partir del nombre/razón social
function getAvatarStyle(name = '') {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name.substring(0, 2)).toUpperCase();

  const PALETTE = [
    { color: 'var(--primary)', bg: 'rgba(37, 99, 235, 0.1)' },
    { color: 'var(--cyan)', bg: 'var(--cyan-tint)' },
    { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
    { color: 'var(--violet-bright)', bg: 'var(--violet-border)' },
    { color: 'var(--rose)', bg: 'var(--rose-border)' },
    { color: 'var(--warning-bright)', bg: 'var(--warning-border)' },
    { color: 'var(--sky)', bg: 'var(--sky-border)' },
    { color: 'var(--teal)', bg: 'var(--teal-tint)' },
    { color: 'var(--orange)', bg: 'var(--orange-tint)' },
    { color: 'var(--danger)', bg: 'var(--danger-border)' },
  ];
  const idx = (name.charCodeAt(0) || 0) % PALETTE.length;
  return { initials, ...PALETTE[idx] };
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

// Colores por status de contrato (sub-vista contratos del DetailPanel)
const CONTRACT_STATUS_STYLE = {
  ACTIVO:  { color: 'var(--success-deep)', bg: 'var(--success-bg)' },
  VENCIDO: { color: 'var(--danger)', bg: 'var(--danger-border)' },
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ clientId, onClose }) {
  const navigate = useNavigate();
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  // 'info' = ficha del cliente | 'contratos' = listado de sus contratos
  const [view, setView] = useState('info');
  const [contratos, setContratos] = useState(null);
  const [contratosError, setContratosError] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    setView('info');
    setContratos(null);
    getClienteDetail(clientId)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  // Carga perezosa del listado de contratos al entrar a la sub-vista
  useEffect(() => {
    if (view !== 'contratos' || contratos !== null) return;
    let cancelled = false;
    setContratosError(null);
    getContratos({ cliente: clientId, page_size: 100, ordering: '-renovacion' })
      .then(d => { if (!cancelled) setContratos(d.results || []); })
      .catch(e => { if (!cancelled) setContratosError(e.message); })
    return () => { cancelled = true; };
  }, [view, contratos, clientId]);

  // Escape: en sub-vista vuelve a la ficha; en ficha cierra el panel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (view === 'contratos') setView('info');
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, onClose]);

  const goNuevoContrato = () => navigate(`/contratos?nuevo=1&cliente=${clientId}`);

  // Auto-draw SVG icons inside the detail panel on load. Lecturas de
  // getTotalLength() en lote antes de escribir estilos (evita layout thrashing).
  useGSAP(() => {
    if (loading) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const paths = panelRef.current?.querySelectorAll(
      'svg.clm-svg path, svg.clm-svg circle, svg.clm-svg rect, svg.clm-svg line, svg.clm-svg polyline'
    );
    if (!paths || paths.length === 0) return;

    const measured = [];
    paths.forEach(path => {
      try {
        const length = path.getTotalLength();
        if (length > 0) measured.push([path, length]);
      } catch (e) {}
    });
    measured.forEach(([path, length]) => {
      gsap.fromTo(path,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          clearProps: 'strokeDasharray,strokeDashoffset'
        }
      );
    });
  }, { dependencies: [loading, detail, view], scope: panelRef });

  // Draw SVG icons on hover inside the detail panel
  useGSAP(() => {
    if (loading) return;
    const handleMouseEnter = (e) => {
      const paths = e.currentTarget.querySelectorAll(
        'svg.clm-svg path, svg.clm-svg circle, svg.clm-svg rect, svg.clm-svg line, svg.clm-svg polyline'
      );
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) {
            gsap.fromTo(path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.6,
                ease: 'power2.out',
                clearProps: 'strokeDasharray,strokeDashoffset'
              }
            );
          }
        } catch (e) {}
      });
    };

    const interactiveElements = panelRef.current?.querySelectorAll(
      '.cl-detail-close, .cl-detail-header-left, .cl-detail-section-title, span[title]'
    );

    if (interactiveElements) {
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter, { once: true });
      });
    }

    return () => {
      if (interactiveElements) {
        interactiveElements.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter);
        });
      }
    };
  }, { dependencies: [loading, detail, view], scope: panelRef });

  if (!clientId) return null;

  const avatar = detail ? getAvatarStyle(detail.razon_social || detail.nombre_comercial || '') : { initials: '…', color: 'var(--text-faint)', bg: 'var(--neutral-200)' };

  return (
    <div className="cl-detail-panel" ref={panelRef} role="dialog" aria-label="Detalle de cliente">
      {/* Header */}
      <div className="cl-detail-header">
        <div className="cl-detail-header-left">
          {view === 'contratos' && (
            <button
              className="cl-detail-close"
              onClick={() => setView('info')}
              aria-label="Volver a la ficha del cliente"
              title="Volver"
            >
              <Svg paths={['M19 12H5','M12 19l-7-7 7-7']} color="var(--text-faint)" size={13} />
            </button>
          )}
          <div className="cl-detail-avatar" style={{ background: avatar.bg, color: avatar.color }}>
            {loading ? '…' : avatar.initials}
          </div>
          <div>
            {loading
              ? <div style={{ width: 160, height: 14, background: 'var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }} />
              : <h2 className="cl-detail-name">{detail?.razon_social || '—'}</h2>
            }
            {loading
              ? <div style={{ width: 100, height: 10, background: 'var(--neutral-200)', borderRadius: 'var(--radius-sm)' }} />
              : <p className="cl-detail-sub">
                  {view === 'contratos' 
                    ? 'Contratos del cliente' 
                    : (detail?.tipo === 'natural' ? 'Persona Natural' : (detail?.nombre_comercial || ''))}
                </p>
            }
          </div>
        </div>
        <button className="cl-detail-close" onClick={onClose} aria-label="Cerrar panel">
          <Svg paths={['M18 6 6 18','M6 6l12 12']} color="var(--text-faint)" size={13} />
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 20px', color: 'var(--danger)', fontSize: 12 }}>
          Error al cargar: {error}
        </div>
      )}

      {/* Badges */}
      {detail && view === 'info' && (
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
              <div key={i} style={{ height: 12, borderRadius: 'var(--radius-sm)', background: 'var(--neutral-200)', width: `${60 + i * 8}%` }} />
            ))}
          </div>
        ) : detail && view === 'info' ? (
          detail.tipo === 'juridica' ? (
            <>
              {/* --- VISTA EMPRESA --- */}
              {/* Identificación de la Empresa */}
              <div>
                <p className="cl-detail-section-title">
                  <Svg paths={['M3 21h18', 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16', 'M9 7h6', 'M9 11h6', 'M9 15h6']} color="var(--text-faint)" size={12} />
                  Ficha de la Empresa
                </p>
                <div className="cl-detail-rows">
                  <DetailRow label="Razón Social">
                    {detail.razon_social ? <CopyableValue value={detail.razon_social} /> : '—'}
                  </DetailRow>
                  <DetailRow label="Nombre Comercial">
                    {detail.nombre_comercial ? <CopyableValue value={detail.nombre_comercial} /> : '—'}
                  </DetailRow>
                  <DetailRow label="RUT">
                    <CopyableValue value={detail.id_fiscal}>
                      <span className="cl-rut-value">{detail.id_fiscal}</span>
                    </CopyableValue>
                  </DetailRow>
                  <DetailRow label="Giro / Sector">{detail.sector}</DetailRow>
                  {detail.personal_count !== undefined && (
                    <DetailRow label="Personal Registrado">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Svg paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M16 3.13a4 4 0 0 1 0 7.75']} circles={[{ cx: 9, cy: 7, r: 4 }]} size={11} color="var(--text-muted)" />
                        <span>{detail.personal_count} {detail.personal_count === 1 ? 'usuario' : 'usuarios'}</span>
                      </div>
                    </DetailRow>
                  )}
                  <DetailRow label="Registrado">
                    {new Date(detail.fecha_registro).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </DetailRow>
                  <DetailRow label="Última Modificación">
                    {detail.fecha_modificacion
                      ? new Date(detail.fecha_modificacion).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </DetailRow>
                </div>
              </div>

              {/* Suscripción */}
              {detail.tenant_name && (
                <div>
                  <p className="cl-detail-section-title">
                    <Svg paths={['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']} color="var(--text-faint)" size={12} />
                    Suscripción a la Plataforma
                  </p>
                  <div className="cl-detail-rows">
                    <DetailRow label="Cuenta (Tenant)">{detail.tenant_name}</DetailRow>
                    {detail.tenant_categoria && (
                      <DetailRow label="Plan de Suscripción">
                        <span className="cl-membership-badge" style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: CATEGORIA_META[detail.tenant_categoria.toUpperCase()]?.color || 'var(--text-secondary)',
                          background: CATEGORIA_META[detail.tenant_categoria.toUpperCase()]?.bg || 'var(--neutral-200)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {CATEGORIA_META[detail.tenant_categoria.toUpperCase()]?.label || detail.tenant_categoria}
                        </span>
                      </DetailRow>
                    )}
                    {detail.tenant_estado && (
                      <DetailRow label="Estado Suscripción">
                        {detail.tenant_estado.charAt(0) + detail.tenant_estado.slice(1).toLowerCase()}
                      </DetailRow>
                    )}
                  </div>
                </div>
              )}

              {/* Representante / Contacto */}
              <div>
                <p className="cl-detail-section-title">
                  <Svg paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2']} circles={[{ cx: 9, cy: 7, r: 4 }]} color="var(--text-faint)" size={12} />
                  Contacto Representante
                </p>
                <div className="cl-detail-rows">
                  <DetailRow label="Nombre">
                    {detail.contacto_principal ? <CopyableValue value={detail.contacto_principal} /> : '—'}
                  </DetailRow>
                  <DetailRow label="Correo Electrónico">
                    {detail.email ? <CopyableValue value={detail.email} /> : '—'}
                  </DetailRow>
                  <DetailRow label="Teléfono de Contacto">
                    {detail.telefono || detail.contacto_tel ? <CopyableValue value={detail.telefono || detail.contacto_tel} /> : '—'}
                  </DetailRow>
                  {detail.contactos?.length > 0 && (
                    <DetailRow label="Cargo / Rol">{detail.contactos[0].cargo}</DetailRow>
                  )}
                </div>
              </div>


            </>
          ) : (
            <>
              {/* --- VISTA PERSONA --- */}
              {/* Identificación de la Persona */}
              <div>
                <p className="cl-detail-section-title">
                  <Svg paths={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2']} circles={[{ cx: 12, cy: 7, r: 4 }]} color="var(--text-faint)" size={12} />
                  Ficha de la Persona
                </p>
                <div className="cl-detail-rows">
                  <DetailRow label="Nombre Completo">
                    {detail.razon_social ? <CopyableValue value={detail.razon_social} /> : '—'}
                  </DetailRow>
                  <DetailRow label="RUN">
                    <CopyableValue value={detail.id_fiscal}>
                      <span className="cl-rut-value">{detail.id_fiscal}</span>
                    </CopyableValue>
                  </DetailRow>
                  <DetailRow label="Correo Electrónico">
                    {detail.email ? <CopyableValue value={detail.email} /> : '—'}
                  </DetailRow>
                  <DetailRow label="Teléfono de Contacto">
                    {detail.telefono || detail.contacto_tel ? <CopyableValue value={detail.telefono || detail.contacto_tel} /> : '—'}
                  </DetailRow>
                  <DetailRow label="Tipo de Cliente">Persona Natural</DetailRow>
                  <DetailRow label="Registrado">
                    {new Date(detail.fecha_registro).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </DetailRow>
                  <DetailRow label="Última Modificación">
                    {detail.fecha_modificacion
                      ? new Date(detail.fecha_modificacion).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </DetailRow>
                </div>
              </div>


            </>
          )
        ) : detail && view === 'contratos' ? (
          <div>
            <p className="cl-detail-section-title">
              <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M16 13H8','M16 17H8']} color="var(--text-faint)" size={12} />
              Todos los contratos {contratos ? `(${contratos.length})` : ''}
            </p>

            {contratosError && (
              <div style={{ padding: '12px 0', color: 'var(--danger)', fontSize: 12 }}>
                Error al cargar contratos: {contratosError}
              </div>
            )}

            {!contratos && !contratosError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 52, borderRadius: 'var(--radius-lg)', background: 'var(--neutral-200)' }} />
                ))}
              </div>
            )}

            {contratos && contratos.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
                Este cliente no tiene contratos registrados
              </div>
            )}

            {contratos && contratos.length > 0 && (
              <div style={{ marginTop: 8, border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {contratos.map((c, i) => {
                  const st = CONTRACT_STATUS_STYLE[c.status] || { color: 'var(--text-muted)', bg: 'var(--neutral-200)' };
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/contratos/${c.id}`)}
                      title="Ver detalle del contrato"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderBottom: i < contratos.length - 1 ? '1px solid var(--bg-topbar)' : 'none',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.nombre}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                            {contratoIdDisplay(c.id)} · {c.etapa_display}
                            {c.fecha_vencimiento ? ` · vence ${fmtDate(c.fecha_vencimiento)}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 999 }}>
                            {c.status_display?.toUpperCase() || c.status}
                          </span>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                            {fmtMoney(c.monto)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      {detail && (
        <div className="cl-detail-footer">
          {view === 'info' ? (
            <button
              className="cl-detail-footer-btn secondary"
              disabled={!detail.contratos_count}
              style={!detail.contratos_count ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              onClick={() => setView('contratos')}
            >
              Ver contratos
            </button>
          ) : (
            <button className="cl-detail-footer-btn secondary" onClick={() => setView('info')}>
              Volver a la ficha
            </button>
          )}
          <button className="cl-detail-footer-btn secondary" onClick={() => navigate(`/clientes/${clientId}`)}>
            Workspace
          </button>
          <button className="cl-detail-footer-btn primary" onClick={goNuevoContrato}>
            Nuevo contrato
          </button>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Clientes() {
  const { canWrite, user } = useAuth();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen]     = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [contextMenuClientId, setContextMenuClientId] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [editClientId, setEditClientId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
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
    updateClientLocally,
    addClientLocally,
  } = useClientes();

  const { confirm, alert: alertModal } = useConfirm();

  const clientesPageRef = useRef(null);

  // Auto-draw SVG icons on page load or loading finished. Lecturas de
  // getTotalLength() en lote antes de escribir estilos (evita layout thrashing).
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const paths = clientesPageRef.current?.querySelectorAll(
      'svg.clm-svg path, svg.clm-svg circle, svg.clm-svg rect, svg.clm-svg line, svg.clm-svg polyline'
    );
    if (!paths || paths.length === 0) return;

    const measured = [];
    paths.forEach(path => {
      try {
        const length = path.getTotalLength();
        if (length > 0) measured.push([path, length]);
      } catch (e) {}
    });
    measured.forEach(([path, length]) => {
      gsap.fromTo(path,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          clearProps: 'strokeDasharray,strokeDashoffset'
        }
      );
    });
  }, { dependencies: [loading], scope: clientesPageRef });

  // Draw SVG icons on hover of interactive elements
  useGSAP(() => {
    const handleMouseEnter = (e) => {
      const paths = e.currentTarget.querySelectorAll(
        'svg.clm-svg path, svg.clm-svg circle, svg.clm-svg rect, svg.clm-svg line, svg.clm-svg polyline'
      );
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) {
            gsap.fromTo(path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.8,
                ease: 'power2.out',
                clearProps: 'strokeDasharray,strokeDashoffset'
              }
            );
          }
        } catch (e) {}
      });
    };

    const interactiveElements = clientesPageRef.current?.querySelectorAll(
      '.cl-btn, .cl-filter-btn, .cl-row, .cl-stat-card'
    );

    if (interactiveElements) {
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter, { once: true });
      });
    }

    return () => {
      if (interactiveElements) {
        interactiveElements.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter);
        });
      }
    };
  }, { dependencies: [loading], scope: clientesPageRef });

  const filterBtnRef  = useRef(null);
  const filterDropRef = useRef(null);
  const exportBtnRef  = useRef(null);
  const exportDropRef = useRef(null);
  const importBtnRef  = useRef(null);
  const importDropRef = useRef(null);
  const toastTimerRef = useRef(null);
  const exportAbortRef = useRef(null);

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
  }, [page, filters.search, filters.estado, filters.tipo, filters.fecha_desde, filters.fecha_hasta, filters.ordering]);

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

  // Limpiar timer del toast y abortar export en curso al desmontar
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    exportAbortRef.current?.abort();
  }, []);

  const handleExport = async (format) => {
    const ids = Array.from(selectedIds);
    const controller = new AbortController();
    exportAbortRef.current = controller;

    setExporting(true);
    showToast(
      ids.length > 0 ? `Generando archivo (${ids.length} seleccionados)...` : 'Generando archivo...',
      'info',
      0,
    );

    try {
      await exportClientes(format, {
        search: filters.search,
        estado: filters.estado,
        tipo: filters.tipo,
        fecha_desde: filters.fecha_desde,
        fecha_hasta: filters.fecha_hasta,
      }, { ids, signal: controller.signal });
      showToast('Archivo descargado con éxito', 'success');
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Exportación cancelada', 'cancelled', 2500);
      } else {
        showToast(`Error al exportar: ${err.message}`, 'error', 5000);
      }
    } finally {
      setExporting(false);
      exportAbortRef.current = null;
    }
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
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

  const handleDeleteClient = async (clientId) => {
    try {
      const isConfirmed = await confirm({
        title: "Eliminar cliente",
        message: `¿Eliminar cliente "${clientes.find(c => c.id === clientId)?.razon_social || clientes.find(c => c.id === clientId)?.nombre_comercial || ''}"? Esta acción no se puede deshacer.`,
        isDangerous: true,
        bypassKey: "delete_client",
        bypassDurationMinutes: 30,
        action: async () => {
          await deleteCliente(clientId);
        }
      });
      if (isConfirmed) refetch();
    } catch (err) {
      alertModal({ title: "Error al eliminar cliente", message: err.message, isDangerous: true });
    }
  };

  const handleChangeStatus = async (clientId) => {
    const cliente = clientes.find(c => c.id === clientId);
    if (!cliente) return;

    const nuevoEstado = cliente.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const isActive = nuevoEstado === 'Activo';

    try {
      const updated = await updateClienteStatus(clientId, isActive);
      updateClientLocally(updated);
    } catch (err) {
      alertModal({ title: "Error al cambiar estado", message: err.message, isDangerous: true });
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
    if (selectedIds.size === 0) return;
    try {
      const isConfirmed = await confirm({
        title: "Eliminar clientes",
        message: `¿Eliminar ${selectedIds.size} cliente${selectedIds.size !== 1 ? 's' : ''} seleccionado${selectedIds.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`,
        isDangerous: true,
        bypassKey: "delete_client_bulk",
        bypassDurationMinutes: 30,
        action: async () => {
          await Promise.all(Array.from(selectedIds).map(id => deleteCliente(id)));
        }
      });
      if (isConfirmed) {
        clearSelection();
        refetch();
      }
    } catch (err) {
      alertModal({ title: "Error al eliminar clientes", message: err.message, isDangerous: true });
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
    <div className="clientes-page" ref={clientesPageRef}>
      <SEO title="Clientes | KyoCLM" description="Gestión de clientes y contrapartes en KyoCLM." />
      {/* ── Topbar ── */}
      <div className="cl-topbar">
        <div className="cl-topbar-left">
          <p>Enfoque Platform</p>
          <h1>Clientes</h1>
        </div>
        <div className="cl-topbar-right">
          <span className="cl-topbar-date">{dateDisplay}</span>
          <div className="cl-topbar-divider" />
          <TopbarActions />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="cl-body">
        {/* Stats */}
        <div className="cl-stats-grid">
          <div className="cl-stat-card">
            <div className="cl-stat-icon blue">
              <Svg paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75']} circles={[{cx:9,cy:7,r:4}]} color="var(--primary)" size={18} />
            </div>
            <div>
              <p className="cl-stat-label">Total Clientes</p>
              <p className="cl-stat-value blue">{loading ? '—' : stats.total.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="cl-stat-card">
            <div className="cl-stat-icon green">
              <Svg paths={['M22 11.08V12a10 10 0 1 1-5.93-9.14','M22 4 12 14.01l-3-3']} color="var(--success-deep)" size={18} />
            </div>
            <div>
              <p className="cl-stat-label">Activos</p>
              <p className="cl-stat-value green">{loading ? '—' : stats.activos.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="cl-stat-card amber">
            <div className="cl-stat-icon amber">
              <Svg paths={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 6v6l4 2']} color="var(--warning-bright)" size={18} />
            </div>
            <div>
              <p className="cl-stat-label" style={{ color: 'var(--warning-deep)' }}>En Revisión</p>
              <p className="cl-stat-value amber">{loading ? '—' : stats.en_revision.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="cl-stat-card">
            <div className="cl-stat-icon gray">
              <Svg paths={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M4.93 4.93l14.14 14.14']} color="var(--text-faint)" size={18} />
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
                <Svg paths={['M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z']} color="var(--text-faint)" size={14} />
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
              <Svg paths={['M8 2v4','M16 2v4','M3 10h18','M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']} color="var(--text-faint)" size={13} />
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
                <Svg paths={['M4 6h16M7 12h10M10 18h4']} color={filterOpen ? 'var(--primary)' : 'var(--text-muted)'} size={14} />
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
                <Svg paths={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M17 8l-5-5-5 5','M12 3v12']} color="var(--text-muted)" size={14} />
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
                        icon: <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--text-muted)" size={14} />,
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
                <Svg paths={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3']} color="var(--text-muted)" size={14} />
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
                        icon: <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--success-deep)" size={14} />,
                        onClick: () => handleExport('excel'),
                      },
                      {
                        label: 'Exportar a CSV',
                        icon: <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--text-muted)" size={14} />,
                        onClick: () => handleExport('csv'),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            {canWrite && (
              <button
                id="clientes-new-btn"
                className="cl-btn-primary"
                onClick={() => setNewClientModalOpen(true)}
              >
                <Svg paths={['M12 5v14','M5 12h14']} color="var(--text-on-accent)" size={14} />
                Nuevo Cliente
              </button>
            )}
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
              {canWrite && (
                <button className="cl-bulk-btn danger" onClick={handleBulkDelete}>
                  <Svg paths={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} color="var(--danger)" size={13} />
                  Eliminar seleccionados
                </button>
              )}
              <button className="cl-bulk-btn" onClick={clearSelection}>
                Cancelar selección
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="cl-table-wrapper">
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
            <SortableHeader
              className="cl-th"
              label=""
              field="estado"
              ordering={filters.ordering}
              onSort={(next) => updateFilter('ordering', next)}
            />
            <SortableHeader
              className="cl-th"
              label="Razón Social"
              field="razon_social"
              ordering={filters.ordering}
              onSort={(next) => updateFilter('ordering', next)}
            />
            <SortableHeader
              className="cl-th"
              label="ID Fiscal"
              field="id_fiscal"
              ordering={filters.ordering}
              onSort={(next) => updateFilter('ordering', next)}
            />
            <SortableHeader
              className="cl-th"
              label="Sector"
              field="sector"
              ordering={filters.ordering}
              onSort={(next) => updateFilter('ordering', next)}
            />
            <SortableHeader
              className="cl-th"
              label="Contacto"
              field="contacto"
              ordering={filters.ordering}
              onSort={(next) => updateFilter('ordering', next)}
            />
            <SortableHeader
              className="cl-th"
              label="Tipo"
              field="tipo"
              ordering={filters.ordering}
              onSort={(next) => updateFilter('ordering', next)}
            />

            <span className="cl-th">Acciones</span>
          </div>

          {/* Table Body */}
          <div className="cl-tbody" role="list">
            {error ? (
              <ErrorBanner message={error} onRetry={refetch} />
            ) : loading ? (
              Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            ) : clientes.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
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

                    {/* Estado */}
                    <div className="cl-cell-status" title={c.estado} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="cl-status-dot" style={{
                        display: 'inline-block',
                        width: 10, height: 10, borderRadius: '50%',
                        background: c.estado === 'Activo' ? 'var(--success)' : c.estado === 'En revisión' ? 'var(--warning-bright)' : 'var(--border-strong)',
                        boxShadow: `0 0 0 2px ${c.estado === 'Activo' ? 'var(--success-border)' : c.estado === 'En revisión' ? 'var(--warning-border)' : 'var(--border)'}`
                      }} />
                    </div>

                    {/* Razón Social */}
                    <div className="cl-cell-company">
                      <div className="cl-avatar" style={{ background: avatar.bg, color: avatar.color }}>
                        {avatar.initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span className="cl-company-name">{c.razon_social}</span>
                          {c.tenant_categoria && (
                            <span className="cl-membership-badge" style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: CATEGORIA_META[c.tenant_categoria.toUpperCase()]?.color || 'var(--text-secondary)',
                              background: CATEGORIA_META[c.tenant_categoria.toUpperCase()]?.bg || 'var(--neutral-200)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {CATEGORIA_META[c.tenant_categoria.toUpperCase()]?.label || c.tenant_categoria}
                            </span>
                          )}
                        </div>
                        <div className="cl-company-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{clienteIdDisplay(c.id)}</span>
                          {c.tipo === 'juridica' && (
                            <>
                              <span style={{ color: 'var(--text-faint)' }}>•</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                <Svg 
                                  paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M16 3.13a4 4 0 0 1 0 7.75']} 
                                  circles={[{ cx: 9, cy: 7, r: 4 }]} 
                                  size={11} 
                                  color="var(--text-muted)" 
                                />
                                <span>{c.personal_count ?? 0} {c.personal_count === 1 ? 'miembro' : 'miembros'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ID Fiscal */}
                    <div className="cl-cell-rut">{c.id_fiscal}</div>

                    {/* Sector */}
                    <div className="cl-cell-sector">{c.sector}</div>

                    {/* Contacto */}
                    <div style={{ minWidth: 0 }}>
                      <div className="cl-contact-name" style={{ color: c.email ? 'inherit' : 'var(--text-faint)', fontStyle: c.email ? 'normal' : 'italic' }}>
                        {c.email || 'Correo no registrado'}
                      </div>
                      <div className="cl-contact-tel" style={{ color: c.telefono || c.contacto_tel ? 'inherit' : 'var(--text-faint)', fontStyle: c.telefono || c.contacto_tel ? 'normal' : 'italic', marginTop: '2px' }}>
                        {c.telefono || c.contacto_tel || 'Teléfono no registrado'}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div className="cl-cell-tipo" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {c.tipo === 'juridica' ? 'Jurídico' : 'Natural'}
                    </div>

                    {/* Acciones */}
                    <div className="cl-cell-actions" onClick={e => e.stopPropagation()}>
                      <div className="cl-action-group">
                        <button
                          className="cl-action-group-btn"
                          title={`Contratos (${c.contratos_count})`}
                          onClick={e => { e.stopPropagation(); setSelectedClientId(c.id); }}
                          style={{ display: 'flex', gap: 2, padding: '0 4px', width: 'auto' }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{c.contratos_count}</span>
                          <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z']} color="currentColor" size={12} />
                        </button>
                        <button
                          className="cl-action-group-btn"
                          title="Ver perfil"
                          id={`clientes-view-${c.id}`}
                          onClick={e => { e.stopPropagation(); setSelectedClientId(c.id); }}
                        >
                          <Svg paths={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z']} circles={[{cx:12,cy:12,r:3}]} color="currentColor" size={13} />
                        </button>
                        {canWrite && (
                          <button
                            className="cl-action-group-btn"
                            title="Editar"
                            id={`clientes-edit-${c.id}`}
                            onClick={e => { e.stopPropagation(); handleEditClient(c.id); }}
                          >
                            <Svg paths={['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']} color="currentColor" size={13} />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            className="cl-action-group-btn"
                            title="Más opciones"
                            id={`clientes-more-${c.id}`}
                            onClick={e => handleOpenContextMenu(e, c.id)}
                          >
                            <Svg paths={['M12 5v.01','M12 12v.01','M12 19v.01','M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z']} color="currentColor" size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
          onSuccess={(newClient) => {
            addClientLocally(newClient);
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
          onOpenWorkspace={(id) => navigate(`/clientes/${id}`)}
        />
      )}


      {/* Edit Client Modal */}
      {editClientId && (
        <EditClientModal
          clientId={editClientId}
          onClose={() => setEditClientId(null)}
          onSuccess={(updatedClient) => {
            updateClientLocally(updatedClient);
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onCancel={toast.type === 'info' ? handleCancelExport : undefined}
        />
      )}
    </div>
  );
}
