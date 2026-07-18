import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import './Contratos.css';
import { useContratos } from '../hooks/useContratos';
import { getSoftwareList, generarDocumentoContrato } from '../api';
import NewContractModal from './NewContractModal';
import ExportContratosModal from './ExportContratosModal';
import SortableHeader from '../components/ui/SortableHeader';
import Pagination from '../components/ui/Pagination';
import { fmtMoney, fmtDate, contratoIdDisplay } from '../utils/formatters';
import TopbarActions from '../components/layout/TopbarActions';
import { useAuth } from '../contexts/AuthContext';

// ─── Paleta de etapas (workflow legal real: EtapaContrato) ────────────────────
const ETAPA_CFG = {
  BORRADOR:         { label: 'Borrador',           color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', dot: 'var(--warning-bright)' },
  REVISION:         { label: 'En Revisión',        color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-border)', dot: 'var(--violet-bright)' },
  APROBADO:         { label: 'Aprobado',            color: 'var(--cyan-deep)', bg: 'var(--cyan-bg)', border: 'var(--cyan-border)', dot: 'var(--cyan)' },
  PENDIENTE_FIRMA:  { label: 'Pendiente de Firma',  color: 'var(--sky)', bg: 'var(--sky-bg)', border: 'var(--sky-border)', dot: 'var(--sky-deep)' },
  ACTIVO:           { label: 'Activo',              color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)', dot: 'var(--success)' },
  ENMENDADO:        { label: 'Enmendado',           color: 'var(--indigo)', bg: 'var(--indigo-bg)', border: 'var(--indigo-border)', dot: 'var(--indigo-bright)' },
  TERMINADO:        { label: 'Terminado',           color: 'var(--text-muted)', bg: 'var(--bg-topbar)', border: 'var(--border)', dot: 'var(--text-faint)' },
};
const ETAPA_ORDER = ['BORRADOR', 'REVISION', 'APROBADO', 'PENDIENTE_FIRMA', 'ACTIVO', 'ENMENDADO', 'TERMINADO'];

// ─── Estado operativo (EstadoContrato) — solo se muestra si no es el esperado ──
const STATUS_OP_CFG = {
  MORA:       { label: 'Mora',        color: 'var(--rose)', bg: 'var(--rose-bg)' },
  GRACIA:     { label: 'En gracia',   color: 'var(--warning-bright)', bg: 'var(--warning-bg)' },
  SUSPENDIDO: { label: 'Suspendido',  color: 'var(--text-primary)', bg: 'var(--neutral-200)' },
  VENCIDO:    { label: 'Vencido',     color: 'var(--text-muted)', bg: 'var(--bg-topbar)' },
};

// ─── Colores de software determinísticos (catálogo es dinámico) ───────────────
const SW_PALETTE = [
  { color: 'var(--primary)', bg: 'var(--primary-bg)' }, { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
  { color: 'var(--violet-bright)', bg: 'var(--violet-tint)' }, { color: 'var(--cyan)', bg: 'var(--cyan-tint)' },
  { color: 'var(--warning-bright)', bg: 'var(--warning-bg)' }, { color: 'var(--danger)', bg: 'var(--danger-tint)' },
  { color: 'var(--lime)', bg: 'var(--lime-tint)' }, { color: 'var(--pink)', bg: 'var(--pink-tint)' },
];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function swColor(nombre) {
  if (!nombre) return { color: 'var(--text-secondary)', bg: 'var(--neutral-200)' };
  return SW_PALETTE[hashStr(nombre) % SW_PALETTE.length];
}

// ─── SVG Icon ────────────────────────────────────────────────────────────────
function Icon({ d, color = 'var(--text-muted)', w = 14 }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────
function EtapaBadge({ etapa, label, size = 'md' }) {
  const c = ETAPA_CFG[etapa] || ETAPA_CFG['TERMINADO'];
  const text = label || c.label;
  return (
    <span className={`ct-badge ct-badge-${size}`} title={text}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="ct-badge-dot" style={{ background: c.dot }} />
      <span className="ct-badge-text">{text}</span>
    </span>
  );
}

function StatusOpBadge({ status, size = 'sm' }) {
  const cfg = STATUS_OP_CFG[status];
  if (!cfg) return null; // ACTIVO es el estado esperado; no se resalta
  return (
    <span className={`ct-badge ct-badge-${size}`} style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
      {cfg.label}
    </span>
  );
}

function SoftwareTag({ software }) {
  const c = swColor(software);
  return <span className="ct-sw-tag" title={software} style={{ background: c.bg, color: c.color }}>{software}</span>;
}

// ─── Stats Strip ─────────────────────────────────────────────────────────────
function StatsStrip({ stats }) {
  const s = stats || {};
  const cards = [
    { label: 'Contratos Activos', value: s.contratos_activos ?? '—', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: 'var(--success-deep)', bg: 'var(--success-bg)' },
    { label: 'MRR (Recurrentes)', value: stats ? fmtMoney(s.mrr_total) : '—', sub: 'USD/mes', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: 'var(--primary)', bg: 'var(--primary-bg)' },
    { label: 'ARR Proyectado', value: stats ? fmtMoney(s.arr_total) : '—', sub: 'USD/año', icon: ['M22 12h-4l-3 9L9 3l-3 9H2'], color: 'var(--violet-bright)', bg: 'var(--violet-bg)' },
    { label: 'Por Renovar (60d)', value: s.por_renovar ?? '—', icon: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15', color: 'var(--rose)', bg: 'var(--rose-bg)' },
    { label: 'En Pipeline', value: s.en_pipeline ?? '—', icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'], color: 'var(--warning-bright)', bg: 'var(--warning-bg)' },
  ];
  return (
    <div className="ct-stats-grid">
      {cards.map((c, i) => (
        <div key={i} className="ct-stat-card">
          <div className="ct-stat-icon" style={{ background: c.bg }}><Icon d={c.icon} color={c.color} w={16} /></div>
          <div className="ct-stat-body">
            <p className="ct-stat-label">{c.label}</p>
            {stats ? <p className="ct-stat-value">{c.value}</p> : <span className="ct-skeleton" aria-label="Cargando" />}
            {c.sub && stats && <p className="ct-stat-sub">{c.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Slide-Over Panel (preview rápido desde tabla/kanban) ─────────────────────
function SlideOver({ contrato, onClose, onOpen, onPreview }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!contrato) return;

    triggerRef.current = document.activeElement;

    if (dialogRef.current) {
      setTimeout(() => {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }, 10);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [contrato, onClose]);

  if (!contrato) return null;
  const esRecurrente = contrato.tipo_contrato === 'RECURRENTE';

  return (
    <>
      <div className="ct-slideover-backdrop" onClick={onClose} />
      <div className="ct-slideover" ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Detalle de ${contrato.nombre}`} tabIndex={-1}>
        <div className="ct-slideover-header">
          <div>
            <p className="ct-slideover-id">{contratoIdDisplay(contrato.id)}</p>
            <h3 className="ct-slideover-title">{contrato.nombre}</h3>
          </div>
          <button className="ct-icon-btn" onClick={onClose} title="Cerrar">
            <Icon d="M18 6 6 18M6 6l12 12" color="var(--text-muted)" w={16} />
          </button>
        </div>

        <div className="ct-slideover-body">
          {contrato.tiene_documento && contrato.documento_id && (
            <button
              type="button"
              className="ct-slideover-cover"
              onClick={() => onPreview?.(contrato.documento_id)}
              title="Previsualizar documento del contrato"
            >
              <img
                src={`/api/plantillas/documentos/${contrato.documento_id}/preview-img/`}
                alt={`Documento de ${contrato.nombre}`}
                loading="lazy"
                onError={e => { e.currentTarget.closest('.ct-slideover-cover').style.display = 'none'; }}
              />
            </button>
          )}

          <div className="ct-slideover-status-row">
            <EtapaBadge etapa={contrato.etapa} label={contrato.etapa_display} />
            <StatusOpBadge status={contrato.status} />
            <SoftwareTag software={contrato.software.nombre} />
          </div>

          <div className="ct-slideover-section">
            <p className="ct-section-label">Cliente</p>
            <p className="ct-slideover-client">{contrato.cliente.nombre}</p>
          </div>

          <div className="ct-slideover-grid">
            <div className="ct-slideover-field">
              <p className="ct-field-label">{esRecurrente ? 'MRR' : 'Monto'}</p>
              <p className="ct-field-value ct-mono">{fmtMoney(esRecurrente ? contrato.mrr : contrato.monto)}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">{esRecurrente ? 'ARR' : 'Tipo'}</p>
              <p className="ct-field-value ct-mono">{esRecurrente ? fmtMoney(contrato.arr) : contrato.tipo_contrato_display}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Facturación</p>
              <p className="ct-field-value">{contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : contrato.frecuencia_facturacion === 'MENSUAL' ? 'Mensual' : contrato.tipo_contrato_display}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Responsable</p>
              <p className="ct-field-value">{contrato.responsable || '—'}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Inicio</p>
              <p className="ct-field-value ct-mono">{fmtDate(contrato.fecha_inicio)}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Próxima Renovación</p>
              <p className="ct-field-value ct-mono" style={{ color: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? 'var(--rose)' : 'inherit' }}>
                {fmtDate(contrato.fecha_vencimiento)}
                {contrato.dias_restantes !== null && contrato.dias_restantes < 60 && (
                  <span className="ct-days-warning"> ({contrato.dias_restantes < 0 ? 'Vencido' : `${contrato.dias_restantes}d`})</span>
                )}
              </p>
            </div>
          </div>

          {contrato.tiene_documento && (
            <div className="ct-slideover-annexe">
              <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" color="var(--success-deep)" w={13} />
              <span>Documento generado</span>
            </div>
          )}
        </div>

        <div className="ct-slideover-footer">
          <button className="ct-btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="ct-btn-primary" onClick={() => onOpen(contrato)}>
            Abrir Workspace
            <Icon d="M5 12h14M12 5l7 7-7 7" color="var(--text-on-accent)" w={13} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ contrato, onClick }) {
  const sw = swColor(contrato.software.nombre);
  const days = contrato.dias_restantes;

  return (
    <div className="ct-kanban-card" onClick={onClick}>
      <div className="ct-kc-top">
        <span className="ct-kc-id">{contratoIdDisplay(contrato.id)}</span>
        <span className="ct-kc-sw" title={contrato.software.nombre} style={{ background: sw.bg, color: sw.color }}>
          {contrato.software.nombre.split(' ')[0]}
        </span>
      </div>
      <div className="ct-kc-main">
        <div className="ct-kc-text">
          <p className="ct-kc-name">{contrato.nombre}</p>
          <p className="ct-kc-client">{contrato.cliente.nombre}</p>
        </div>
        {contrato.tiene_documento && contrato.documento_id && (
          <img
            className="ct-kc-thumb"
            src={`/api/plantillas/documentos/${contrato.documento_id}/preview-img/`}
            alt=""
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
      <div className="ct-kc-footer">
        <span className="ct-kc-mrr">
          {contrato.tipo_contrato === 'RECURRENTE' ? fmtMoney(contrato.mrr) : fmtMoney(contrato.monto)}
          {contrato.tipo_contrato === 'RECURRENTE' && <span className="ct-kc-mrr-sub">/mes</span>}
        </span>
        {days !== null && days < 60 && (
          <span className="ct-kc-alert" style={{ color: days < 0 ? 'var(--rose)' : 'var(--warning-bright)' }}>
            <Icon d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              color={days < 0 ? 'var(--rose)' : 'var(--warning-bright)'} w={11} />
            {days < 0 ? 'Vencido' : `${days}d`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Skeletons de carga (tabla / kanban) ───────────────────────────────────────
function TableRowSkeleton() {
  return (
    <div className="ct-table-row ct-row-skeleton" aria-hidden="true">
      <span className="ct-skeleton" style={{ width: 60 }} />
      <div className="ct-name-cell">
        <span className="ct-skeleton" style={{ width: '70%' }} />
        <span className="ct-skeleton" style={{ width: '45%', height: 10 }} />
      </div>
      <span className="ct-skeleton" style={{ width: 70 }} />
      <span className="ct-skeleton" style={{ width: 80 }} />
      <span className="ct-skeleton" style={{ width: 90 }} />
      <span className="ct-skeleton" style={{ width: 60 }} />
      <span className="ct-skeleton" style={{ width: 50 }} />
      <span className="ct-skeleton" style={{ width: 80 }} />
      <span className="ct-skeleton" style={{ width: 70 }} />
      <span className="ct-skeleton" style={{ width: 60 }} />
    </div>
  );
}

function KanbanCardSkeleton() {
  return (
    <div className="ct-kanban-card ct-card-skeleton" aria-hidden="true">
      <div className="ct-kc-top">
        <span className="ct-skeleton" style={{ width: 50, height: 10 }} />
        <span className="ct-skeleton" style={{ width: 40, height: 14 }} />
      </div>
      <span className="ct-skeleton" style={{ width: '85%' }} />
      <span className="ct-skeleton" style={{ width: '55%', height: 10 }} />
      <div className="ct-kc-footer">
        <span className="ct-skeleton" style={{ width: 60 }} />
      </div>
    </div>
  );
}

// ─── Animated Button ──────────────────────────────────────────────────────────
function AnimatedIconBtn({ children, onMouseEnter, ...props }) {
  const hasAnimated = useRef(false);
  
  const handleMouseEnter = (e) => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      const paths = e.currentTarget.querySelectorAll('svg path, svg line, svg polyline, svg circle, svg rect');
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) {
            gsap.fromTo(path,
              { strokeDasharray: length, strokeDashoffset: length },
              { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }
            );
          }
        } catch (err) {}
      });
    }
    if (onMouseEnter) onMouseEnter(e);
  };

  return (
    <button onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Contratos() {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('table');
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [newModalClienteId, setNewModalClienteId] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [softwareList, setSoftwareList] = useState([]);
  const [busyRows, setBusyRows] = useState({}); // To track loading state per row

  const handleRegenerarDocumento = async (e, contratoId) => {
    e.stopPropagation();
    setBusyRows(prev => ({ ...prev, [contratoId]: true }));
    try {
      // La respuesta trae el documento nuevo: se parcha solo esa fila (el id
      // del documento cambia — los DocumentoGenerado son write-once).
      const doc = await generarDocumentoContrato({ contrato_id: contratoId, forzar: true });
      patchContrato(contratoId, { documento_id: doc.id, tiene_documento: true });
    } catch (err) {
      alert(err.message || 'Error regenerando el documento.');
    } finally {
      setBusyRows(prev => ({ ...prev, [contratoId]: false }));
    }
  };
  
  const { user, isModerador } = useAuth();
  const canCreateContrato = user && (user.isSuperadmin || isModerador || user.rawRole === 'TENANT_ADMIN');

  // Deep-link: /contratos?nuevo=1&cliente=<id> abre el modal Nuevo Contrato
  // (usado por el sheet de Clientes) y limpia la URL para no reabrirlo.
  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return;
    setNewModalClienteId(searchParams.get('cliente'));
    setShowNewModal(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const {
    contratos, stats, totalCount, totalPages, loading, error,
    page, pageSize, setPage, filters, updateFilter, refetch, patchContrato,
  } = useContratos({ pageSize: view === 'kanban' ? 150 : 20 });

  useEffect(() => {
    getSoftwareList().then(setSoftwareList).catch(() => setSoftwareList([]));
  }, []);

  // Reset selected contract if ordering updates
  useEffect(() => {
    setSelectedContrato(null);
  }, [filters.ordering]);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Antes: cada columna del Kanban recorría `contratos` entero (filter + reduce)
  // en cada render del componente (7 columnas × hasta 150 contratos = ~1050
  // iteraciones por render, aunque solo cambiara p.ej. la fila seleccionada).
  // Ahora: un solo pase agrupado, memoizado, que solo se recalcula si cambia
  // el array de contratos.
  const kanbanColumns = useMemo(() => {
    const grouped = {};
    for (const col of ETAPA_ORDER) grouped[col] = [];
    for (const c of contratos) {
      if (grouped[c.etapa]) grouped[c.etapa].push(c);
    }
    return ETAPA_ORDER.map(col => {
      const colContratos = grouped[col];
      const colMRR = colContratos.reduce((a, c) => a + (c.tipo_contrato === 'RECURRENTE' ? Number(c.mrr) : 0), 0);
      return { col, colContratos, colMRR };
    });
  }, [contratos]);

  return (
    <div className="ct-container" ref={containerRef}>
      <div className="ct-header">
        <div>
          <p className="ct-header-label">Enfoque Platform</p>
          <h1 className="ct-header-title">Contratos</h1>
        </div>
        <div className="ct-header-right">
          <span className="ct-header-date">{today}</span>
          <div className="ct-header-divider" />
          <TopbarActions />
        </div>
      </div>

      <div className="ct-body">
        <StatsStrip stats={stats} />

        <div className="ct-toolbar">
          <div className="ct-search">
            <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
            <input
              type="text"
              placeholder="Buscar por nombre, cliente, software o ID…"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
            />
          </div>

          <select className="ct-select" value={filters.etapa} onChange={e => updateFilter('etapa', e.target.value)}>
            <option value="Todos">Todas las etapas</option>
            {ETAPA_ORDER.map(e => <option key={e} value={e}>{ETAPA_CFG[e].label}</option>)}
          </select>

          <select className="ct-select" value={filters.software} onChange={e => updateFilter('software', e.target.value)}>
            <option value="">Todos los productos</option>
            {softwareList.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>

          <div className="ct-view-toggle">
            <button className={`ct-view-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')} title="Vista tabla">
              <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} color={view === 'table' ? 'var(--primary)' : 'var(--text-muted)'} w={14} />
            </button>
            <button className={`ct-view-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')} title="Vista Kanban">
              <Icon d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" color={view === 'kanban' ? 'var(--primary)' : 'var(--text-muted)'} w={14} />
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button className="ct-btn-secondary" onClick={() => setShowExportModal(true)}>
            <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="var(--text-muted)" w={13} />
            Exportar
          </button>
          {canCreateContrato && (
            <button className="ct-btn-primary" onClick={() => setShowNewModal(true)}>
              <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
              Nuevo Contrato
            </button>
          )}
        </div>

        {error && (
          <div className="ct-alert-error" role="alert">{error}</div>
        )}

        {view === 'table' && (
          <div className="ct-table-wrap">
            <div className="ct-table-header">
              <SortableHeader
                label="ID"
                field="id"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Contrato / Cliente"
                field="contrato"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Software"
                field="software"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Tipo"
                field="tipo_contrato"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Etapa"
                field="etapa"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="MRR"
                field="mrr"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Facturación"
                field="facturacion"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Próxima Renovación"
                field="renovacion"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <SortableHeader
                label="Responsable"
                field="responsable"
                ordering={filters.ordering}
                onSort={(next) => updateFilter('ordering', next)}
              />
              <span></span>
            </div>

            <div className="ct-tbody">
              {loading && (
                <div aria-live="polite" aria-busy="true">
                  <span className="ct-sr-only">Cargando contratos…</span>
                  {Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)}
                </div>
              )}

              {!loading && contratos.length === 0 && (
                (filters.search || filters.etapa !== 'Todos' || filters.software) ? (
                  <div className="ct-table-empty">
                    <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--border)" w={28} />
                    <p>No se encontraron contratos con esos filtros</p>
                    <button className="ct-btn-secondary" onClick={() => {
                      updateFilter('search', '');
                      updateFilter('etapa', 'Todos');
                      updateFilter('software', '');
                    }}>
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <div className="ct-table-empty ct-empty-zero">
                    <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15h6 M9 11h6" color="var(--border)" w={40} />
                    <p className="ct-empty-title">Aún no hay contratos</p>
                    <p className="ct-empty-sub">Crea tu primer contrato para llevar el seguimiento de vencimientos, renovaciones e ingresos recurrentes.</p>
                    {canCreateContrato && (
                      <button className="ct-btn-primary" onClick={() => setShowNewModal(true)}>
                        <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                        Crea tu primer contrato
                      </button>
                    )}
                  </div>
                )
              )}

              {!loading && contratos.map(c => {
                const days = c.dias_restantes;
                const isExpiring = days !== null && days < 60;
                return (
                  <div key={c.id}
                    className={`ct-table-row ${selectedContrato?.id === c.id ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={selectedContrato?.id === c.id}
                    onClick={() => setSelectedContrato(selectedContrato?.id === c.id ? null : c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedContrato(selectedContrato?.id === c.id ? null : c);
                      }
                    }}>
                    <span className="ct-mono ct-id-cell">{contratoIdDisplay(c.id)}</span>
                    <div className="ct-name-cell">
                      {c.tiene_documento && c.documento_id ? (
                        <img
                          className="ct-row-thumb"
                          src={`/api/plantillas/documentos/${c.documento_id}/preview-img/`}
                          alt=""
                          loading="lazy"
                          onError={e => { e.currentTarget.classList.add('ct-row-thumb-empty'); e.currentTarget.removeAttribute('src'); }}
                        />
                      ) : (
                        <span className="ct-row-thumb ct-row-thumb-empty" aria-hidden="true" />
                      )}
                      <div className="ct-name-cell-text">
                        <span className="ct-row-name">{c.nombre}</span>
                        <span className="ct-row-client">{c.cliente.nombre}</span>
                      </div>
                    </div>
                    <SoftwareTag software={c.software.nombre} />
                    <span className="ct-row-name" style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>{c.tipo_contrato_display}</span>
                    <EtapaBadge etapa={c.etapa} label={c.etapa_display} />
                    <span className="ct-mono ct-mrr-cell">{c.tipo_contrato === 'RECURRENTE' ? fmtMoney(c.mrr) : fmtMoney(c.monto)}</span>
                    <span className="ct-bill-cell">{c.frecuencia_facturacion === 'ANUAL' ? 'Anual' : c.frecuencia_facturacion === 'MENSUAL' ? 'Mensual' : c.tipo_contrato_display}</span>
                    <span className="ct-date-cell" style={{ color: isExpiring ? (days < 0 ? 'var(--rose)' : 'var(--warning-bright)') : undefined, fontWeight: isExpiring ? 700 : undefined }}>
                      {fmtDate(c.fecha_vencimiento)}
                      {isExpiring && <span className="ct-expiring-tag">{days < 0 ? 'Vencido' : `Renueva en ${days}d`}</span>}
                    </span>
                    <span className="ct-resp-cell">{c.responsable || '—'}</span>
                    <div className="ct-row-actions" onClick={e => e.stopPropagation()}>
                      <div className="ct-action-group">
                        <AnimatedIconBtn 
                          className="ct-action-group-btn ct-icon-preview" 
                          disabled={!c.tiene_documento}
                          onClick={() => { if(c.tiene_documento) setPreviewDocId(c.documento_id); }} 
                          title={c.tiene_documento ? "Previsualizar PDF" : "Sin documento"}
                        >
                          <Icon d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2 12c0-3.8 4.2-7 10-7s10 3.2 10 7-4.2 7-10 7-10-3.2-10-7z" w={15} color="currentColor" />
                        </AnimatedIconBtn>

                        <AnimatedIconBtn 
                          className="ct-action-group-btn ct-icon-actualizar" 
                          disabled={busyRows[c.id]} 
                          onClick={(e) => handleRegenerarDocumento(e, c.id)} 
                          title="Actualizar Contrato"
                        >
                          <Icon 
                            className={busyRows[c.id] ? "ct-spin" : ""}
                            d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" 
                            w={15} 
                            color="currentColor"
                          />
                        </AnimatedIconBtn>

                        <AnimatedIconBtn 
                          className="ct-action-group-btn primary ct-icon-abrir" 
                          onClick={() => navigate(`/contratos/${c.id}`)}
                          title="Abrir Contrato"
                        >
                          <Icon d="M9 5l7 7-7 7" w={16} color="currentColor" />
                        </AnimatedIconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && !error && totalCount > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                setPage={setPage}
                itemName="contratos"
              />
            )}
          </div>
        )}

        {view === 'kanban' && totalCount > contratos.length && (
          <p className="ct-kanban-notice">
            Mostrando los {contratos.length.toLocaleString('es-CL')} contratos más recientes de {totalCount.toLocaleString('es-CL')}. Usa la búsqueda o la vista tabla para más precisión.
          </p>
        )}

        {view === 'kanban' && (
          <div className="ct-kanban">
            {kanbanColumns.map(({ col, colContratos, colMRR }) => {
              const sc = ETAPA_CFG[col];
              return (
                <div key={col} className="ct-kanban-col">
                  <div className="ct-kanban-col-header">
                    <div className="ct-kanban-col-title">
                      <span className="ct-kanban-col-dot" style={{ background: sc.dot }} />
                      <span className="ct-kanban-col-name" title={sc.label}>{sc.label}</span>
                      {!loading && <span className="ct-kanban-col-count">{colContratos.length}</span>}
                    </div>
                    {!loading && colMRR > 0 && <span className="ct-kanban-col-mrr">${colMRR.toLocaleString('es-CL')}</span>}
                  </div>
                  <div className="ct-kanban-cards" aria-busy={loading}>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => <KanbanCardSkeleton key={i} />)
                    ) : (
                      <>
                        {colContratos.map(c => (
                          <KanbanCard key={c.id} contrato={c} onClick={() => setSelectedContrato(c)} />
                        ))}
                        {colContratos.length === 0 && <div className="ct-kanban-empty">Sin contratos</div>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SlideOver
        contrato={selectedContrato}
        onClose={() => setSelectedContrato(null)}
        onOpen={(c) => { setSelectedContrato(null); navigate(`/contratos/${c.id}`); }}
        onPreview={(docId) => setPreviewDocId(docId)}
      />
      
      {previewDocId && (
        <div className="ctm-backdrop" onClick={() => setPreviewDocId(null)} style={{ zIndex: 9999 }}>
          <div className="ctm-panel" style={{ width: '80%', maxWidth: '1000px', height: '90vh', padding: 0, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="ctm-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 className="ctm-title">Previsualización de Documento</h2>
              <button className="ctm-close" onClick={() => setPreviewDocId(null)} title="Cerrar">
                <Icon d={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" w={14} />
              </button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#525659' }}>
              <iframe
                src={`/api/plantillas/documentos/${previewDocId}/pdf/?inline=1#view=FitH`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Previsualización PDF"
              />
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewContractModal
          initialClienteId={newModalClienteId}
          onClose={() => { setShowNewModal(false); setNewModalClienteId(null); }}
          onSuccess={(nuevo) => navigate(`/contratos/${nuevo.id}`)}
        />
      )}

      {showExportModal && (
        <ExportContratosModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
