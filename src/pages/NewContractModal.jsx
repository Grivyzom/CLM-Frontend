import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createContrato, getClientes, getSoftwareList, getSLAs, getPlantillas } from '../api';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPO_CONTRATO_OPTIONS = [
  { value: 'RECURRENTE', label: 'Recurrente' },
  { value: 'PERPETUO',   label: 'Perpetuo' },
  { value: 'PRO_BONO',   label: 'Pro Bono' },
  { value: 'INTERNO',    label: 'Interno / Propio' },
];
const FRECUENCIA_OPTIONS = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'ANUAL',   label: 'Anual' },
];
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ─── Micro SVG ────────────────────────────────────────────────────────────────
function Svg({ d, size = 14, color = '#7c7670', sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

// ─── Field primitives ─────────────────────────────────────────────────────────
const iS = (err) => ({
  width: '100%', padding: '8px 12px', boxSizing: 'border-box',
  border: err ? '1px solid #fca5a5' : '1px solid #d8d4cc',
  borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
  background: err ? '#fef2f2' : '#f8f7f5', color: '#3b3631', outline: 'none',
});
const labelS = { display: 'block', fontSize: 9, fontWeight: 700, color: '#7c7670',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono',monospace" };

function FL({ children, req }) {
  return <label style={labelS}>{children} {req && <span style={{ color: '#dc2626' }}>*</span>}</label>;
}
function TF({ label, req, name, type = 'text', value, onChange, error, placeholder, ...rest }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FL req={req}>{label}</FL>
      <input type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} style={iS(error)} {...rest} />
      {error && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}
function SF({ label, req, name, value, onChange, error, options, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FL req={req}>{label}</FL>
      <select name={name} value={value} onChange={onChange} style={iS(error)}>
        <option value="">{placeholder || 'Seleccionar…'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Sujetos y objeto' },
  { num: 2, label: 'Términos comerciales' },
  { num: 3, label: 'Plazos y control' },
];
function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 24px', marginBottom: 24 }}>
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#16a34a' : active ? '#2563eb' : '#e5e2da',
                border: `2px solid ${done ? '#16a34a' : active ? '#2563eb' : '#d8d4cc'}`,
                transition: 'all 0.2s',
              }}>
                {done
                  ? <Svg d="M20 6 9 17l-5-5" size={13} color="#fff" sw={2.5} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#b0aaa3', fontFamily: "'JetBrains Mono',monospace" }}>{s.num}</span>
                }
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: active ? '#2563eb' : done ? '#16a34a' : '#b0aaa3',
                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: current > s.num ? '#16a34a' : '#e5e2da',
                margin: '0 8px', marginBottom: 20, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Summary row helper ───────────────────────────────────────────────────────
function SRow({ label, value, accent }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid #f0ede8' }}>
      <span style={{ fontSize: 11, color: '#7c7670', fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: accent ? '#2563eb' : '#3b3631' }}>{value}</span>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function NewContractModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Catalog data ──────────────────────────────────────────────────────────
  const [softwareList, setSoftwareList] = useState([]);
  const [slaList, setSlaList] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);

  useEffect(() => {
    getSoftwareList().then(setSoftwareList).catch(() => setSoftwareList([]));
    getSLAs().then(setSlaList).catch(() => setSlaList([]));
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const [clienteSelected, setClienteSelected] = useState(null);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState([]);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteLoading, setClienteLoading] = useState(false);
  const clienteTimerRef = useRef(null);

  const [form, setForm] = useState({
    software_id: '',
    plantilla_id: '',
    sla_id: '',
    tipo_contrato: 'RECURRENTE',
    tipo_facturacion: 'RECURRENTE', // mirrors tipo_contrato selection
    frecuencia_facturacion: 'MENSUAL',
    monto: '',
    fecha_inicio: todayISO(),
    fecha_vencimiento: '',
    sin_vencimiento: false,
    dias_gracia_autorizados: '0',
  });

  // ── Cliente autocomplete ──────────────────────────────────────────────────
  useEffect(() => {
    if (clienteSelected) return;
    if (clienteTimerRef.current) clearTimeout(clienteTimerRef.current);
    if (clienteQuery.trim().length < 2) { setClienteResults([]); return; }
    clienteTimerRef.current = setTimeout(async () => {
      setClienteLoading(true);
      try {
        const res = await getClientes({ search: clienteQuery.trim(), page_size: 8 });
        setClienteResults(res.results || []);
      } catch { setClienteResults([]); }
      finally { setClienteLoading(false); }
    }, 300);
    return () => clearTimeout(clienteTimerRef.current);
  }, [clienteQuery, clienteSelected]);

  // ── Load plantillas when software changes ─────────────────────────────────
  useEffect(() => {
    if (!form.software_id) { setPlantillas([]); return; }
    setLoadingPlantillas(true);
    setForm(f => ({ ...f, plantilla_id: '' }));
    getPlantillas({ software: form.software_id, activa: true })
      .then(data => setPlantillas(data || []))
      .catch(() => setPlantillas([]))
      .finally(() => setLoadingPlantillas(false));
  }, [form.software_id]);

  const set = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  // ── Validate per step ─────────────────────────────────────────────────────
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!clienteSelected) errs.cliente_id = 'Selecciona un cliente';
      if (!form.software_id) errs.software_id = 'Selecciona un software';
      if (!form.plantilla_id) errs.plantilla_id = 'Selecciona una plantilla';
    }
    if (s === 2) {
      if (!form.sla_id) errs.sla_id = 'Selecciona un SLA';
      const m = parseFloat(form.monto);
      if (form.monto === '' || isNaN(m) || m < 0) errs.monto = 'Monto inválido (debe ser ≥ 0)';
      if (form.tipo_contrato === 'RECURRENTE' && !form.frecuencia_facturacion) {
        errs.frecuencia_facturacion = 'Requerido para contratos recurrentes';
      }
    }
    if (s === 3) {
      if (!form.fecha_inicio) errs.fecha_inicio = 'Fecha de inicio requerida';
      if (!form.sin_vencimiento && form.fecha_vencimiento && form.fecha_vencimiento < form.fecha_inicio) {
        errs.fecha_vencimiento = 'Debe ser posterior a la fecha de inicio';
      }
      const dg = parseInt(form.dias_gracia_autorizados, 10);
      if (isNaN(dg) || dg < 0) errs.dias_gracia_autorizados = 'Debe ser un número ≥ 0';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      const payload = {
        cliente_id: clienteSelected.id,
        software_id: form.software_id,
        sla_id: form.sla_id,
        tipo_contrato: form.tipo_contrato,
        monto: form.monto,
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: (form.sin_vencimiento || !form.fecha_vencimiento) ? null : form.fecha_vencimiento,
        dias_gracia_autorizados: parseInt(form.dias_gracia_autorizados, 10) || 0,
      };
      if (form.tipo_contrato === 'RECURRENTE') {
        payload.frecuencia_facturacion = form.frecuencia_facturacion;
      }
      const nuevo = await createContrato(payload);
      onSuccess?.(nuevo);
      onClose();
    } catch (err) {
      setErrors(e => ({ ...e, submit: err.message }));
    } finally {
      setLoading(false);
    }
  };

  // ── Derived labels for summary ────────────────────────────────────────────
  const swNombre = softwareList.find(s => String(s.id) === String(form.software_id))?.nombre || '';
  const plantillaNombre = plantillas.find(p => String(p.id) === String(form.plantilla_id))?.nombre || '';
  const slaNombre = slaList.find(s => String(s.id) === String(form.sla_id))?.nombre || '';
  const tipoLabel = TIPO_CONTRATO_OPTIONS.find(t => t.value === form.tipo_contrato)?.label || '';
  const frecLabel = FRECUENCIA_OPTIONS.find(f => f.value === form.frecuencia_facturacion)?.label || '';
  const clienteNombre = clienteSelected?.nombre_comercial || clienteSelected?.razon_social || '';

  const esRecurrente = form.tipo_contrato === 'RECURRENTE';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 40, backdropFilter: 'blur(2px)',
        animation: 'fadeIn 0.15s ease-out',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 10,
        border: '1px solid #d8d4cc',
        boxShadow: '0 24px 60px rgba(0,0,0,.18)',
        zIndex: 50, width: '94%', maxWidth: 580,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        animation: 'modalIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px 16px', borderBottom: '1px solid #e5e2da',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#3b3631' }}>Nuevo Contrato</h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#7c7670' }}>
              Se crea en etapa <strong>Borrador</strong> · {STEPS[step - 1].label}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, border: '1px solid #d8d4cc', background: '#f0ede8',
            borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Svg d={['M18 6 6 18', 'M6 6l12 12']} color="#b0aaa3" size={13} />
          </button>
        </div>

        {/* Step bar */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <StepBar current={step} />
        </div>

        {/* Body */}
        <div style={{ padding: '0 24px 4px', overflowY: 'auto', flex: 1 }}>

          {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              {/* Cliente */}
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <FL req>Cliente</FL>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={clienteQuery}
                    onChange={e => {
                      setClienteQuery(e.target.value);
                      setClienteSelected(null);
                      setClienteOpen(true);
                      if (errors.cliente_id) setErrors(er => ({ ...er, cliente_id: '' }));
                    }}
                    onFocus={() => setClienteOpen(true)}
                    placeholder="Buscar por nombre, razón social o email…"
                    style={iS(errors.cliente_id)}
                  />
                  {clienteSelected && (
                    <button type="button" onClick={() => { setClienteSelected(null); setClienteQuery(''); setClienteResults([]); }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}>
                      <Svg d={['M18 6 6 18', 'M6 6l12 12']} color="#b0aaa3" size={12} />
                    </button>
                  )}
                </div>
                {clienteOpen && !clienteSelected && clienteQuery.trim().length >= 2 && (
                  <div style={{
                    position: 'absolute', zIndex: 60, top: '100%', left: 0, right: 0, marginTop: 4,
                    background: '#fff', border: '1px solid #d8d4cc', borderRadius: 6,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto',
                  }}>
                    {clienteLoading && <div style={{ padding: 10, fontSize: 11, color: '#7c7670' }}>Buscando…</div>}
                    {!clienteLoading && clienteResults.length === 0 && <div style={{ padding: 10, fontSize: 11, color: '#7c7670' }}>Sin resultados</div>}
                    {!clienteLoading && clienteResults.map(c => (
                      <div key={c.id} onClick={() => { setClienteSelected(c); setClienteQuery(c.nombre_comercial || c.razon_social || ''); setClienteOpen(false); if (errors.cliente_id) setErrors(er => ({ ...er, cliente_id: '' })); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#3b3631', borderBottom: '1px solid #f0ede8' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8f7f5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ fontWeight: 600 }}>{c.nombre_comercial || c.razon_social}</div>
                        <div style={{ fontSize: 10, color: '#7c7670' }}>{c.email} · {c.id_fiscal}</div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.cliente_id && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#dc2626' }}>{errors.cliente_id}</p>}
              </div>

              {/* Software */}
              <SF
                label="Producto / Software"
                req name="software_id"
                value={form.software_id}
                onChange={handleChange}
                error={errors.software_id}
                placeholder="Selecciona el producto del acuerdo"
                options={softwareList.map(s => ({ value: s.id, label: s.nombre }))}
              />

              {/* Plantilla — filtrada por software */}
              <div style={{ marginBottom: 14 }}>
                <FL req>Plantilla de Contrato</FL>
                {!form.software_id ? (
                  <div style={{
                    padding: '10px 12px', background: '#fafaf9', border: '1px dashed #d8d4cc',
                    borderRadius: 6, fontSize: 11, color: '#b0aaa3', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Svg d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" color="#d8d4cc" size={14} />
                    Selecciona un software para ver las plantillas disponibles
                  </div>
                ) : loadingPlantillas ? (
                  <div style={{ padding: '10px 12px', background: '#f8f7f5', border: '1px solid #d8d4cc', borderRadius: 6, fontSize: 11, color: '#7c7670' }}>
                    Cargando plantillas…
                  </div>
                ) : plantillas.length === 0 ? (
                  <div style={{
                    padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 6, fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Svg d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="#d97706" size={14} />
                    No hay plantillas activas para este software. Crea una en Catálogo → Plantillas.
                  </div>
                ) : (
                  <select name="plantilla_id" value={form.plantilla_id} onChange={handleChange} style={iS(errors.plantilla_id)}>
                    <option value="">Seleccionar plantilla…</option>
                    {plantillas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · {p.version_codigo} {p.tipo_contrato_display ? `(${p.tipo_contrato_display})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.plantilla_id && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#dc2626' }}>{errors.plantilla_id}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SF label="Tipo de Contrato" req name="tipo_contrato"
                  value={form.tipo_contrato} onChange={handleChange}
                  error={errors.tipo_contrato}
                  options={TIPO_CONTRATO_OPTIONS}
                />
                <SF label="SLA (Nivel de Servicio)" req name="sla_id"
                  value={form.sla_id} onChange={handleChange}
                  error={errors.sla_id}
                  placeholder="Selecciona el SLA"
                  options={slaList.map(s => ({ value: s.id, label: s.nombre }))}
                />
              </div>

              {/* Billing section */}
              <div style={{
                padding: '12px 14px', background: '#f8f7f5', borderRadius: 8,
                border: '1px solid #e5e2da', marginBottom: 14,
              }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#5c574f',
                  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono',monospace" }}>
                  Facturación
                </p>
                {esRecurrente ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <SF label="Frecuencia" req name="frecuencia_facturacion"
                      value={form.frecuencia_facturacion} onChange={handleChange}
                      error={errors.frecuencia_facturacion}
                      options={FRECUENCIA_OPTIONS}
                    />
                    <TF
                      label={`Monto por ciclo (${form.frecuencia_facturacion === 'ANUAL' ? 'anual' : 'mensual'})`}
                      req name="monto" type="number" step="0.01" min="0"
                      value={form.monto} onChange={handleChange}
                      error={errors.monto} placeholder="ej: 1500.00"
                    />
                  </div>
                ) : (
                  <TF label="Monto" req name="monto" type="number" step="0.01" min="0"
                    value={form.monto} onChange={handleChange}
                    error={errors.monto} placeholder="ej: 5000.00"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <TF label="Fecha de Inicio" req name="fecha_inicio" type="date"
                  value={form.fecha_inicio} onChange={handleChange} error={errors.fecha_inicio}
                />
                <div style={{ marginBottom: 14 }}>
                  <FL>Fecha de Vencimiento</FL>
                  <input type="date" name="fecha_vencimiento"
                    value={form.fecha_vencimiento}
                    onChange={handleChange}
                    disabled={form.sin_vencimiento}
                    style={{ ...iS(errors.fecha_vencimiento), opacity: form.sin_vencimiento ? 0.5 : 1 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
                    <input type="checkbox" name="sin_vencimiento" checked={form.sin_vencimiento}
                      onChange={handleChange} style={{ cursor: 'pointer' }} />
                    <span style={{ fontSize: 10, color: '#7c7670' }}>Sin fecha de vencimiento (perpetuo)</span>
                  </label>
                  {errors.fecha_vencimiento && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#dc2626' }}>{errors.fecha_vencimiento}</p>}
                </div>
              </div>

              <TF label="Días de Gracia Autorizados" name="dias_gracia_autorizados"
                type="number" min="0" value={form.dias_gracia_autorizados}
                onChange={handleChange} error={errors.dias_gracia_autorizados}
                placeholder="0"
              />

              {/* Summary */}
              <div style={{
                background: '#f8f7f5', borderRadius: 8, border: '1px solid #e5e2da',
                padding: '14px 16px', marginBottom: 6,
              }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#5c574f',
                  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono',monospace" }}>
                  Resumen del Contrato
                </p>
                <SRow label="Cliente" value={clienteNombre} />
                <SRow label="Software" value={swNombre} accent />
                <SRow label="Plantilla" value={plantillaNombre} />
                <SRow label="SLA" value={slaNombre} />
                <SRow label="Tipo" value={tipoLabel} />
                {esRecurrente && <SRow label="Facturación" value={frecLabel} />}
                <SRow label={esRecurrente ? `Monto / ciclo` : 'Monto'} value={form.monto ? `$${Number(form.monto).toLocaleString('es-CL')} USD` : ''} accent />
                <SRow label="Inicio" value={form.fecha_inicio} />
                <SRow label="Vencimiento" value={form.sin_vencimiento ? 'Sin vencimiento' : (form.fecha_vencimiento || '—')} />
                {parseInt(form.dias_gracia_autorizados, 10) > 0 && (
                  <SRow label="Días de gracia" value={`${form.dias_gracia_autorizados} días`} />
                )}
              </div>

              {errors.submit && (
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 6, fontSize: 12, color: '#dc2626', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Svg d={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="#dc2626" size={14} />
                  {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #e5e2da',
          display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, background: '#fafaf9', borderRadius: '0 0 10px 10px',
        }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', borderRadius: 6, border: '1px solid #d8d4cc',
            background: '#f0ede8', color: '#5c574f', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancelar</button>

          {step > 1 && (
            <button onClick={prevStep} style={{
              padding: '9px 16px', borderRadius: 6, border: '1px solid #d8d4cc',
              background: '#fff', color: '#3b3631', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Svg d="M15 18l-6-6 6-6" size={13} color="#5c574f" />
              Anterior
            </button>
          )}

          {step < 3 ? (
            <button onClick={nextStep} style={{
              padding: '9px 20px', borderRadius: 6, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Siguiente
              <Svg d="M9 18l6-6-6-6" size={13} color="#fff" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{
              padding: '9px 20px', borderRadius: 6, border: 'none',
              background: loading ? '#93c5fd' : '#2563eb',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {loading ? 'Creando…' : (
                <>
                  <Svg d="M20 6 9 17l-5-5" size={13} color="#fff" sw={2.5} />
                  Crear Contrato
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
