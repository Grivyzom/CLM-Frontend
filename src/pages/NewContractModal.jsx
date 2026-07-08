import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createContrato, getClientes, getClienteDetail, getSoftwareList, getSLAs, getPlantillas, generarDocumentoContrato, getClausulas } from '../api';
import { contratoIdDisplay } from '../utils/formatters';
import './Contratos.css';

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

const INITIAL_FORM = {
  software_id: '',
  plantilla_id: '',
  sla_id: '',
  tipo_contrato: 'RECURRENTE',
  frecuencia_facturacion: 'MENSUAL',
  monto: '',
  fecha_inicio: todayISO(),
  fecha_vencimiento: '',
  sin_vencimiento: false,
  dias_gracia_autorizados: '0',
};

// Campos que el backend puede devolver como error de validación por campo.
const BACKEND_FIELDS = [
  'cliente_id', 'software_id', 'sla_id', 'tipo_contrato', 'monto',
  'fecha_inicio', 'fecha_vencimiento', 'dias_gracia_autorizados', 'frecuencia_facturacion',
];
// Paso del wizard donde vive cada campo (para volver al paso con error).
const FIELD_STEP = {
  cliente_id: 1, software_id: 1, plantilla_id: 1, tipo_contrato: 1,
  sla_id: 2, monto: 2, frecuencia_facturacion: 2,
  fecha_inicio: 3, fecha_vencimiento: 3, dias_gracia_autorizados: 3,
};

// ─── Micro SVG ────────────────────────────────────────────────────────────────
function Svg({ d, size = 14, color = 'var(--text-muted)', sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

// ─── Field primitives ─────────────────────────────────────────────────────────
function FL({ children, req }) {
  return <label className="ctm-label">{children} {req && <span className="ctm-req">*</span>}</label>;
}
function FieldError({ children }) {
  if (!children) return null;
  return <p className="ctm-field-error">{children}</p>;
}
function TF({ label, req, name, type = 'text', value, onChange, error, placeholder, hint, ...rest }) {
  return (
    <div className="ctm-field">
      <FL req={req}>{label}</FL>
      <input type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} className={`ctm-control${error ? ' error' : ''}`} {...rest} />
      {hint && <p className="ctm-hint">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
function SF({ label, req, name, value, onChange, error, options, placeholder }) {
  return (
    <div className="ctm-field">
      <FL req={req}>{label}</FL>
      <select name={name} value={value} onChange={onChange} className={`ctm-control${error ? ' error' : ''}`}>
        <option value="">{placeholder || 'Seleccionar…'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldError>{error}</FieldError>
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
    <div className="ctm-steps">
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        const state = done ? 'done' : active ? 'active' : '';
        return (
          <React.Fragment key={s.num}>
            <div className="ctm-step">
              <div className={`ctm-step-circle ${state}`}>
                {done
                  ? <Svg d="M20 6 9 17l-5-5" size={13} color="var(--text-on-accent)" sw={2.5} />
                  : <span className="ctm-step-num">{s.num}</span>
                }
              </div>
              <span className={`ctm-step-label ${state}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`ctm-step-line ${done ? 'done' : ''}`} />}
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
    <div className="ctm-srow">
      <span className="ctm-srow-label">{label}</span>
      <span className={`ctm-srow-value${accent ? ' accent' : ''}`}
        title={typeof value === 'string' ? value : undefined}>{value}</span>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function NewContractModal({ onClose, onSuccess, initialClienteId = null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Contrato ya creado en el backend (evita duplicados si falla un paso posterior).
  const createdRef = useRef(null);
  // Falló la generación del documento tras crear el contrato.
  const [docError, setDocError] = useState('');

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
  const [clienteActiveIdx, setClienteActiveIdx] = useState(-1);
  const clienteTimerRef = useRef(null);
  const clienteBoxRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [textoClausulas, setTextoClausulas] = useState('');
  const [allClausulas, setAllClausulas] = useState([]);

  useEffect(() => {
    getClausulas().then(setAllClausulas).catch(() => {});
  }, []);

  // Cliente precargado (deep-link desde Clientes): no cuenta como "dato ingresado"
  // para la confirmación de descarte al cerrar.
  const prefillRef = useRef({ clienteId: null, query: '' });

  useEffect(() => {
    if (!initialClienteId) return;
    let cancelled = false;
    getClienteDetail(initialClienteId)
      .then(d => {
        if (cancelled) return;
        const cliente = {
          id: Number(initialClienteId),
          razon_social: d.razon_social,
          nombre_comercial: d.nombre_comercial,
        };
        const query = cliente.nombre_comercial || cliente.razon_social || '';
        prefillRef.current = { clienteId: cliente.id, query };
        setClienteSelected(cliente);
        setClienteQuery(query);
      })
      .catch(() => {}); // sin precarga: el usuario busca manualmente
    return () => { cancelled = true; };
  }, [initialClienteId]);

  const isDirty = (clienteSelected?.id ?? null) !== prefillRef.current.clienteId ||
    clienteQuery !== prefillRef.current.query ||
    JSON.stringify(form) !== JSON.stringify(INITIAL_FORM);

  // ── Cierre seguro: confirma si hay datos; si el contrato ya existe, no se pierde ──
  const attemptClose = useCallback(() => {
    if (loading) return;
    if (createdRef.current) {
      // El contrato ya fue creado; cerrar equivale a continuar sin documento.
      onSuccess?.(createdRef.current);
      onClose();
      return;
    }
    if (isDirty && !window.confirm('¿Descartar el nuevo contrato? Se perderán los datos ingresados.')) return;
    onClose();
  }, [loading, isDirty, onClose, onSuccess]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') attemptClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [attemptClose]);

  // ── Cliente autocomplete ──────────────────────────────────────────────────
  useEffect(() => {
    if (clienteSelected) return;
    if (clienteTimerRef.current) clearTimeout(clienteTimerRef.current);
    if (clienteQuery.trim().length < 2) { setClienteResults([]); setClienteActiveIdx(-1); return; }
    clienteTimerRef.current = setTimeout(async () => {
      setClienteLoading(true);
      try {
        const res = await getClientes({ search: clienteQuery.trim(), page_size: 8 });
        setClienteResults(res.results || []);
        setClienteActiveIdx(-1);
      } catch { setClienteResults([]); }
      finally { setClienteLoading(false); }
    }, 300);
    return () => clearTimeout(clienteTimerRef.current);
  }, [clienteQuery, clienteSelected]);

  // Cierra el dropdown de clientes al hacer clic fuera.
  useEffect(() => {
    const onDown = (e) => {
      if (clienteBoxRef.current && !clienteBoxRef.current.contains(e.target)) setClienteOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pickCliente = (c) => {
    setClienteSelected(c);
    setClienteQuery(c.nombre_comercial || c.razon_social || '');
    setClienteOpen(false);
    setClienteActiveIdx(-1);
    if (errors.cliente_id) setErrors(er => ({ ...er, cliente_id: '' }));
  };

  const onClienteKeyDown = (e) => {
    if (!clienteOpen || clienteSelected || clienteResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setClienteActiveIdx(i => (i + 1) % clienteResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setClienteActiveIdx(i => (i <= 0 ? clienteResults.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickCliente(clienteResults[clienteActiveIdx >= 0 ? clienteActiveIdx : 0]);
    } else if (e.key === 'Escape') {
      // Solo cierra el dropdown; el listener global de Escape no debe cerrar el modal.
      e.stopPropagation();
      setClienteOpen(false);
    }
  };

  // ── Load plantillas cuando cambia software o tipo de contrato ─────────────
  // La plantilla debe ser coherente con ambos: el motor de renderizado resuelve
  // por (tipo_contrato, software) con fallback a plantillas globales.
  useEffect(() => {
    if (!form.software_id) { setPlantillas([]); return; }
    setLoadingPlantillas(true);
    setForm(f => ({ ...f, plantilla_id: '' }));
    getPlantillas({
      software: form.software_id,
      tipo_contrato: form.tipo_contrato,
      incluir_globales: true,
      activa: true,
    })
      .then(data => {
        const lista = data || [];
        setPlantillas(lista);
        // Si hay una sola opción, se preselecciona.
        if (lista.length === 1) setForm(f => ({ ...f, plantilla_id: String(lista[0].id) }));
      })
      .catch(() => setPlantillas([]))
      .finally(() => setLoadingPlantillas(false));
  }, [form.software_id, form.tipo_contrato]);

  const set = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
    
    if (name === 'plantilla_id') {
      const plantilla = plantillas.find(p => String(p.id) === String(value));
      if (plantilla && plantilla.modo_origen === 'clausulas') {
        const selectedIds = plantilla.clausulas_seleccionadas || [];
        const texts = [];
        let i = 1;
        for (const c of allClausulas) {
          if (selectedIds.includes(c.id)) {
            const stdVer = c.versions?.find(v => v.tipo === 'Estándar');
            if (stdVer) {
              texts.push(`${i}. ${c.name.toUpperCase()}\n${stdVer.texto}`);
              i++;
            }
          }
        }
        setTextoClausulas(texts.join('\n\n'));
      } else {
        setTextoClausulas('');
      }
    }
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  // Reglas derivadas del tipo de contrato.
  const esRecurrente = form.tipo_contrato === 'RECURRENTE';
  const esProBono = form.tipo_contrato === 'PRO_BONO';

  const handleTipoChange = (e) => {
    const tipo = e.target.value;
    setForm(f => ({
      ...f,
      tipo_contrato: tipo,
      // Perpetuo implica sin vencimiento (editable después si el usuario quiere).
      sin_vencimiento: tipo === 'PERPETUO' ? true : (f.tipo_contrato === 'PERPETUO' ? false : f.sin_vencimiento),
      // Pro Bono no factura.
      monto: tipo === 'PRO_BONO' ? '0' : (f.tipo_contrato === 'PRO_BONO' ? '' : f.monto),
    }));
    setErrors(er => ({ ...er, tipo_contrato: '', monto: '', frecuencia_facturacion: '' }));
  };

  // ── Validate per step ─────────────────────────────────────────────────────
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!clienteSelected) errs.cliente_id = 'Selecciona un cliente';
      if (!form.software_id) errs.software_id = 'Selecciona un software';
      // Plantilla requerida solo si existen opciones; sin plantillas se permite
      // continuar y generar el documento después desde el workspace.
      if (form.software_id && plantillas.length > 0 && !form.plantilla_id) {
        errs.plantilla_id = 'Selecciona una plantilla';
      }
    }
    if (s === 2) {
      if (!form.sla_id) errs.sla_id = 'Selecciona un SLA';
      if (!esProBono) {
        const m = parseFloat(form.monto);
        if (form.monto === '' || isNaN(m) || m < 0) errs.monto = 'Monto inválido (debe ser ≥ 0)';
      }
      if (esRecurrente && !form.frecuencia_facturacion) {
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
  const generarDocumento = async (contrato) => {
    await generarDocumentoContrato({
      contrato_id: contrato.id,
      plantilla_id: form.plantilla_id,
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    setDocError('');
    setErrors(e => ({ ...e, submit: '' }));
    try {
      // Si el contrato ya fue creado en un intento anterior, no se duplica.
      let contrato = createdRef.current;
      if (!contrato) {
        const payload = {
          cliente_id: clienteSelected.id,
          software_id: form.software_id,
          sla_id: form.sla_id,
          tipo_contrato: form.tipo_contrato,
          monto: esProBono ? '0' : form.monto,
          fecha_inicio: form.fecha_inicio,
          fecha_vencimiento: (form.sin_vencimiento || !form.fecha_vencimiento) ? null : form.fecha_vencimiento,
          dias_gracia_autorizados: parseInt(form.dias_gracia_autorizados, 10) || 0,
        };
        if (esRecurrente) payload.frecuencia_facturacion = form.frecuencia_facturacion;
        if (textoClausulas) payload.texto_adicional_clausulas = textoClausulas;
        contrato = await createContrato(payload);
        createdRef.current = contrato;
      }

      if (form.plantilla_id) {
        try {
          await generarDocumento(contrato);
        } catch (genErr) {
          setDocError(genErr.message || 'Error desconocido al generar el documento.');
          return;
        }
      }

      onSuccess?.(contrato);
      onClose();
    } catch (err) {
      // Errores de validación por campo del backend → se muestran en su campo
      // y se vuelve al paso correspondiente.
      if (err.fields) {
        const mapped = {};
        let firstStep = null;
        for (const f of BACKEND_FIELDS) {
          if (err.fields[f]) {
            mapped[f] = err.fields[f];
            const st = FIELD_STEP[f];
            if (st && (firstStep === null || st < firstStep)) firstStep = st;
          }
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(e => ({ ...e, ...mapped }));
          if (firstStep) setStep(firstStep);
          return;
        }
      }
      setErrors(e => ({ ...e, submit: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const retryGeneracion = async () => {
    if (!createdRef.current) return;
    setLoading(true);
    setDocError('');
    try {
      await generarDocumento(createdRef.current);
      onSuccess?.(createdRef.current);
      onClose();
    } catch (err) {
      setDocError(err.message || 'Error desconocido al generar el documento.');
    } finally {
      setLoading(false);
    }
  };

  const continuarSinDocumento = () => {
    if (!createdRef.current) return;
    onSuccess?.(createdRef.current);
    onClose();
  };

  // ── Derived labels for summary ────────────────────────────────────────────
  const swNombre = softwareList.find(s => String(s.id) === String(form.software_id))?.nombre || '';
  const plantillaNombre = plantillas.find(p => String(p.id) === String(form.plantilla_id))?.nombre || '';
  const slaNombre = slaList.find(s => String(s.id) === String(form.sla_id))?.nombre || '';
  const tipoLabel = TIPO_CONTRATO_OPTIONS.find(t => t.value === form.tipo_contrato)?.label || '';
  const frecLabel = FRECUENCIA_OPTIONS.find(f => f.value === form.frecuencia_facturacion)?.label || '';
  const clienteNombre = clienteSelected?.nombre_comercial || clienteSelected?.razon_social || '';

  return (
    <>
      <div className="ctm-backdrop" onClick={attemptClose} />

      <div className="ctm-panel" role="dialog" aria-modal="true" aria-label="Nuevo contrato">
        {/* Header */}
        <div className="ctm-header">
          <div>
            <h2 className="ctm-title">Nuevo Contrato</h2>
            <p className="ctm-subtitle">
              Se crea en etapa <strong>Borrador</strong> · {STEPS[step - 1].label}
            </p>
          </div>
          <button className="ctm-close" onClick={attemptClose} title="Cerrar" aria-label="Cerrar">
            <Svg d={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" size={13} />
          </button>
        </div>

        <StepBar current={step} />

        {/* Body */}
        <div className="ctm-body">

          {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              {/* Cliente */}
              <div className="ctm-field ctm-rel" ref={clienteBoxRef}>
                <FL req>Cliente</FL>
                <div className="ctm-rel">
                  <input
                    type="text"
                    autoFocus
                    role="combobox"
                    aria-expanded={clienteOpen}
                    aria-autocomplete="list"
                    value={clienteQuery}
                    onChange={e => {
                      setClienteQuery(e.target.value);
                      setClienteSelected(null);
                      setClienteOpen(true);
                      if (errors.cliente_id) setErrors(er => ({ ...er, cliente_id: '' }));
                    }}
                    onFocus={() => setClienteOpen(true)}
                    onKeyDown={onClienteKeyDown}
                    placeholder="Buscar por nombre, razón social o email…"
                    className={`ctm-control${errors.cliente_id ? ' error' : ''}`}
                  />
                  {clienteSelected && (
                    <button type="button" className="ctm-clear" title="Quitar cliente" aria-label="Quitar cliente"
                      onClick={() => { setClienteSelected(null); setClienteQuery(''); setClienteResults([]); }}>
                      <Svg d={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" size={12} />
                    </button>
                  )}
                </div>
                {clienteOpen && !clienteSelected && clienteQuery.trim().length >= 2 && (
                  <div className="ctm-dropdown" role="listbox">
                    {clienteLoading && <div className="ctm-dropdown-note">Buscando…</div>}
                    {!clienteLoading && clienteResults.length === 0 && <div className="ctm-dropdown-note">Sin resultados</div>}
                    {!clienteLoading && clienteResults.map((c, idx) => (
                      <div key={c.id}
                        className={`ctm-dropdown-item${idx === clienteActiveIdx ? ' active' : ''}`}
                        role="option"
                        aria-selected={idx === clienteActiveIdx}
                        title={c.nombre_comercial || c.razon_social}
                        onMouseEnter={() => setClienteActiveIdx(idx)}
                        onClick={() => pickCliente(c)}>
                        <div className="ctm-dropdown-item-name">{c.nombre_comercial || c.razon_social}</div>
                        <div className="ctm-dropdown-item-meta">{c.email} · {c.id_fiscal}</div>
                      </div>
                    ))}
                  </div>
                )}
                <FieldError>{errors.cliente_id}</FieldError>
              </div>

              <div className="ctm-grid-2">
                {/* Tipo de contrato — antes que la plantilla, porque la filtra */}
                <SF
                  label="Tipo de Contrato"
                  req name="tipo_contrato"
                  value={form.tipo_contrato}
                  onChange={handleTipoChange}
                  error={errors.tipo_contrato}
                  options={TIPO_CONTRATO_OPTIONS}
                />

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
              </div>

              {/* Plantilla — filtrada por software + tipo de contrato */}
              <div className="ctm-field">
                <FL req={plantillas.length > 0}>Plantilla de Contrato</FL>
                {!form.software_id ? (
                  <div className="ctm-note ctm-note-empty">
                    <Svg d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" color="var(--border)" size={14} />
                    Selecciona un software para ver las plantillas disponibles
                  </div>
                ) : loadingPlantillas ? (
                  <div className="ctm-note ctm-note-loading">
                    Cargando plantillas…
                  </div>
                ) : plantillas.length === 0 ? (
                  <div className="ctm-note ctm-note-warn">
                    <Svg d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--warning-bright)" size={14} />
                    No hay plantillas activas para este software y tipo de contrato.
                    Puedes crear el contrato igualmente y generar el documento después.
                  </div>
                ) : (
                  <>
                    <select name="plantilla_id" value={form.plantilla_id} onChange={handleChange}
                      className={`ctm-control${errors.plantilla_id ? ' error' : ''}`}>
                      <option value="">Seleccionar plantilla…</option>
                      {plantillas.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} · {p.version_codigo}{!p.software_id ? ' (global)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="ctm-hint">El documento se genera automáticamente al crear el contrato.</p>
                  </>
                )}
                <FieldError>{errors.plantilla_id}</FieldError>
              </div>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <SF label="SLA (Nivel de Servicio)" req name="sla_id"
                value={form.sla_id} onChange={handleChange}
                error={errors.sla_id}
                placeholder="Selecciona el SLA"
                options={slaList.map(s => ({ value: s.id, label: s.nombre }))}
              />

              {/* Billing section */}
              <div className="ctm-section">
                <p className="ctm-section-title">Facturación · {tipoLabel}</p>
                {esRecurrente ? (
                  <div className="ctm-grid-2">
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
                ) : esProBono ? (
                  <TF label="Monto" name="monto" type="number"
                    value="0" onChange={handleChange} disabled
                    hint="Los contratos Pro Bono no facturan monto."
                  />
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
              <div className="ctm-grid-2">
                <TF label="Fecha de Inicio" req name="fecha_inicio" type="date"
                  value={form.fecha_inicio} onChange={handleChange} error={errors.fecha_inicio}
                />
                <div className="ctm-field">
                  <FL>Fecha de Vencimiento</FL>
                  <input type="date" name="fecha_vencimiento"
                    value={form.fecha_vencimiento}
                    onChange={handleChange}
                    min={form.fecha_inicio || undefined}
                    disabled={form.sin_vencimiento}
                    className={`ctm-control${errors.fecha_vencimiento ? ' error' : ''}`}
                  />
                  <label className="ctm-check">
                    <input type="checkbox" name="sin_vencimiento" checked={form.sin_vencimiento}
                      onChange={handleChange} />
                    <span>Sin fecha de vencimiento (perpetuo)</span>
                  </label>
                  <FieldError>{errors.fecha_vencimiento}</FieldError>
                </div>
              </div>

              <TF label="Días de Gracia Autorizados" name="dias_gracia_autorizados"
                type="number" min="0" value={form.dias_gracia_autorizados}
                onChange={handleChange} error={errors.dias_gracia_autorizados}
                placeholder="0"
              />

              {textoClausulas !== '' && (
                <div className="ctm-section">
                  <p className="ctm-section-title">Texto del Documento (Editable)</p>
                  <textarea
                    value={textoClausulas}
                    onChange={(e) => setTextoClausulas(e.target.value)}
                    style={{ width: '100%', minHeight: 250, padding: '10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="ctm-section">
                <p className="ctm-section-title">Resumen del Contrato</p>
                <SRow label="Cliente" value={clienteNombre} />
                <SRow label="Software" value={swNombre} accent />
                <SRow label="Plantilla" value={form.plantilla_id ? plantillaNombre : 'Sin documento (se genera después)'} />
                <SRow label="SLA" value={slaNombre} />
                <SRow label="Tipo" value={tipoLabel} />
                {esRecurrente && <SRow label="Facturación" value={frecLabel} />}
                <SRow label={esRecurrente ? `Monto / ciclo` : 'Monto'}
                  value={esProBono ? 'Pro Bono ($0)' : (form.monto ? `$${Number(form.monto).toLocaleString('es-CL')} USD` : '')} accent />
                <SRow label="Inicio" value={form.fecha_inicio} />
                <SRow label="Vencimiento" value={form.sin_vencimiento ? 'Sin vencimiento' : (form.fecha_vencimiento || '—')} />
                {parseInt(form.dias_gracia_autorizados, 10) > 0 && (
                  <SRow label="Días de gracia" value={`${form.dias_gracia_autorizados} días`} />
                )}
              </div>

              {errors.submit && (
                <div className="ct-alert-error ctm-alert" role="alert">
                  <Svg d={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={14} />
                  {errors.submit}
                </div>
              )}

              {docError && createdRef.current && (
                <div className="ctm-note ctm-note-warn ctm-alert" role="alert">
                  <Svg d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--warning-bright)" size={14} />
                  <span>
                    El contrato <strong>{contratoIdDisplay(createdRef.current.id)}</strong> fue creado,
                    pero falló la generación del documento: {docError}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ctm-footer">
          {docError && createdRef.current ? (
            <>
              <button className="ct-btn-secondary" onClick={continuarSinDocumento} disabled={loading}>
                Continuar sin documento
              </button>
              <button className="ct-btn-primary" onClick={retryGeneracion} disabled={loading}>
                {loading ? 'Generando…' : 'Reintentar generación'}
              </button>
            </>
          ) : (
            <>
              <button className="ct-btn-secondary" onClick={attemptClose} disabled={loading}>Cancelar</button>

              {step > 1 && (
                <button className="ct-btn-secondary" onClick={prevStep} disabled={loading}>
                  <Svg d="M15 18l-6-6 6-6" size={13} color="var(--text-secondary)" />
                  Anterior
                </button>
              )}

              {step < 3 ? (
                <button className="ct-btn-primary" onClick={nextStep}>
                  Siguiente
                  <Svg d="M9 18l6-6-6-6" size={13} color="var(--text-on-accent)" />
                </button>
              ) : (
                <button className="ct-btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creando…' : (
                    <>
                      <Svg d="M20 6 9 17l-5-5" size={13} color="var(--text-on-accent)" sw={2.5} />
                      Crear Contrato
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
