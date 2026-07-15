import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createRequerimiento, getPlantillaRequerimientoActiva, generarRequerimientoDocumento,
} from '../../api';
import '../Contratos.css';

const CATEGORIA_OPTIONS = [
  { value: 'Bot', label: 'Bot' },
  { value: 'Agente', label: 'Agente' },
  { value: 'Script', label: 'Script' },
  { value: 'Software', label: 'Software' },
  { value: 'Auditoría', label: 'Auditoría' },
  { value: 'Consultoría', label: 'Consultoría' },
];

const STEPS = [
  { num: 1, label: 'Cliente y alcance' },
  { num: 2, label: 'Preguntas' },
  { num: 3, label: 'Revisión y generación' },
];

function Svg({ d, size = 14, color = 'var(--text-muted)', sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

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
                  : <span className="ctm-step-num">{s.num}</span>}
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

function Pregunta({ pregunta, value, onChange, error }) {
  const common = { className: `ctm-control${error ? ' error' : ''}` };
  return (
    <div className="ctm-field">
      <label className="ctm-label">
        {pregunta.texto} {pregunta.requerida && <span className="ctm-req">*</span>}
      </label>
      {pregunta.tipo === 'parrafo' && (
        <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
      {pregunta.tipo === 'numero' && (
        <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
      {pregunta.tipo === 'fecha' && (
        <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
      {pregunta.tipo === 'booleano' && (
        <label className="ctm-check">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>Sí</span>
        </label>
      )}
      {pregunta.tipo === 'seleccion' && (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...common}>
          <option value="">Seleccionar…</option>
          {(pregunta.opciones || []).map((op) => <option key={op} value={op}>{op}</option>)}
        </select>
      )}
      {(!pregunta.tipo || pregunta.tipo === 'texto') && (
        <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
      {error && <p className="ctm-field-error">{error}</p>}
    </div>
  );
}

export default function NewRequerimientoModal({ clienteId, contratos, onClose, onSuccess }) {
  const [step, setStep] = useState(1);

  const [contratoId, setContratoId] = useState('');
  const [sinContrato, setSinContrato] = useState((contratos || []).length === 0);
  const [categoriaManual, setCategoriaManual] = useState('');

  const contratoSeleccionado = (contratos || []).find((c) => String(c.id) === String(contratoId));
  const categoria = sinContrato ? categoriaManual : (contratoSeleccionado?.categoria_producto || '');

  const [plantilla, setPlantilla] = useState(null);
  const [loadingPlantilla, setLoadingPlantilla] = useState(false);
  const [plantillaError, setPlantillaError] = useState('');

  const [respuestas, setRespuestas] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [step1Error, setStep1Error] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [documento, setDocumento] = useState(null);
  const createdRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const cargarPlantilla = useCallback(() => {
    if (!categoria) return;
    setLoadingPlantilla(true);
    setPlantillaError('');
    getPlantillaRequerimientoActiva(categoria)
      .then((p) => { setPlantilla(p); setRespuestas({}); })
      .catch((err) => {
        setPlantilla(null);
        setPlantillaError(err.message || 'No se pudo cargar la plantilla de preguntas.');
      })
      .finally(() => setLoadingPlantilla(false));
  }, [categoria]);

  const nextFromStep1 = () => {
    setStep1Error('');
    if (!sinContrato && !contratoId) {
      setStep1Error('Selecciona un contrato o marca "Sin contrato asociado".');
      return;
    }
    if (sinContrato && !categoriaManual) {
      setStep1Error('Selecciona la categoría de software.');
      return;
    }
    cargarPlantilla();
    setStep(2);
  };

  const setRespuesta = (id, value) => {
    setRespuestas((r) => ({ ...r, [id]: value }));
    if (fieldErrors[id]) setFieldErrors((e) => ({ ...e, [id]: '' }));
  };

  const validarRespuestas = () => {
    const errs = {};
    for (const seccion of plantilla?.secciones || []) {
      for (const p of seccion.preguntas || []) {
        if (p.requerida && (respuestas[p.id] === undefined || respuestas[p.id] === '')) {
          errs[p.id] = 'Este campo es requerido.';
        }
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextFromStep2 = () => {
    if (!validarRespuestas()) return;
    setStep(3);
  };

  const handleGenerar = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      let requerimiento = createdRef.current;
      if (!requerimiento) {
        requerimiento = await createRequerimiento({
          cliente_id: Number(clienteId),
          contrato_id: sinContrato ? undefined : Number(contratoId),
          categoria_producto: sinContrato ? categoriaManual : undefined,
          respuestas,
        });
        createdRef.current = requerimiento;
      }
      const doc = await generarRequerimientoDocumento(requerimiento.id);
      setDocumento(doc);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err.message || 'No se pudo generar el documento.');
    } finally {
      setSubmitting(false);
    }
  };

  const attemptClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <>
      <div className="ctm-backdrop" onClick={attemptClose} />
      <div className="ctm-panel" role="dialog" aria-modal="true" aria-label="Nueva toma de requerimientos">
        <div className="ctm-header">
          <div>
            <h2 className="ctm-title">Nueva Toma de Requerimientos</h2>
            <p className="ctm-subtitle">{STEPS[step - 1].label}</p>
          </div>
          <button className="ctm-close" onClick={attemptClose} title="Cerrar" aria-label="Cerrar">
            <Svg d={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" size={13} />
          </button>
        </div>

        <StepBar current={step} />

        <div className="ctm-body">
          {step === 1 && (
            <div>
              <div className="ctm-field">
                <label className="ctm-check">
                  <input
                    type="checkbox"
                    checked={sinContrato}
                    onChange={(e) => { setSinContrato(e.target.checked); setContratoId(''); setStep1Error(''); }}
                  />
                  <span>Sin contrato asociado (elegir categoría manualmente)</span>
                </label>
              </div>

              {!sinContrato ? (
                <div className="ctm-field">
                  <label className="ctm-label">Contrato <span className="ctm-req">*</span></label>
                  <select
                    className={`ctm-control${step1Error ? ' error' : ''}`}
                    value={contratoId}
                    onChange={(e) => { setContratoId(e.target.value); setStep1Error(''); }}
                  >
                    <option value="">Seleccionar contrato…</option>
                    {(contratos || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        CTR-{String(c.id).padStart(6, '0')} · {c.software} ({c.categoria_producto})
                      </option>
                    ))}
                  </select>
                  {(contratos || []).length === 0 && (
                    <p className="ctm-hint">Este cliente no tiene contratos. Marca "Sin contrato asociado".</p>
                  )}
                </div>
              ) : (
                <div className="ctm-field">
                  <label className="ctm-label">Categoría de software <span className="ctm-req">*</span></label>
                  <select
                    className={`ctm-control${step1Error ? ' error' : ''}`}
                    value={categoriaManual}
                    onChange={(e) => { setCategoriaManual(e.target.value); setStep1Error(''); }}
                  >
                    <option value="">Seleccionar categoría…</option>
                    {CATEGORIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {step1Error && <p className="ctm-field-error">{step1Error}</p>}
            </div>
          )}

          {step === 2 && (
            <div>
              {loadingPlantilla && <div className="ctm-note ctm-note-loading">Cargando preguntas…</div>}
              {!loadingPlantilla && plantillaError && (
                <div className="ctm-note ctm-note-warn">
                  <Svg d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--warning-bright)" size={14} />
                  {plantillaError}
                </div>
              )}
              {!loadingPlantilla && plantilla && (plantilla.secciones || []).map((seccion, i) => (
                <div className="ctm-section" key={i}>
                  <p className="ctm-section-title">{seccion.titulo}</p>
                  {(seccion.preguntas || []).map((p) => (
                    <Pregunta
                      key={p.id}
                      pregunta={p}
                      value={respuestas[p.id]}
                      onChange={(v) => setRespuesta(p.id, v)}
                      error={fieldErrors[p.id]}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              {!documento ? (
                <>
                  <div className="ctm-section">
                    <p className="ctm-section-title">Resumen de respuestas</p>
                    {(plantilla?.secciones || []).map((seccion, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <p className="ctm-srow-label" style={{ marginBottom: 4 }}>{seccion.titulo}</p>
                        {(seccion.preguntas || []).map((p) => (
                          <div className="ctm-srow" key={p.id}>
                            <span className="ctm-srow-label">{p.texto}</span>
                            <span className="ctm-srow-value">
                              {p.tipo === 'booleano'
                                ? (respuestas[p.id] ? 'Sí' : 'No')
                                : (respuestas[p.id] || '—')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {submitError && (
                    <div className="ct-alert-error ctm-alert" role="alert">
                      <Svg d={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={14} />
                      {submitError}
                    </div>
                  )}
                </>
              ) : (
                <div className="ctm-note" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p>Documento generado correctamente.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a className="ct-btn-secondary" href={`/api/requerimientos/documentos/${documento.id}/docx/`}>
                      Descargar Word
                    </a>
                    <a className="ct-btn-secondary" href={`/api/requerimientos/documentos/${documento.id}/pdf/`}>
                      Descargar PDF
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ctm-footer">
          {documento ? (
            <button className="ct-btn-primary" onClick={onClose}>Cerrar</button>
          ) : (
            <>
              <button className="ct-btn-secondary" onClick={attemptClose} disabled={submitting}>Cancelar</button>
              {step > 1 && (
                <button className="ct-btn-secondary" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                  <Svg d="M15 18l-6-6 6-6" size={13} color="var(--text-secondary)" />
                  Anterior
                </button>
              )}
              {step === 1 && (
                <button className="ct-btn-primary" onClick={nextFromStep1}>
                  Siguiente
                  <Svg d="M9 18l6-6-6-6" size={13} color="var(--text-on-accent)" />
                </button>
              )}
              {step === 2 && (
                <button className="ct-btn-primary" onClick={nextFromStep2} disabled={loadingPlantilla || !plantilla}>
                  Siguiente
                  <Svg d="M9 18l6-6-6-6" size={13} color="var(--text-on-accent)" />
                </button>
              )}
              {step === 3 && (
                <button className="ct-btn-primary" onClick={handleGenerar} disabled={submitting}>
                  {submitting ? 'Generando…' : (
                    <>
                      <Svg d="M20 6 9 17l-5-5" size={13} color="var(--text-on-accent)" sw={2.5} />
                      Generar documento
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
