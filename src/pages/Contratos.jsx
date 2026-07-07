import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Contratos.css';
import { useContratos } from '../hooks/useContratos';
import { getSoftwareList } from '../api';
import NewContractModal from './NewContractModal';
import ExportContratosModal from './ExportContratosModal';
import SortableHeader from '../components/ui/SortableHeader';
import Pagination from '../components/ui/Pagination';
import { fmtMoney, fmtDate, contratoIdDisplay } from '../utils/formatters';

// ─── Paleta de etapas (workflow legal real: EtapaContrato) ────────────────────
const ETAPA_CFG = {
  BORRADOR:         { label: 'Borrador',           color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  REVISION:         { label: 'En Revisión',        color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', dot: '#7c3aed' },
  APROBADO:         { label: 'Aprobado',            color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc', dot: '#0891b2' },
  PENDIENTE_FIRMA:  { label: 'Pendiente de Firma',  color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', dot: '#0369a1' },
  ACTIVO:           { label: 'Activo',              color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  ENMENDADO:        { label: 'Enmendado',           color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe', dot: '#4f46e5' },
  TERMINADO:        { label: 'Terminado',           color: '#7c7670', bg: '#efede8', border: '#d8d4cc', dot: '#b0aaa3' },
};
const ETAPA_ORDER = ['BORRADOR', 'REVISION', 'APROBADO', 'PENDIENTE_FIRMA', 'ACTIVO', 'ENMENDADO', 'TERMINADO'];

// ─── Estado operativo (EstadoContrato) — solo se muestra si no es el esperado ──
const STATUS_OP_CFG = {
  MORA:       { label: 'Mora',        color: '#be123c', bg: '#fff1f2' },
  GRACIA:     { label: 'En gracia',   color: '#d97706', bg: '#fffbeb' },
  SUSPENDIDO: { label: 'Suspendido',  color: '#3b3631', bg: '#e5e2da' },
  VENCIDO:    { label: 'Vencido',     color: '#7c7670', bg: '#efede8' },
};

// ─── Colores de software determinísticos (catálogo es dinámico) ───────────────
const SW_PALETTE = [
  { color: '#2563eb', bg: '#eff6ff' }, { color: '#059669', bg: '#d1fae5' },
  { color: '#7c3aed', bg: '#ede9fe' }, { color: '#0891b2', bg: '#cffafe' },
  { color: '#d97706', bg: '#fffbeb' }, { color: '#dc2626', bg: '#fee2e2' },
  { color: '#65a30d', bg: '#ecfccb' }, { color: '#db2777', bg: '#fce7f3' },
];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function swColor(nombre) {
  if (!nombre) return { color: '#5c574f', bg: '#e5e2da' };
  return SW_PALETTE[hashStr(nombre) % SW_PALETTE.length];
}

// ─── SVG Icon ────────────────────────────────────────────────────────────────
function Icon({ d, color = '#7c7670', w = 14 }) {
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
    { label: 'Contratos Activos', value: s.contratos_activos ?? '—', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#15803d', bg: '#f0fdf4' },
    { label: 'MRR (Recurrentes)', value: stats ? fmtMoney(s.mrr_total) : '—', sub: 'USD/mes', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#2563eb', bg: '#eff6ff' },
    { label: 'ARR Proyectado', value: stats ? fmtMoney(s.arr_total) : '—', sub: 'USD/año', icon: ['M22 12h-4l-3 9L9 3l-3 9H2'], color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Por Renovar (60d)', value: s.por_renovar ?? '—', icon: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15', color: '#be123c', bg: '#fff1f2' },
    { label: 'En Pipeline', value: s.en_pipeline ?? '—', icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'], color: '#d97706', bg: '#fffbeb' },
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
function SlideOver({ contrato, onClose, onOpen }) {
  useEffect(() => {
    if (!contrato) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [contrato, onClose]);

  if (!contrato) return null;
  const esRecurrente = contrato.tipo_contrato === 'RECURRENTE';

  return (
    <>
      <div className="ct-slideover-backdrop" onClick={onClose} />
      <div className="ct-slideover" role="dialog" aria-modal="true" aria-label={`Detalle de ${contrato.nombre}`}>
        <div className="ct-slideover-header">
          <div>
            <p className="ct-slideover-id">{contratoIdDisplay(contrato.id)}</p>
            <h3 className="ct-slideover-title">{contrato.nombre}</h3>
          </div>
          <button className="ct-icon-btn" onClick={onClose} title="Cerrar">
            <Icon d="M18 6 6 18M6 6l12 12" color="#7c7670" w={16} />
          </button>
        </div>

        <div className="ct-slideover-body">
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
              <p className="ct-field-value ct-mono" style={{ color: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? '#be123c' : 'inherit' }}>
                {fmtDate(contrato.fecha_vencimiento)}
                {contrato.dias_restantes !== null && contrato.dias_restantes < 60 && (
                  <span className="ct-days-warning"> ({contrato.dias_restantes < 0 ? 'Vencido' : `${contrato.dias_restantes}d`})</span>
                )}
              </p>
            </div>
          </div>

          {contrato.tiene_documento && (
            <div className="ct-slideover-annexe">
              <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" color="#15803d" w={13} />
              <span>Documento generado</span>
            </div>
          )}
        </div>

        <div className="ct-slideover-footer">
          <button className="ct-btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="ct-btn-primary" onClick={() => onOpen(contrato)}>
            Abrir Workspace
            <Icon d="M5 12h14M12 5l7 7-7 7" color="#fff" w={13} />
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
      <p className="ct-kc-name">{contrato.nombre}</p>
      <p className="ct-kc-client">{contrato.cliente.nombre}</p>
      <div className="ct-kc-footer">
        <span className="ct-kc-mrr">
          {contrato.tipo_contrato === 'RECURRENTE' ? fmtMoney(contrato.mrr) : fmtMoney(contrato.monto)}
          {contrato.tipo_contrato === 'RECURRENTE' && <span className="ct-kc-mrr-sub">/mes</span>}
        </span>
        {days !== null && days < 60 && (
          <span className="ct-kc-alert" style={{ color: days < 0 ? '#be123c' : '#d97706' }}>
            <Icon d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              color={days < 0 ? '#be123c' : '#d97706'} w={11} />
            {days < 0 ? 'Vencido' : `${days}d`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Contratos() {
  const navigate = useNavigate();
  const [view, setView] = useState('table');
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [softwareList, setSoftwareList] = useState([]);

  const {
    contratos, stats, totalCount, totalPages, loading, error,
    page, pageSize, setPage, filters, updateFilter, refetch,
  } = useContratos({ pageSize: view === 'kanban' ? 150 : 20 });

  useEffect(() => {
    getSoftwareList().then(setSoftwareList).catch(() => setSoftwareList([]));
  }, []);

  // Reset selected contract if ordering updates
  useEffect(() => {
    setSelectedContrato(null);
  }, [filters.ordering]);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="ct-container">
      <div className="ct-header">
        <div>
          <p className="ct-header-label">Enfoque Platform</p>
          <h1 className="ct-header-title">Contratos</h1>
        </div>
        <div className="ct-header-right">
          <span className="ct-header-date">{today}</span>
          <div className="ct-header-divider" />
          <div className="ct-ctx-badge">
            <span className="ct-ctx-dot" />
            Administración Global
          </div>
        </div>
      </div>

      <div className="ct-body">
        <StatsStrip stats={stats} />

        <div className="ct-toolbar">
          <div className="ct-search">
            <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
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
              <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} color={view === 'table' ? '#2563eb' : '#7c7670'} w={14} />
            </button>
            <button className={`ct-view-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')} title="Vista Kanban">
              <Icon d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" color={view === 'kanban' ? '#2563eb' : '#7c7670'} w={14} />
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button className="ct-btn-secondary" onClick={() => setShowExportModal(true)}>
            <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="#7c7670" w={13} />
            Exportar
          </button>
          <button className="ct-btn-primary" onClick={() => setShowNewModal(true)}>
            <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
            Nuevo Contrato
          </button>
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
                <div className="ct-table-empty"><p>Cargando contratos…</p></div>
              )}

              {!loading && contratos.length === 0 && (
                <div className="ct-table-empty">
                  <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#d8d4cc" w={28} />
                  <p>No se encontraron contratos con esos filtros</p>
                  {(filters.search || filters.etapa !== 'Todos' || filters.software) && (
                    <button className="ct-btn-secondary" onClick={() => {
                      updateFilter('search', '');
                      updateFilter('etapa', 'Todos');
                      updateFilter('software', '');
                    }}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {!loading && contratos.map(c => {
                const days = c.dias_restantes;
                const isExpiring = days !== null && days < 60;
                return (
                  <div key={c.id}
                    className={`ct-table-row ${selectedContrato?.id === c.id ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedContrato(selectedContrato?.id === c.id ? null : c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedContrato(selectedContrato?.id === c.id ? null : c);
                      }
                    }}>
                    <span className="ct-mono ct-id-cell">{contratoIdDisplay(c.id)}</span>
                    <div className="ct-name-cell">
                      <span className="ct-row-name">{c.nombre}</span>
                      <span className="ct-row-client">{c.cliente.nombre}</span>
                    </div>
                    <SoftwareTag software={c.software.nombre} />
                    <EtapaBadge etapa={c.etapa} label={c.etapa_display} />
                    <span className="ct-mono ct-mrr-cell">{c.tipo_contrato === 'RECURRENTE' ? fmtMoney(c.mrr) : fmtMoney(c.monto)}</span>
                    <span className="ct-bill-cell">{c.frecuencia_facturacion === 'ANUAL' ? 'Anual' : c.frecuencia_facturacion === 'MENSUAL' ? 'Mensual' : c.tipo_contrato_display}</span>
                    <span className="ct-date-cell" style={{ color: isExpiring ? (days < 0 ? '#be123c' : '#d97706') : undefined, fontWeight: isExpiring ? 700 : undefined }}>
                      {fmtDate(c.fecha_vencimiento)}
                      {isExpiring && <span className="ct-expiring-tag">{days < 0 ? 'Vencido' : `Renueva en ${days}d`}</span>}
                    </span>
                    <span className="ct-resp-cell">{c.responsable || '—'}</span>
                    <div className="ct-row-actions">
                      <button className="ct-row-open-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contratos/${c.id}`); }}>
                        Abrir →
                      </button>
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
            {ETAPA_ORDER.map(col => {
              const colContratos = contratos.filter(c => c.etapa === col);
              const colMRR = colContratos.reduce((a, c) => a + (c.tipo_contrato === 'RECURRENTE' ? Number(c.mrr) : 0), 0);
              const sc = ETAPA_CFG[col];
              return (
                <div key={col} className="ct-kanban-col">
                  <div className="ct-kanban-col-header">
                    <div className="ct-kanban-col-title">
                      <span className="ct-kanban-col-dot" style={{ background: sc.dot }} />
                      <span className="ct-kanban-col-name" title={sc.label}>{sc.label}</span>
                      <span className="ct-kanban-col-count">{colContratos.length}</span>
                    </div>
                    {colMRR > 0 && <span className="ct-kanban-col-mrr">${colMRR.toLocaleString('es-CL')}</span>}
                  </div>
                  <div className="ct-kanban-cards">
                    {colContratos.map(c => (
                      <KanbanCard key={c.id} contrato={c} onClick={() => setSelectedContrato(c)} />
                    ))}
                    {colContratos.length === 0 && <div className="ct-kanban-empty">Sin contratos</div>}
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
      />

      {showNewModal && (
        <NewContractModal
          onClose={() => setShowNewModal(false)}
          onSuccess={(nuevo) => { refetch(); navigate(`/contratos/${nuevo.id}`); }}
        />
      )}

      {showExportModal && (
        <ExportContratosModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
