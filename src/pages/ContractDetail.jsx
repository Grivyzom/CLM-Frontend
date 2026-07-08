import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Contratos.css';
import {
  getContratoDetail, updateContrato, deleteContrato, generarDocumentoContrato,
  createObligacion, updateObligacion, deleteObligacion, getObligacionHistorial, enmendarContrato,
  getPlantillas, togglePlantillaActiva
} from '../api';
import { fmtMoney, fmtDate, fmtDateTime, contratoIdDisplay } from '../utils/formatters';
import OtpSignatureModal from '../components/ui/OtpSignatureModal';

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

// ─── Estado operativo (EstadoContrato) ──
const STATUS_OP_CFG = {
  MORA:       { label: 'Mora',        color: 'var(--rose)', bg: 'var(--rose-bg)' },
  GRACIA:     { label: 'En gracia',   color: 'var(--warning-bright)', bg: 'var(--warning-bg)' },
  SUSPENDIDO: { label: 'Suspendido',  color: 'var(--text-primary)', bg: 'var(--neutral-200)' },
  VENCIDO:    { label: 'Vencido',     color: 'var(--text-muted)', bg: 'var(--bg-topbar)' },
};

// ─── Colores de software determinísticos ───────────────
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

// ─── transiciones permitidas ──────────────────────────────────────────────────
const ETAPA_SIGUIENTE = {
  BORRADOR: [{ etapa: 'REVISION', label: 'Enviar a Revisión', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' }],
  REVISION: [{ etapa: 'APROBADO', label: 'Aprobar', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' }],
  APROBADO: [{ etapa: 'PENDIENTE_FIRMA', label: 'Enviar a Firma', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' }],
  PENDIENTE_FIRMA: [{ etapa: 'ACTIVO', label: 'Registrar Firma', icon: 'M20 6L9 17l-5-5', primary: true, color: 'var(--sky)' }],
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
  
  const [showEditText, setShowEditText] = useState(false);
  const [editTextContent, setEditTextContent] = useState('');
  const [actionError, setActionError] = useState(null);

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [obligationHistory, setObligationHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showObligacionModal, setShowObligacionModal] = useState(false);
  const [editingObligacion, setEditingObligacion] = useState(null);
  const [obForm, setObForm] = useState({ tipo_obligacion: '', descripcion: '', penalizacion: '' });
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  const [showAssignTemplateModal, setShowAssignTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Previsualización del documento generado: null = versión más reciente.
  const [previewDocId, setPreviewDocId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Escape sale de la vista previa (además del breadcrumb "← Documento").
  useEffect(() => {
    if (!showPreview) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowPreview(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPreview]);

  async function handleOpenAssignTemplate() {
    setShowAssignTemplateModal(true);
    setTemplatesLoading(true);
    try {
      const data = await getPlantillas({ tipo_contrato: contrato.tipo_contrato, software: contrato.software.id });
      setAvailableTemplates(data.results || data);
    } catch (err) {
      console.error(err);
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function handleAssignTemplate(templateId) {
    setBusy(true);
    try {
      await togglePlantillaActiva(templateId, true);
      setShowAssignTemplateModal(false);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

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
      setPreviewDocId(null); // la previsualización vuelve a la versión más reciente
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

  async function handleSaveEditText() {
    setBusy(true);
    try {
      await updateContrato(contrato.id, { texto_adicional_clausulas: editTextContent });
      setShowEditText(false);
      await load();
    } catch (err) {
      alert(err.message || 'Error al guardar el texto.');
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
  // Modo enfoque: con la vista previa del PDF abierta se oculta la titlebar
  // (ID, versión, badges, cliente, KPIs) y los anexos para darle el máximo
  // de espacio al documento. El app shell y el breadcrumb siguen visibles.
  const focusMode = showPreview && activeTab === 'documento' && contrato.documentos.length > 0;
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: 'M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8' },
    { id: 'documento', label: 'Documento', icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h4'] },
    { id: 'historial', label: 'Historial', icon: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 7v5l3 3'] },
    { id: 'sla', label: 'Obligaciones / SLA', icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'] },
  ];

  return (
    <div className="ct-workspace">
      <div className="ct-workspace-header">
        <div className="ct-workspace-breadcrumb">
          {/* En modo enfoque, "volver" sale de la vista previa hacia el tab
              Documento; fuera de él, vuelve al listado de contratos. */}
          <button className="ct-breadcrumb-btn" onClick={focusMode ? () => setShowPreview(false) : onBack}>
            <Icon d="M15 18l-6-6 6-6" color="var(--text-muted)" w={14} />
            {focusMode ? 'Documento' : 'Contratos'}
          </button>
          <Icon d="M9 18l6-6-6-6" color="var(--border)" w={12} />
          <span className="ct-breadcrumb-current">
            {contratoIdDisplay(contrato.id)}{focusMode ? ' · Vista previa' : ''}
          </span>
        </div>
        <div className="ct-workspace-actions">
          {contrato.etapa === 'BORRADOR' && (
            <>
              {contrato.plantilla_activa?.modo_origen === 'clausulas' && (contrato.etapa === 'BORRADOR' || contrato.etapa === 'REVISION') && (
                <button className="ct-btn-secondary" style={{ marginLeft: 8 }} disabled={busy} onClick={() => {
                  setEditTextContent(contrato.texto_adicional_clausulas || '');
                  setShowEditText(true);
                }}>
                  Editar Texto
                </button>
              )}
              <button className="ct-btn-secondary" style={{ marginLeft: 8 }} disabled={busy} onClick={() => handleGenerarDocumento(false)}>
                <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-muted)" w={13} />
                {contrato.documentos.length > 0 ? 'Regenerar Documento' : 'Generar Documento'}
              </button>
            </>
          )}
          {siguientes.map(s => (
            <button key={s.etapa}
              className={s.danger ? 'ct-btn-danger' : s.primary ? 'ct-btn-primary' : 'ct-btn-secondary'}
              disabled={busy}
              style={s.color ? { background: s.color, color: 'var(--text-on-accent)' } : undefined}
              onClick={() => handleTransicion(s.etapa, s.confirm)}>
              <Icon d={s.icon} color={s.danger || s.primary || s.color ? 'var(--text-on-accent)' : 'var(--text-muted)'} w={13} />
              {s.label}
            </button>
          ))}
          {contrato.etapa === 'BORRADOR' && (
            <button className="ct-icon-btn" title="Eliminar borrador" disabled={busy} onClick={handleEliminar}>
              <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="var(--danger)" w={14} />
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="ct-alert-error" role="alert">{actionError}</div>
      )}

      {!focusMode && (
      <div className="ct-workspace-titlebar">
        <div className="ct-workspace-title-left">
          <div>
            <div className="ct-workspace-id-row">
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
                <span className="ct-days-chip" style={{ background: contrato.dias_restantes < 0 ? 'var(--rose-bg)' : 'var(--warning-bg)', color: contrato.dias_restantes < 0 ? 'var(--rose)' : 'var(--warning-bright)', border: `1px solid ${contrato.dias_restantes < 0 ? 'var(--rose-border)' : 'var(--warning-border)'}` }}>
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
      )}

      {!focusMode && (
      <div className="ct-workspace-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`ct-workspace-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <Icon d={t.icon} color={activeTab === t.id ? 'var(--primary)' : 'var(--text-faint)'} w={14} />
            {t.label}
          </button>
        ))}
      </div>
      )}

      <div className={`ct-workspace-content${focusMode ? ' focus' : ''}`}>
        {activeTab === 'resumen' && (
          <div className="ct-tab-resumen">
            <div className="ct-resumen-grid">
              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" color="var(--primary)" w={14} />
                  Producto Licenciado
                </p>
                <p className="ct-resumen-software">{contrato.software.nombre}</p>
                <p className="ct-resumen-detail">SLA: <strong>{contrato.sla.nombre}</strong></p>
                <p className="ct-resumen-detail">Responsable: <strong>{contrato.responsable || '—'}</strong></p>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="var(--success-alt)" w={14} />
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
                  <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" color="var(--text-muted)" w={12} />
                  {contrato.tipo_contrato_display}{contrato.frecuencia_facturacion ? ` · ${contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : 'Mensual'}` : ''}
                </div>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" color="var(--warning-bright)" w={14} />
                  Fechas Críticas
                </p>
                <div className="ct-resumen-dates">
                  <div className="ct-date-row">
                    <span className="ct-date-label">Inicio del contrato</span>
                    <span className="ct-date-value">{fmtDate(contrato.fecha_inicio)}</span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Próxima renovación</span>
                    <span className="ct-date-value" style={{ color: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? 'var(--rose)' : 'var(--text-primary)', fontWeight: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? 700 : 600 }}>
                      {fmtDate(contrato.fecha_vencimiento)}
                    </span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Creado</span>
                    <span className="ct-date-value">{fmtDate(contrato.fecha_creacion)}</span>
                  </div>
                </div>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="var(--violet-bright)" w={14} />
                  Legal / Administrativa
                </p>
                <div className="ct-resumen-dates">
                  <div className="ct-date-row">
                    <span className="ct-date-label">Período de Gracia</span>
                    <span className="ct-date-value">{contrato.dias_gracia_autorizados > 0 ? `${contrato.dias_gracia_autorizados} días` : 'No autorizado'}</span>
                  </div>
                  {contrato.fin_periodo_gracia && (
                    <div className="ct-date-row">
                      <span className="ct-date-label">Fin de Gracia</span>
                      <span className="ct-date-value">{fmtDate(contrato.fin_periodo_gracia)}</span>
                    </div>
                  )}
                  <div className="ct-date-row">
                    <span className="ct-date-label">Obligaciones SLA</span>
                    <span className="ct-date-value">{contrato.obligaciones_sla ? contrato.obligaciones_sla.length : 0} registradas</span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Versión</span>
                    <span className="ct-date-value">v{contrato.version || '1.0'}</span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Plantilla Activa</span>
                    {contrato.plantilla_activa ? (
                      <span className="ct-date-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {contrato.plantilla_activa.nombre} (v{contrato.plantilla_activa.version_codigo})
                        <button 
                          onClick={handleOpenAssignTemplate} 
                          title="Cambiar plantilla activa" 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={14} color="var(--primary)" />
                        </button>
                      </span>
                    ) : (
                      <button 
                        className="ct-assign-template-btn" 
                        onClick={handleOpenAssignTemplate}
                        title="Asignar plantilla en modal"
                      >
                        Aún no se establece
                        <Icon d="M12 5v14M5 12h14" color="currentColor" w={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" color="var(--indigo-bright)" w={14} />
                  Contraparte (RRHH)
                </p>
                <p className="ct-resumen-software" style={{ fontSize: '13px', marginBottom: '8px' }}>{contrato.cliente.nombre}</p>
                {contrato.cliente.email && (
                  <p className="ct-resumen-detail">Email: <strong>{contrato.cliente.email}</strong></p>
                )}
                <p className="ct-resumen-detail">ID Cliente: <strong>{contrato.cliente.id}</strong></p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documento' && (
          <div className="ct-tab-documento">
            <div className="ct-doc-viewer">
              {contrato.documentos.length > 0 ? (() => {
                const docs = contrato.documentos; // ordenados por -fecha_generacion
                const previewDoc = docs.find(d => d.id === previewDocId) || docs[0];
                const esUltima = previewDoc.id === docs[0].id;
                return (
                  <>
                    {!focusMode && (
                    <div className="ct-doc-header">
                      <div className="ct-doc-info">
                        <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--primary)" w={20} />
                        <div>
                          <p className="ct-doc-name">
                            Documento generado · v{previewDoc.plantilla_version}
                            {!esUltima && <span className="ct-doc-old-tag"> versión anterior</span>}
                          </p>
                          <p className="ct-doc-meta">{fmtDateTime(previewDoc.fecha_generacion)} · hash {previewDoc.hash_sha256.slice(0, 12)}…</p>
                        </div>
                      </div>
                      <div className="ct-doc-actions">
                        {docs.length > 1 && (
                          <select
                            className="ct-select"
                            value={previewDoc.id}
                            onChange={e => setPreviewDocId(Number(e.target.value))}
                            title="Versión del documento a previsualizar"
                          >
                            {docs.map((d, i) => (
                              <option key={d.id} value={d.id}>
                                {i === 0 ? 'Última' : `v${d.plantilla_version}`} · {fmtDateTime(d.fecha_generacion)}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          className={`ct-btn-secondary${showPreview ? ' active' : ''}`}
                          onClick={() => setShowPreview(v => !v)}
                          title={showPreview ? 'Ocultar la vista previa' : 'Previsualizar el PDF sin descargarlo'}
                        >
                          <Icon
                            d={showPreview
                              ? ['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94', 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19', 'M14.12 14.12a3 3 0 1 1-4.24-4.24', 'M1 1l22 22']
                              : ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z']}
                            color="var(--text-muted)" w={13}
                          />
                          {showPreview ? 'Ocultar vista previa' : 'Previsualizar'}
                        </button>
                        <a className="ct-btn-secondary" href={`/api/plantillas/documentos/${previewDoc.id}/pdf/`} target="_blank" rel="noreferrer">
                          <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="var(--text-muted)" w={13} />
                          Descargar PDF
                        </a>
                      </div>
                    </div>
                    )}
                    {showPreview ? (
                      <iframe
                        key={previewDoc.id}
                        className="ct-doc-frame"
                        title={`Previsualización del documento v${previewDoc.plantilla_version}`}
                        src={`/api/plantillas/documentos/${previewDoc.id}/pdf/?inline=1#view=FitH`}
                      />
                    ) : (
                      <div className="ct-doc-preview-placeholder">
                        <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z']} color="var(--border)" w={32} />
                        <p>
                          Usa <strong>Previsualizar</strong> para ver el PDF aquí mismo, sin descargarlo.
                          Para salir de la vista previa: <strong>Esc</strong> o el botón <strong>← Documento</strong>.
                        </p>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="ct-doc-empty">
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 12v6', 'M9 15l3 3 3-3']} color="var(--border)" w={40} />
                  <p>El documento aún no ha sido generado</p>
                  <p className="ct-doc-empty-sub">Genera el documento base desde la plantilla activa para este tipo de contrato y software.</p>
                  {contrato.plantilla_activa?.modo_origen === 'clausulas' && (
                    <button className="ct-btn-secondary" disabled={busy} style={{ marginLeft: 8 }} onClick={() => {
                      setEditTextContent(contrato.texto_adicional_clausulas || '');
                      setShowEditText(true);
                    }}>
                      Editar Texto
                    </button>
                  )}
                  <button className="ct-btn-primary" disabled={busy} style={{ marginLeft: 8 }} onClick={() => handleGenerarDocumento(false)}>
                    <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                    Generar Documento
                  </button>
                </div>
              )}
            </div>

            {showEditText && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.5)', padding: 24 }}>
                <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 8, width: 800, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Editar Texto del Contrato</h3>
                  <textarea
                    value={editTextContent}
                    onChange={e => setEditTextContent(e.target.value)}
                    style={{ width: '100%', minHeight: 400, padding: 12, fontSize: 13, border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="ct-btn-secondary" onClick={() => setShowEditText(false)}>Cancelar</button>
                    <button className="ct-btn-primary" onClick={handleSaveEditText} disabled={busy}>Guardar Texto</button>
                  </div>
                </div>
              </div>
            )}

            {!focusMode && (
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
                        <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--text-muted)" w={14} />
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
            )}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="ct-tab-historial">
            <div className="ct-timeline">
              {contrato.historial.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-soft)' }}>Sin eventos registrados.</p>
              )}
              {contrato.historial.map((ev, i) => {
                const isLast = i === contrato.historial.length - 1;
                const isActivado = ev.etapa_nueva === 'ACTIVO';
                return (
                  <div key={i} className="ct-timeline-item">
                    <div className="ct-timeline-track">
                      <div className={`ct-timeline-dot ${isActivado ? 'signed' : ''}`}
                        style={{ background: isActivado ? 'var(--success-deep)' : 'var(--border)', border: `2px solid ${isActivado ? 'var(--success-border)' : 'var(--neutral-200)'}` }} />
                      {!isLast && <div className="ct-timeline-line" />}
                    </div>
                    <div className="ct-timeline-content">
                      <p className="ct-timeline-time">{fmtDateTime(ev.fecha)}</p>
                      <p className="ct-timeline-actor">{ev.actor}</p>
                      <p className="ct-timeline-action" style={{ color: isActivado ? 'var(--success-deep)' : 'var(--text-primary)' }}>
                        → {ev.etapa_nueva_display}{ev.notas ? ` — ${ev.notas}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ct-audit-note">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="var(--violet-bright)" w={14} />
              <p>El historial de auditoría es inmutable. Registra automáticamente cada transición de etapa con marca de tiempo y actor responsable.</p>
            </div>
          </div>
        )}

        {activeTab === 'sla' && (
          <div className="ct-tab-sla">
            <div className="ct-sla-toolbar">
              <p className="ct-section-label">Obligaciones contractuales — SLA: {contrato.sla.nombre}</p>
              {contrato.etapa === 'BORRADOR' ? (
                <button className="ct-btn-primary" onClick={() => handleOpenObligacionModal()}>
                  <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                  Añadir SLA
                </button>
              ) : (
                <button className="ct-btn-secondary" onClick={() => handleEnmendar()}>
                  <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-muted)" w={13} />
                  Enmendar SLA / Crear Anexo
                </button>
              )}
            </div>
            {contrato.obligaciones_sla.length === 0 ? (
              <div className="ct-sla-empty">
                <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="var(--border)" w={36} />
                <p>Sin obligaciones contractuales asociadas</p>
              </div>
            ) : (
              <div className="ct-sla-cards">
                {contrato.obligaciones_sla.map((s, i) => (
                  <div key={s.id || i} className="ct-sla-card">
                    <div className="ct-sla-card-head">
                      <div className="ct-sla-card-title">
                        <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="var(--primary)" w={18} />
                        <h4>{s.tipo_obligacion}</h4>
                      </div>
                      {contrato.etapa === 'BORRADOR' && s.id && (
                        <div className="ct-sla-card-actions">
                          <button className="ct-icon-btn" title="Editar obligación" onClick={() => handleOpenObligacionModal(s)}>
                            <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" color="var(--primary)" w={14} />
                          </button>
                          <button className="ct-icon-btn" title="Eliminar obligación" onClick={() => handleEliminarObligacion(s.id)}>
                            <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="var(--danger)" w={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="ct-sla-card-body">
                      <p className="ct-sla-card-desc">
                        <strong>Descripción / Métrica:</strong> {s.descripcion}
                      </p>
                      <p className="ct-sla-card-penalty">
                        <strong>Penalización / Consecuencia:</strong> {s.penalizacion}
                      </p>
                    </div>

                    {s.id && (
                      <div className="ct-sla-card-footer">
                        <button className="ct-btn-ghost-sm" onClick={() => toggleHistory(s.id)}>
                          {expandedHistoryId === s.id ? 'Ocultar historial' : 'Ver historial'}
                        </button>

                        {expandedHistoryId === s.id && (
                          <div className="ct-obligation-history">
                            <h5>Historial de Cambios</h5>
                            {historyLoading ? (
                              <p className="ct-history-hint">Cargando historial…</p>
                            ) : !obligationHistory[s.id] || obligationHistory[s.id].length === 0 ? (
                              <p className="ct-history-hint">Sin registros de cambios.</p>
                            ) : (
                              <div className="ct-history-list">
                                {obligationHistory[s.id].map((log) => (
                                  <div key={log.id} className="ct-history-entry">
                                    <div className="ct-history-entry-head">
                                      {fmtDateTime(log.fecha)} · {log.usuario} · <span style={{ color: log.accion === 'CREAR' ? 'var(--success-deep)' : log.accion === 'EDITAR' ? 'var(--primary)' : 'var(--danger)' }}>{log.accion}</span>
                                    </div>
                                    {log.valor_anterior && (
                                      <div className="ct-history-prev">Antes: {log.valor_anterior}</div>
                                    )}
                                    <div className="ct-history-new">Nuevo: {log.valor_nuevo || '(Eliminado)'}</div>
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
        <div className="ct-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setShowObligacionModal(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && !busy) setShowObligacionModal(false); }}>
          <div className="ct-modal" role="dialog" aria-modal="true"
            aria-label={editingObligacion ? 'Editar obligación' : 'Añadir obligación'}>
            <h3>{editingObligacion ? 'Editar Obligación / SLA' : 'Añadir Obligación / SLA'}</h3>
            <form onSubmit={handleSaveObligacion}>
              <div className="ct-modal-fields">
                <div className="ct-modal-field">
                  <label htmlFor="ob-tipo">Tipo de Obligación</label>
                  <input
                    id="ob-tipo"
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej. Soporte Técnico, Uptime de la aplicación"
                    value={obForm.tipo_obligacion}
                    onChange={e => setObForm(prev => ({ ...prev, tipo_obligacion: e.target.value }))}
                  />
                </div>
                <div className="ct-modal-field">
                  <label htmlFor="ob-desc">Descripción / Métrica</label>
                  <textarea
                    id="ob-desc"
                    required
                    rows={3}
                    placeholder="Ej. Garantizar un 99.9% de tiempo en línea mensual"
                    value={obForm.descripcion}
                    onChange={e => setObForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
                <div className="ct-modal-field">
                  <label htmlFor="ob-pena">Penalización / Consecuencia</label>
                  <textarea
                    id="ob-pena"
                    required
                    rows={2}
                    placeholder="Ej. Descuento del 10% en la siguiente factura si no se cumple"
                    value={obForm.penalizacion}
                    onChange={e => setObForm(prev => ({ ...prev, penalizacion: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ct-modal-footer">
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

      {showAssignTemplateModal && (
        <div className="ct-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !busy) setShowAssignTemplateModal(false); }}>
          <div className="ct-modal" role="dialog" aria-modal="true">
            <h3>Asignar Plantilla Activa</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Selecciona una plantilla para el tipo de contrato <strong>{contrato.tipo_contrato_display}</strong> y producto <strong>{contrato.software.nombre}</strong>.
            </p>
            {templatesLoading ? (
              <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Cargando plantillas...</p>
            ) : availableTemplates.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--rose)' }}>No hay plantillas creadas para este tipo y producto.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                {availableTemplates.map(tmpl => (
                  <div key={tmpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '600', margin: '0' }}>{tmpl.nombre} (v{tmpl.version_codigo})</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-soft)', margin: '4px 0 0' }}>Actualizado: {fmtDate(tmpl.fecha_creacion)}</p>
                    </div>
                    <button className="ct-btn-primary" disabled={busy} onClick={() => handleAssignTemplate(tmpl.id)}>
                      {busy ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="ct-modal-footer">
              <button type="button" className="ct-btn-secondary" onClick={() => setShowAssignTemplateModal(false)} disabled={busy}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
