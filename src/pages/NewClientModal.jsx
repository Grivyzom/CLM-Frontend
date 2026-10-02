import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from 'lenis/react';
import { createCliente } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { validarRut, validarMaximoRut, validarEmailDominioLimpio } from '../utils/validators';
import InfoTooltip from '../components/ui/InfoTooltip';
import './NewClientModal.css';

function Svg({ paths = [], circles = [], size = 14, color = 'currentColor', strokeWidth = 1.8, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
      {circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
    </svg>
  );
}

const ICON = {
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8z'],
  building: ['M3 21h18', 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16', 'M9 7h6', 'M9 11h6', 'M9 15h6'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  mail: ['M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z'],
  check: ['M20 6 9 17l-5-5'],
  plan: ['M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  chevron: ['M6 9l6 6 6-6'],
  alert: ['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'],
};

const CATEGORIA_OPTIONS = [
  { value: 'SIN_MEMBRESIA', label: 'Sin membresía' },
  { value: 'COBRE', label: 'Cobre' },
  { value: 'PLATA', label: 'Plata' },
  { value: 'PLATINO', label: 'Platino' },
  { value: 'DIAMANTE', label: 'Diamante' },
  { value: 'OBSIDIANA', label: 'Obsidiana' },
];

const ESTADO_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'GRACIA', label: 'Periodo de gracia' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
];

const REP_FIELDS = ['contacto_nombre', 'contacto_cargo', 'contacto_email', 'contacto_telefono'];

const INITIAL_FORM = {
  run: '', nombre_completo: '',
  rut: '', razon_social: '', giro: '',
  email_principal: '', telefono_contacto: '',
  categoria: 'SIN_MEMBRESIA', estado: 'ACTIVO',
  contacto_nombre: '', contacto_cargo: '', contacto_email: '', contacto_telefono: '',
};

// Errores tipográficos frecuentes en dominios de correo.
const DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cl': 'gmail.com', 'gmail.con': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'yaho.com': 'yahoo.com',
};

/* ── Formateo mientras se escribe ─────────────────────────────── */

// "123456789" → "12.345.678-9". El DV (último carácter) puede ser K.
function formatRut(raw) {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!clean) return '';
  const body = clean.slice(0, -1).replace(/K/g, '').slice(0, 8);
  const dv = clean.slice(-1);
  if (!body) return dv === 'K' ? '' : dv;
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

// Normaliza a "12345678-9" (formato mayoritario en BD).
const normalizeRut = (v) => v.replace(/\./g, '').trim();

// Guarda solo los 9 dígitos locales; tolera pegar "+56 9 ...".
function phoneDigits(raw) {
  let d = raw.replace(/\D/g, '');
  if (d.length > 9 && d.startsWith('56')) d = d.slice(2);
  return d.slice(0, 9);
}

// "912345678" → "9 1234 5678"
function formatPhone(raw) {
  const d = phoneDigits(raw);
  return [d.slice(0, 1), d.slice(1, 5), d.slice(5)].filter(Boolean).join(' ');
}

const phoneForApi = (v) => {
  const d = phoneDigits(v);
  return d ? `+56${d}` : '';
};

/* ── Validación por campo ─────────────────────────────────────── */

function validateField(name, value, tipo) {
  const v = (value || '').trim();
  switch (name) {
    case 'run':
    case 'rut': {
      const label = name === 'run' ? 'RUN' : 'RUT';
      if (!v) return `${label} requerido`;
      if (!validarMaximoRut(v)) return `${label} supera el máximo (99.999.999)`;
      if (!validarRut(v)) return `${label} inválido: revisa el dígito verificador`;
      return '';
    }
    case 'nombre_completo':
      return tipo === 'natural' && !v ? 'Nombre requerido' : '';
    case 'razon_social':
      return tipo === 'juridica' && !v ? 'Razón social requerida' : '';
    case 'giro':
      return tipo === 'juridica' && !v ? 'Giro requerido' : '';
    case 'email_principal':
      if (!v) return 'Email requerido';
      return validarEmailDominioLimpio(v).valido ? '' : (validarEmailDominioLimpio(v).razon || 'Email inválido');
    case 'contacto_email':
      if (!v) return '';
      return validarEmailDominioLimpio(v).valido ? '' : (validarEmailDominioLimpio(v).razon || 'Email inválido');
    case 'telefono_contacto':
    case 'contacto_telefono': {
      const d = phoneDigits(v);
      if (!d) return '';
      return d.length === 9 ? '' : 'Debe tener 9 dígitos (ej: 9 1234 5678)';
    }
    default:
      return '';
  }
}

function fieldsFor(tipo) {
  const base = tipo === 'natural'
    ? ['run', 'nombre_completo']
    : ['rut', 'razon_social', 'giro'];
  return [...base, 'email_principal', 'telefono_contacto', ...(tipo === 'juridica' ? REP_FIELDS : [])];
}

function emailSuggestion(value) {
  const [user, domain] = value.trim().toLowerCase().split('@');
  if (!user || !domain) return null;
  const fix = DOMAIN_TYPOS[domain];
  return fix ? `${user}@${fix}` : null;
}

/* ── Subcomponentes ───────────────────────────────────────────── */

function Field({
  label, name, value, error, hint, required, optional, glossaryKey, prefix, valid,
  onChange, onBlur, className, inputRef, ...rest
}) {
  const id = `ncm-${name}`;
  const msgId = `${id}-msg`;
  return (
    <div className={`ncm-field ${className || ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="ncm-req" aria-hidden="true">*</span>}
        {optional && <span className="ncm-opt">(opcional)</span>}
        {glossaryKey && <InfoTooltip glossaryKey={glossaryKey} position="top" />}
      </label>
      <div className={`ncm-control${error ? ' is-error' : ''}`}>
        {prefix && <span className="ncm-prefix">{prefix}</span>}
        <input
          id={id}
          name={name}
          ref={inputRef}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error || hint ? msgId : undefined}
          {...rest}
        />
        {valid && !error && (
          <span className="ncm-status" title="Válido">
            <Svg paths={ICON.check} color="var(--success)" size={14} strokeWidth={2.4} />
          </span>
        )}
      </div>
      {error
        ? <p id={msgId} className="ncm-msg is-error" role="alert">{error}</p>
        : hint ? <p id={msgId} className="ncm-msg is-hint">{hint}</p> : null}
    </div>
  );
}

function Pills({ label, name, value, options, onChange }) {
  const onKeyDown = (e) => {
    const idx = options.findIndex(o => o.value === value);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length;
    if (next === null) return;
    e.preventDefault();
    onChange(name, options[next].value);
    e.currentTarget.querySelectorAll('button')[next]?.focus();
  };
  return (
    <div className="ncm-field ncm-full">
      <span className="ncm-label" id={`ncm-${name}-label`}>{label}</span>
      <div className="ncm-pills" role="radiogroup" aria-labelledby={`ncm-${name}-label`} onKeyDown={onKeyDown}>
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <button key={opt.value} type="button" role="radio" aria-checked={active}
              tabIndex={active ? 0 : -1} onClick={() => onChange(name, opt.value)}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────────── */

export default function NewClientModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  // Staff de plataforma (sin tenant propio): cada cliente que da de alta es
  // cliente directo de la plataforma → el backend crea su tenant. Nunca se
  // pide elegir un tenant. Usuario de empresa: el cliente va a su tenant.
  const createsTenant = !!user && !user.tenant;
  const [tipo, setTipo] = useState('natural');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const formRef = useRef(null);
  const firstFieldRef = useRef(null);
  const lenis = useLenis();


  // Lenis intercepta la rueda del mouse a nivel global: se detiene mientras
  // el modal está abierto (además de data-lenis-prevent en el contenedor).
  useEffect(() => {
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
    };
  }, [lenis]);

  // Foco al primer campo al abrir y al cambiar de tipo.
  useEffect(() => {
    const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [tipo]);

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && !loading) {
      e.stopPropagation();
      onClose();
    }
  }, [onClose, loading]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const setValue = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'run' || name === 'rut') next = formatRut(value);
    else if (name === 'telefono_contacto' || name === 'contacto_telefono') next = formatPhone(value);
    setValue(name, next);
    // Si el campo ya mostraba error, revalidar en vivo para que desaparezca al corregirlo.
    if (errors[name]) setErrors(er => ({ ...er, [name]: validateField(name, next, tipo) }));
    if (submitError) setSubmitError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    let value = form[name];
    if (name === 'email_principal' || name === 'contacto_email') {
      value = value.trim().toLowerCase();
      if (value !== form[name]) setValue(name, value);
    }
    // No marcar como error un campo requerido que el usuario aún no ha tocado.
    if (!value.trim()) return;
    setErrors(er => ({ ...er, [name]: validateField(name, value, tipo) }));
  };

  const switchTipo = (next) => {
    if (next === tipo) return;
    setTipo(next);
    setErrors({});
    setSubmitError('');
  };

  const validateAll = () => {
    const next = {};
    for (const name of fieldsFor(tipo)) {
      const err = validateField(name, form[name], tipo);
      if (err) next[name] = err;
    }
    setErrors(next);
    return next;
  };

  const focusField = (name) => {
    const el = formRef.current?.querySelector(`[name="${name}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;
    const found = validateAll();
    const firstError = fieldsFor(tipo).find(n => found[n]);
    if (firstError) {
      if (REP_FIELDS.includes(firstError) && !repOpen) {
        setRepOpen(true);
        setTimeout(() => focusField(firstError), 30);
      } else {
        focusField(firstError);
      }
      return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      const payload = {
        tipo,
        email_principal: form.email_principal.trim().toLowerCase(),
        telefono_contacto: phoneForApi(form.telefono_contacto),
      };
      if (createsTenant) {
        payload.categoria = form.categoria;
        payload.estado = form.estado;
      }
      if (tipo === 'natural') {
        payload.run = normalizeRut(form.run);
        payload.nombre_completo = form.nombre_completo.trim();
      } else {
        payload.rut = normalizeRut(form.rut);
        payload.razon_social = form.razon_social.trim();
        payload.giro = form.giro.trim();
        if (form.contacto_nombre.trim() || form.contacto_email.trim()) {
          payload.contacto_representante = {
            nombre: form.contacto_nombre.trim(),
            cargo: form.contacto_cargo.trim(),
            email: form.contacto_email.trim().toLowerCase(),
            telefono: phoneForApi(form.contacto_telefono),
          };
        }
      }
      const created = await createCliente(payload);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'No se pudo crear el cliente');
      formRef.current?.closest('.ncm-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Enter avanza al siguiente campo; en el último (o con Ctrl/Cmd) envía.
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target;
    if (el.tagName === 'BUTTON') return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { handleSubmit(); return; }
    const inputs = Array.from(formRef.current.querySelectorAll('input:not([disabled])'))
      .filter(i => i.offsetParent !== null);
    const idx = inputs.indexOf(el);
    if (idx > -1 && idx < inputs.length - 1) inputs[idx + 1].focus();
    else handleSubmit();
  };

  const isValidRut = (v) => !!v && validarMaximoRut(v) && validarRut(v);
  const suggestion = emailSuggestion(form.email_principal);
  const repFilled = REP_FIELDS.some(n => form[n].trim());

  const field = (name, props) => (
    <Field
      name={name}
      value={form[name]}
      error={errors[name]}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );

  const modal = (
    <div className="ncm-backdrop ncm-root" data-lenis-prevent onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="ncm-dialog" role="dialog" aria-modal="true" aria-labelledby="ncm-title">
        <header className="ncm-header">
          <div className="ncm-header-top">
            <div>
              <h2 id="ncm-title" className="ncm-title">Nuevo cliente</h2>
              <p className="ncm-subtitle">Solo los campos con * son obligatorios.</p>
            </div>
            <button type="button" className="ncm-close" onClick={onClose} aria-label="Cerrar">
              <Svg paths={ICON.close} size={13} />
            </button>
          </div>

          <div className="ncm-segment" role="radiogroup" aria-label="Tipo de cliente">
            {[
              { value: 'natural', label: 'Persona natural', icon: ICON.user },
              { value: 'juridica', label: 'Empresa', icon: ICON.building },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={tipo === opt.value}
                onClick={() => switchTipo(opt.value)}
              >
                <Svg paths={opt.icon} size={15} />
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        <div className="ncm-body" data-lenis-prevent>
          {submitError && (
            <div className="ncm-banner" role="alert">
              <Svg paths={ICON.alert} size={14} />
              <span>{submitError}</span>
            </div>
          )}

          <form id="new-client-form" ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
            <section className="ncm-section">
              <h3 className="ncm-section-title"><Svg paths={ICON.shield} size={12} />Identificación</h3>
              <div className="ncm-grid">
                {tipo === 'natural' ? (
                  <>
                    {field('run', {
                      label: 'RUN', required: true, glossaryKey: 'run', inputRef: firstFieldRef,
                      placeholder: '12.345.678-9', inputMode: 'text', autoComplete: 'off', maxLength: 12,
                      valid: isValidRut(form.run),
                    })}
                    {field('nombre_completo', {
                      label: 'Nombre completo', required: true, placeholder: 'Juan Pérez Soto',
                      autoComplete: 'name', autoCapitalize: 'words',
                    })}
                  </>
                ) : (
                  <>
                    {field('rut', {
                      label: 'RUT empresa', required: true, glossaryKey: 'rut_empresa', inputRef: firstFieldRef,
                      placeholder: '76.123.456-7', autoComplete: 'off', maxLength: 12,
                      valid: isValidRut(form.rut),
                    })}
                    {field('razon_social', {
                      label: 'Razón social', required: true, placeholder: 'Acme SpA', autoComplete: 'organization',
                    })}
                    {field('giro', {
                      label: 'Giro', required: true, glossaryKey: 'giro', className: 'ncm-full',
                      placeholder: 'Servicios de consultoría',
                    })}
                  </>
                )}
              </div>
            </section>

            <section className="ncm-section">
              <h3 className="ncm-section-title"><Svg paths={ICON.mail} size={12} />Contacto</h3>
              <div className="ncm-grid">
                {field('email_principal', {
                  label: 'Email', required: true, type: 'email', inputMode: 'email',
                  placeholder: 'contacto@empresa.cl', autoComplete: 'email', spellCheck: false,
                  hint: suggestion && !errors.email_principal ? (
                    <>¿Quisiste decir{' '}
                      <button type="button" className="ncm-link" onClick={() => setValue('email_principal', suggestion)}>
                        {suggestion}
                      </button>?
                    </>
                  ) : null,
                })}
                {field('telefono_contacto', {
                  label: 'Teléfono', optional: true, type: 'tel', inputMode: 'numeric', prefix: '+56',
                  placeholder: '9 1234 5678', autoComplete: 'tel-national',
                })}
              </div>
              <p className="ncm-msg is-hint ncm-lead" style={{ marginTop: '8px' }}>
                Al registrarse, se enviará automáticamente una invitación a este correo con el enlace de activación para que el cliente configure su contraseña y acceda al portal.
              </p>
            </section>

            {createsTenant && (
              <section className="ncm-section">
                <h3 className="ncm-section-title"><Svg paths={ICON.plan} size={12} />Nueva empresa (tenant)</h3>
                <p className="ncm-msg is-hint ncm-lead">
                  Se creará el tenant <strong>{(tipo === 'natural' ? form.nombre_completo : form.razon_social).trim() || '—'}</strong> con este cliente dentro.
                </p>
                <div className="ncm-grid">
                  <Pills label="Plan" name="categoria" value={form.categoria} options={CATEGORIA_OPTIONS} onChange={setValue} />
                  <Pills label="Estado" name="estado" value={form.estado} options={ESTADO_OPTIONS} onChange={setValue} />
                </div>
              </section>
            )}

            {tipo === 'juridica' && (
                <section className="ncm-section ncm-collapse">
                  <button
                    type="button"
                    className="ncm-collapse-toggle"
                    aria-expanded={repOpen}
                    aria-controls="ncm-rep-body"
                    onClick={() => setRepOpen(o => !o)}
                  >
                    <span>
                      Representante legal
                      <span className="ncm-opt">{repFilled && !repOpen ? '· con datos' : '(opcional)'}</span>
                    </span>
                    <Svg paths={ICON.chevron} size={14} className="ncm-chevron" />
                  </button>
                  {repOpen && (
                    <div id="ncm-rep-body" className="ncm-collapse-body">
                      <div className="ncm-grid">
                        {field('contacto_nombre', { label: 'Nombre', placeholder: 'Carlos López', autoCapitalize: 'words', glossaryKey: 'representante_legal' })}
                        {field('contacto_cargo', { label: 'Cargo', placeholder: 'Gerente general' })}
                        {field('contacto_email', { label: 'Email', type: 'email', inputMode: 'email', placeholder: 'carlos@empresa.cl', spellCheck: false })}
                        {field('contacto_telefono', { label: 'Teléfono', type: 'tel', inputMode: 'numeric', prefix: '+56', placeholder: '9 1234 5678' })}
                      </div>
                    </div>
                  )}
                </section>
            )}
          </form>
        </div>

        <footer className="ncm-footer">
          <span className="ncm-footer-hint"><kbd>Enter</kbd> siguiente campo · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> crear</span>
          <button type="button" className="ncm-btn ncm-btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" form="new-client-form" className="ncm-btn ncm-btn-primary" disabled={loading}>
            {loading ? 'Creando…' : 'Crear cliente'}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
