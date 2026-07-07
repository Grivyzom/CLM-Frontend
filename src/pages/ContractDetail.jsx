import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Contratos.css';
import {
  getContratoDetail, updateContrato, deleteContrato, generarDocumentoContrato,
  createObligacion, updateObligacion, deleteObligacion, getObligacionHistorial, enmendarContrato
} from '../api';
import { fmtMoney, fmtDate, fmtDateTime, contratoIdDisplay } from '../utils/formatters';
import OtpSignatureModal from '../components/ui/OtpSignatureModal';

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

// ─── Estado operativo (EstadoContrato) ──
const STATUS_OP_CFG = {
  MORA:       { label: 'Mora',        color: '#be123c', bg: '#fff1f2' },
  GRACIA:     { label: 'En gracia',   color: '#d97706', bg: '#fffbeb' },
  SUSPENDIDO: { label: 'Suspendido',  color: '#3b3631', bg: '#e5e2da' },
  VENCIDO:    { label: 'Vencido',     color: '#7c7670', bg: '#efede8' },
};

// ─── Colores de software determinísticos ───────────────
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

// ─── transiciones permitidas ──────────────────────────────────────────────────
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

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContratoDetail(id);
      setContrato(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onBack = () => {
    navigate('/contratos');
  };

  const handleVersionChange = (targetId) => {
    navigate(`/contratos/${targetId}`);
  };

  async function handleTransicion(target, confirmMsg) {
    if (target === 'ACTIVO' && contrato.etapa === 'PENDIENTE_FIRMA') {
      setIsOtpModalOpen(true);
      return;
    }
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateContrato(contrato.id, { etapa: target });
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpConfirm(codeString) {
    if (codeString !== '123456') {
      throw new Error('El código OTP ingresado no es válido. Prueba con el código de simulación: 123456');
    }
    await updateContrato(contrato.id, { 
      etapa: 'ACTIVO', 
      notas: 'Contrato firmado digitalmente a través de confirmación segura con verificación OTP.' 
    });
    await load();
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
        navigate(`/contratos/${cloned.id}`);
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
              {contrato.versiones && contrato.versiones.length > 1 ? (
                <div className="ct-version-pill">
                  <select
                    value={contrato.id}
                    onChange={(e) => handleVersionChange(Number(e.target.value))}
                    aria-label="Cambiar versión del contrato"
                  >
                    {contrato.versiones.map(v => (
                      <option key={v.id} value={v.id}>
                        Versión {v.version} ({v.etapa_display})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="ct-version-pill">v{contrato.version || '1.0'}</span>
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
                    <div className="ct-doc-versions-note">
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
                      <div className="ct-anexo-info">
                        <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="#7c7670" w={14} />
                        <div>
                          <p className="ct-anexo-name">{a.nombre}</p>
                          <p className="ct-anexo-date">{fmtDate(a.fecha_subida)}</p>
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

      {isOtpModalOpen && (
        <OtpSignatureModal
          isOpen={isOtpModalOpen}
          onClose={() => setIsOtpModalOpen(false)}
          onConfirm={handleOtpConfirm}
          contractName={contrato?.nombre || contrato?.name || 'Contrato de Servicios'}
          contractId={contrato?.id}
          recipientPhone={contrato?.cliente?.telefono || contrato?.cliente?.telefono_contacto || '+56 9 8765 4321'}
          recipientEmail={contrato?.cliente?.email || contrato?.cliente?.contacto_email || 'representante@empresa.com'}
        />
      )}
    </div>
  );
}
