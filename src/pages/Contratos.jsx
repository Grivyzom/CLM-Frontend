import React, { useState, useEffect, useCallback } from 'react';
import './Contratos.css';
import { useContratos } from '../hooks/useContratos';
import {
  getContratoDetail, getSoftwareList, updateContrato, deleteContrato, generarDocumentoContrato,
  getObligaciones, createObligacion, updateObligacion, deleteObligacion, getObligacionHistorial, enmendarContrato
} from '../api';
import NewContractModal from './NewContractModal';
import ExportContratosModal from './ExportContratosModal';
import SortableHeader from '../components/ui/SortableHeader';
import Pagination from '../components/ui/Pagination';


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

// ─── Helpers de formato ─────────────────────────────────────────────────────
function fmtMoney(n) {
  const num = Number(n);
  if (!num) return '—';
  return `$${num.toLocaleString('es-CL', { maximumFractionDigits: 0 })} USD`;
}
function fmtDate(d) {
  if (!d) return '—';
  const datePart = String(d).split('T')[0];
  const [y, m, day] = datePart.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return fmtDate(d);
  return dt.toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function contratoIdDisplay(id) {
  return `CTR-${String(id).padStart(6, '0')}`;
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
  return (
    <span className={`ct-badge ct-badge-${size}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="ct-badge-dot" style={{ background: c.dot }} />
      {label || c.label}
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
  return <span className="ct-sw-tag" style={{ background: c.bg, color: c.color }}>{software}</span>;
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
            <p className="ct-stat-value">{c.value}</p>
            {c.sub && <p className="ct-stat-sub">{c.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Slide-Over Panel (preview rápido desde tabla/kanban) ─────────────────────
function SlideOver({ contrato, onClose, onOpen }) {
  if (!contrato) return null;
  const esRecurrente = contrato.tipo_contrato === 'RECURRENTE';

  return (
    <>
      <div className="ct-slideover-backdrop" onClick={onClose} />
      <div className="ct-slideover">
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
        <span className="ct-kc-sw" style={{ background: sw.bg, color: sw.color }}>
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

// ─── Contract Workspace (Detail) ──────────────────────────────────────────────
const ETAPA_SIGUIENTE = {
  BORRADOR: [{ etapa: 'REVISION', label: 'Enviar a Revisión', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' }],
  REVISION: [{ etapa: 'APROBADO', label: 'Aprobar', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' }],
  APROBADO: [{ etapa: 'PENDIENTE_FIRMA', label: 'Enviar a Firma', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' }],
  PENDIENTE_FIRMA: [{ etapa: 'ACTIVO', label: 'Registrar Firma', icon: 'M20 6L9 17l-5-5', primary: true, color: '#0284c7' }],
  ACTIVO: [
    { etapa: 'ENMENDADO', label: 'Crear Enmienda', icon: ['M12 5v14', 'M5 12h14'] },
    { etapa: 'TERMINADO', label: 'Terminar', icon: 'M18 6 6 18M6 6l12 12', danger: true, confirm: '¿Terminar este contrato? Esta acción marca el contrato como Terminado / Expirado.' },
  ],
  ENMENDADO: [
    { etapa: 'ACTIVO', label: 'Reactivar', icon: ['M20 6L9 17l-5-5'] },
    { etapa: 'TERMINADO', label: 'Terminar', icon: 'M18 6 6 18M6 6l12 12', danger: true, confirm: '¿Terminar este contrato?' },
  ],
  TERMINADO: [],
};

function ContractWorkspace({ contratoId, onBack, onChanged }) {
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [obligationHistory, setObligationHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showObligacionModal, setShowObligacionModal] = useState(false);
  const [editingObligacion, setEditingObligacion] = useState(null);
  const [obForm, setObForm] = useState({ tipo_obligacion: '', descripcion: '', penalizacion: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContratoDetail(contratoId);
      setContrato(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => { load(); }, [load]);

  async function handleTransicion(target, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateContrato(contrato.id, { etapa: target });
      await load();
      onChanged?.();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleHistory(obId) {
    if (expandedHistoryId === obId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(obId);
    setHistoryLoading(true);
    try {
      const logs = await getObligacionHistorial(obId);
      setObligationHistory(prev => ({ ...prev, [obId]: logs }));
    } catch (err) {
      console.error("Error loading obligation history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleOpenObligacionModal(ob = null) {
    if (ob) {
      setEditingObligacion(ob);
      setObForm({
        tipo_obligacion: ob.tipo_obligacion || '',
        descripcion: ob.descripcion || '',
        penalizacion: ob.penalizacion || '',
      });
    } else {
      setEditingObligacion(null);
      setObForm({ tipo_obligacion: '', descripcion: '', penalizacion: '' });
    }
    setShowObligacionModal(true);
  }

  async function handleSaveObligacion(e) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      if (editingObligacion) {
        await updateObligacion(editingObligacion.id, obForm);
      } else {
        await createObligacion(contrato.id, obForm);
      }
      setShowObligacionModal(false);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminarObligacion(obId) {
    if (!window.confirm('¿Eliminar esta obligación? Esta acción no se puede deshacer.')) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteObligacion(obId);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnmendar() {
    if (window.confirm('Este contrato está aprobado. Modificar las obligaciones generará una nueva versión (Anexo) que requerirá una nueva aprobación. ¿Deseas continuar?')) {
      setBusy(true);
      setActionError(null);
      try {
        const cloned = await enmendarContrato(contrato.id);
        onChanged?.(cloned.id);
      } catch (err) {
        setActionError(err.message);
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleGenerarDocumento(forzar = false) {
    setBusy(true);
    setActionError(null);
    try {
      await generarDocumentoContrato({ contrato_id: contrato.id, forzar });
      await load();
      onChanged?.();
    } catch (err) {
      if (!forzar && /confirma/i.test(err.message) && window.confirm(err.message)) {
        return handleGenerarDocumento(true);
      }
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminar() {
    if (!window.confirm('¿Eliminar este contrato en Borrador? Esta acción no se puede deshacer.')) return;
    setBusy(true);
    try {
      await deleteContrato(contrato.id);
      onChanged?.();
      onBack();
    } catch (err) {
      setActionError(err.message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="ct-workspace">
        <div className="ct-table-empty" style={{ flex: 1 }}>Cargando contrato…</div>
      </div>
    );
  }
  if (error || !contrato) {
    return (
      <div className="ct-workspace">
        <div className="ct-table-empty" style={{ flex: 1 }}>
          <p>{error || 'Contrato no encontrado'}</p>
          <button className="ct-btn-secondary" onClick={onBack}>← Volver</button>
        </div>
      </div>
    );
  }

  const esRecurrente = contrato.tipo_contrato === 'RECURRENTE';
  const siguientes = ETAPA_SIGUIENTE[contrato.etapa] || [];
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: 'M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8' },
    { id: 'documento', label: 'Documento', icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h4'] },
    { id: 'historial', label: 'Historial', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
    { id: 'sla', label: 'Obligaciones / SLA', icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'] },
  ];

  return (
    <div className="ct-workspace">
      <div className="ct-workspace-header">
        <div className="ct-workspace-breadcrumb">
          <button className="ct-breadcrumb-btn" onClick={onBack}>
            <Icon d="M15 18l-6-6 6-6" color="#7c7670" w={14} />
            Contratos
          </button>
          <Icon d="M9 18l6-6-6-6" color="#d8d4cc" w={12} />
          <span className="ct-breadcrumb-current">{contratoIdDisplay(contrato.id)}</span>
        </div>
        <div className="ct-workspace-actions">
          {contrato.etapa === 'BORRADOR' && (
            <button className="ct-btn-secondary" disabled={busy} onClick={() => handleGenerarDocumento(false)}>
              <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={13} />
              {contrato.documentos.length > 0 ? 'Regenerar Documento' : 'Generar Documento'}
            </button>
          )}
          {siguientes.map(s => (
            <button key={s.etapa}
              className={s.danger ? 'ct-btn-danger' : s.primary ? 'ct-btn-primary' : 'ct-btn-secondary'}
              disabled={busy}
              style={s.color ? { background: s.color, color: '#fff' } : undefined}
              onClick={() => handleTransicion(s.etapa, s.confirm)}>
              <Icon d={s.icon} color={s.danger || s.primary || s.color ? '#fff' : '#7c7670'} w={13} />
              {s.label}
            </button>
          ))}
          {contrato.etapa === 'BORRADOR' && (
            <button className="ct-icon-btn" title="Eliminar borrador" disabled={busy} onClick={handleEliminar}>
              <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="#dc2626" w={14} />
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ margin: '10px 28px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
          {actionError}
        </div>
      )}

      <div className="ct-workspace-titlebar">
        <div className="ct-workspace-title-left">
          <div>
            <div className="ct-workspace-id-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ct-workspace-id">{contratoIdDisplay(contrato.id)}</span>
              
              {/* Version Selector */}
              {contrato.versiones && contrato.versiones.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f3f4f6', padding: '2px 8px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>v{contrato.version}</span>
                  <select
                    value={contrato.id}
                    onChange={(e) => onChanged?.(Number(e.target.value))}
                    style={{ background: 'transparent', border: 'none', fontSize: 10, color: '#374151', cursor: 'pointer', outline: 'none', fontWeight: 600 }}
                  >
                    {contrato.versiones.map(v => (
                      <option key={v.id} value={v.id}>
                        Versión {v.version} ({v.etapa_display})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(!contrato.versiones || contrato.versiones.length <= 1) && (
                <span className="ct-workspace-version" style={{ fontSize: 10, background: '#f3f4f6', color: '#374151', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                  v{contrato.version || '1.0'}
                </span>
              )}

              <EtapaBadge etapa={contrato.etapa} label={contrato.etapa_display} />
              <StatusOpBadge status={contrato.status} />
              {contrato.dias_restantes !== null && contrato.dias_restantes < 60 && (
                <span className="ct-days-chip" style={{ background: contrato.dias_restantes < 0 ? '#fff1f2' : '#fffbeb', color: contrato.dias_restantes < 0 ? '#be123c' : '#d97706', border: `1px solid ${contrato.dias_restantes < 0 ? '#fecdd3' : '#fde68a'}` }}>
                  {contrato.dias_restantes < 0 ? 'Vencido' : `Renueva en ${contrato.dias_restantes}d`}
                </span>
              )}
            </div>
            <h2 className="ct-workspace-name">{contrato.nombre}</h2>
            <p className="ct-workspace-client">{contrato.cliente.nombre} · <SoftwareTag software={contrato.software.nombre} /></p>
          </div>
        </div>
        <div className="ct-workspace-kpis">
          <div className="ct-kpi">
            <p className="ct-kpi-label">{esRecurrente ? 'MRR' : 'Monto'}</p>
            <p className="ct-kpi-value">{fmtMoney(esRecurrente ? contrato.mrr : contrato.monto)}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">{esRecurrente ? 'ARR' : 'Tipo'}</p>
            <p className="ct-kpi-value">{esRecurrente ? fmtMoney(contrato.arr) : contrato.tipo_contrato_display}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">Facturación</p>
            <p className="ct-kpi-value">{contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : contrato.frecuencia_facturacion === 'MENSUAL' ? 'Mensual' : '—'}</p>
          </div>
        </div>
      </div>

      <div className="ct-workspace-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`ct-workspace-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <Icon d={t.icon} color={activeTab === t.id ? '#2563eb' : '#b0aaa3'} w={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="ct-workspace-content">
        {activeTab === 'resumen' && (
          <div className="ct-tab-resumen">
            <div className="ct-resumen-grid">
              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" color="#2563eb" w={14} />
                  Producto Licenciado
                </p>
                <p className="ct-resumen-software">{contrato.software.nombre}</p>
                <p className="ct-resumen-detail">SLA: <strong>{contrato.sla.nombre}</strong></p>
                <p className="ct-resumen-detail">Responsable: <strong>{contrato.responsable || '—'}</strong></p>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="#059669" w={14} />
                  Valor del Contrato
                </p>
                <div className="ct-resumen-value-row">
                  <div>
                    <p className="ct-resumen-value-label">{esRecurrente ? 'MRR' : 'Monto'}</p>
                    <p className="ct-resumen-value-num">{fmtMoney(esRecurrente ? contrato.mrr : contrato.monto)}</p>
                  </div>
                  {esRecurrente && (
                    <div>
                      <p className="ct-resumen-value-label">ARR</p>
                      <p className="ct-resumen-value-num">{fmtMoney(contrato.arr)}</p>
                    </div>
                  )}
                </div>
                <div className="ct-resumen-billing-badge">
                  <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" color="#7c7670" w={12} />
                  {contrato.tipo_contrato_display}{contrato.frecuencia_facturacion ? ` · ${contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : 'Mensual'}` : ''}
                </div>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" color="#d97706" w={14} />
                  Fechas Críticas
                </p>
                <div className="ct-resumen-dates">
                  <div className="ct-date-row">
                    <span className="ct-date-label">Inicio del contrato</span>
                    <span className="ct-date-value">{fmtDate(contrato.fecha_inicio)}</span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Próxima renovación</span>
                    <span className="ct-date-value" style={{ color: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? '#be123c' : '#3b3631', fontWeight: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? 700 : 600 }}>
                      {fmtDate(contrato.fecha_vencimiento)}
                    </span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Creado</span>
                    <span className="ct-date-value">{fmtDate(contrato.fecha_creacion)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documento' && (
          <div className="ct-tab-documento">
            <div className="ct-doc-viewer">
              {contrato.documentos.length > 0 ? (
                <>
                  <div className="ct-doc-header">
                    <div className="ct-doc-info">
                      <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="#2563eb" w={20} />
                      <div>
                        <p className="ct-doc-name">Documento generado · v{contrato.documentos[0].plantilla_version}</p>
                        <p className="ct-doc-meta">{fmtDateTime(contrato.documentos[0].fecha_generacion)} · hash {contrato.documentos[0].hash_sha256.slice(0, 12)}…</p>
                      </div>
                    </div>
                    <a className="ct-btn-secondary" href={`/api/plantillas/documentos/${contrato.documentos[0].id}/pdf/`} target="_blank" rel="noreferrer">
                      <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="#7c7670" w={13} />
                      Descargar PDF
                    </a>
                  </div>
                  {contrato.documentos.length > 1 && (
                    <div style={{ padding: '10px 16px', fontSize: 11, color: '#7c7670' }}>
                      + {contrato.documentos.length - 1} versión(es) anterior(es) en el historial de generación.
                    </div>
                  )}
                </>
              ) : (
                <div className="ct-doc-empty">
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 12v6', 'M9 15l3 3 3-3']} color="#d8d4cc" w={40} />
                  <p>El documento aún no ha sido generado</p>
                  <p className="ct-doc-empty-sub">Genera el documento base desde la plantilla activa para este tipo de contrato y software.</p>
                  <button className="ct-btn-primary" disabled={busy} onClick={() => handleGenerarDocumento(false)}>
                    <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                    Generar Documento
                  </button>
                </div>
              )}
            </div>

            <div className="ct-anexos-panel">
              <div className="ct-anexos-header">
                <p className="ct-section-label">Anexos y Adendas</p>
              </div>
              {contrato.anexos.length === 0 ? (
                <p className="ct-anexos-empty">Sin anexos. Los anexos aparecerán aquí cuando se adjunten archivos al contrato.</p>
              ) : (
                <div className="ct-anexos-list">
                  {contrato.anexos.map(a => (
                    <div key={a.id} className="ct-anexo-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="#7c7670" w={14} />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#3b3631' }}>{a.nombre}</p>
                          <p style={{ fontSize: 10, color: '#b0aaa3' }}>{fmtDate(a.fecha_subida)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="ct-tab-historial">
            <div className="ct-timeline">
              {contrato.historial.length === 0 && (
                <p style={{ fontSize: 12, color: '#b0aaa3' }}>Sin eventos registrados.</p>
              )}
              {contrato.historial.map((ev, i) => {
                const isLast = i === contrato.historial.length - 1;
                const isActivado = ev.etapa_nueva === 'ACTIVO';
                return (
                  <div key={i} className="ct-timeline-item">
                    <div className="ct-timeline-track">
                      <div className={`ct-timeline-dot ${isActivado ? 'signed' : ''}`}
                        style={{ background: isActivado ? '#15803d' : '#d8d4cc', border: `2px solid ${isActivado ? '#bbf7d0' : '#e5e2da'}` }} />
                      {!isLast && <div className="ct-timeline-line" />}
                    </div>
                    <div className="ct-timeline-content">
                      <p className="ct-timeline-time">{fmtDateTime(ev.fecha)}</p>
                      <p className="ct-timeline-actor">{ev.actor}</p>
                      <p className="ct-timeline-action" style={{ color: isActivado ? '#15803d' : '#3b3631' }}>
                        → {ev.etapa_nueva_display}{ev.notas ? ` — ${ev.notas}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ct-audit-note">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="#7c3aed" w={14} />
              <p>El historial de auditoría es inmutable. Registra automáticamente cada transición de etapa con marca de tiempo y actor responsable.</p>
            </div>
          </div>
        )}

        {activeTab === 'sla' && (
          <div className="ct-tab-sla">
            <div className="ct-sla-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="ct-section-label" style={{ margin: 0 }}>Obligaciones contractuales — SLA: {contrato.sla.nombre}</p>
              {contrato.etapa === 'BORRADOR' ? (
                <button className="ct-btn-primary" onClick={() => handleOpenObligacionModal()}>
                  <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                  Añadir SLA
                </button>
              ) : (
                <button className="ct-btn-secondary" onClick={() => handleEnmendar()}>
                  <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={13} />
                  Enmendar SLA / Crear Anexo
                </button>
              )}
            </div>
            {contrato.obligaciones_sla.length === 0 ? (
              <div className="ct-sla-empty">
                <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="#d8d4cc" w={36} />
                <p>Sin obligaciones contractuales asociadas</p>
              </div>
            ) : (
              <div className="ct-sla-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {contrato.obligaciones_sla.map((s, i) => (
                  <div key={s.id || i} className="ct-sla-item-card" style={{ background: '#fff', border: '1px solid #e5e2da', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="#2563eb" w={18} />
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{s.tipo_obligacion}</h4>
                      </div>
                      {contrato.etapa === 'BORRADOR' && s.id && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="ct-icon-btn" title="Editar Obligación" onClick={() => handleOpenObligacionModal(s)}>
                            <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" color="#4f46e5" w={14} />
                          </button>
                          <button className="ct-icon-btn" title="Eliminar Obligación" onClick={() => handleEliminarObligacion(s.id)}>
                            <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="#dc2626" w={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0' }}>
                        <strong>Descripción / Métrica:</strong> {s.descripcion}
                      </p>
                      <p style={{ fontSize: 12, color: '#be123c', margin: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <strong>Penalización / Consecuencia:</strong> {s.penalizacion}
                      </p>
                    </div>

                    {s.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                        <button
                          className="ct-btn-secondary"
                          style={{ fontSize: 10, padding: '4px 8px' }}
                          onClick={() => toggleHistory(s.id)}
                        >
                          {expandedHistoryId === s.id ? 'Ocultar historial' : 'Ver historial'}
                        </button>

                        {expandedHistoryId === s.id && (
                          <div className="ct-obligation-history" style={{ marginTop: 8, background: '#f9fafb', borderRadius: 6, padding: 12, border: '1px solid #e5e7eb' }}>
                            <h5 style={{ margin: '0 0 8px 0', fontSize: 11, color: '#374151', fontWeight: 600 }}>Historial de Cambios</h5>
                            {historyLoading ? (
                              <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Cargando historial…</p>
                            ) : !obligationHistory[s.id] || obligationHistory[s.id].length === 0 ? (
                              <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Sin registros de cambios.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {obligationHistory[s.id].map((log) => (
                                  <div key={log.id} style={{ fontSize: 10, color: '#4b5563', borderLeft: '2px solid #3b82f6', paddingLeft: 8 }}>
                                    <div style={{ fontWeight: 600, color: '#111827' }}>
                                      {fmtDateTime(log.fecha)} · {log.usuario} · <span style={{ color: log.accion === 'CREAR' ? '#10b981' : log.accion === 'EDITAR' ? '#3b82f6' : '#ef4444' }}>{log.accion}</span>
                                    </div>
                                    {log.valor_anterior && (
                                      <div style={{ color: '#6b7280', textDecoration: 'line-through' }}>
                                        Antes: {log.valor_anterior}
                                      </div>
                                    )}
                                    <div style={{ color: '#1f2937' }}>
                                      Nuevo: {log.valor_nuevo || '(Eliminado)'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {showObligacionModal && (
        <div className="ct-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="ct-modal-content" style={{ background: '#fff', padding: 24, borderRadius: 8, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
              {editingObligacion ? 'Editar Obligación / SLA' : 'Añadir Obligación / SLA'}
            </h3>
            <form onSubmit={handleSaveObligacion}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Tipo de Obligación</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Soporte Técnico, Uptime de la aplicación"
                    value={obForm.tipo_obligacion}
                    onChange={e => setObForm(prev => ({ ...prev, tipo_obligacion: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Descripción / Métrica</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ej. Garantizar un 99.9% de tiempo en línea mensual"
                    value={obForm.descripcion}
                    onChange={e => setObForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Penalización / Consecuencia</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Ej. Descuento del 10% en la siguiente factura si no se cumple"
                    value={obForm.penalizacion}
                    onChange={e => setObForm(prev => ({ ...prev, penalizacion: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="ct-btn-secondary" onClick={() => setShowObligacionModal(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="ct-btn-primary" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Contratos() {
  const [view, setView] = useState('table');
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [openContratoId, setOpenContratoId] = useState(null);
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

  if (openContratoId) {
    return (
      <ContractWorkspace
        contratoId={openContratoId}
        onBack={() => { setOpenContratoId(null); refetch(); }}
        onChanged={(newId) => {
          if (newId && typeof newId === 'number') {
            setOpenContratoId(newId);
          }
          refetch();
        }}
      />
    );
  }

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
            <Icon d="M6 9l6 6 6-6" color="#2563eb" w={10} />
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
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
            {error}
          </div>
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
                </div>
              )}

              {!loading && contratos.map(c => {
                const days = c.dias_restantes;
                const isExpiring = days !== null && days < 60;
                return (
                  <div key={c.id}
                    className={`ct-table-row ${selectedContrato?.id === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedContrato(selectedContrato?.id === c.id ? null : c)}>
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
                      {isExpiring && <span className="ct-expiring-tag">{days < 0 ? '⚠ Vencido' : `⚠ ${days}d`}</span>}
                    </span>
                    <span className="ct-resp-cell">{c.responsable || '—'}</span>
                    <div className="ct-row-actions">
                      <button className="ct-row-open-btn" onClick={(e) => { e.stopPropagation(); setOpenContratoId(c.id); }}>
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
          <p style={{ margin: 0, fontSize: 11, color: '#b0aaa3' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ct-kanban-col-dot" style={{ background: sc.dot }} />
                      <span className="ct-kanban-col-name">{sc.label}</span>
                      <span className="ct-kanban-col-count">{colContratos.length}</span>
                    </div>
                    {colMRR > 0 && <span className="ct-kanban-col-mrr">${colMRR.toLocaleString()}</span>}
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
        onOpen={(c) => { setSelectedContrato(null); setOpenContratoId(c.id); }}
      />

      {showNewModal && (
        <NewContractModal
          onClose={() => setShowNewModal(false)}
          onSuccess={(nuevo) => { refetch(); setOpenContratoId(nuevo.id); }}
        />
      )}

      {showExportModal && (
        <ExportContratosModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
