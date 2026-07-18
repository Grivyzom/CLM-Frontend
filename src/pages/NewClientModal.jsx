import React, { useState, useEffect } from 'react';
import { createCliente, getTenants } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { validarRut, validarEmail, validarMaximoRut, validarTelefonoChile, validarEmailDominioLimpio } from '../utils/validators';
import InfoTooltip from '../components/ui/InfoTooltip';

function Svg({ paths = [], circles = [], size = 14, color = 'var(--text-muted)', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
      {circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
    </svg>
  );
}

function FormField({ label, name, type = 'text', value, onChange, error, placeholder, required, glossaryKey, ...rest }) {
  return (
    <div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}</span>
        {glossaryKey && <InfoTooltip glossaryKey={glossaryKey} position="top" />}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: error ? '1px solid var(--danger-soft)' : '1px solid var(--border)',
          borderRadius: 5,
          fontSize: 12,
          fontFamily: 'inherit',
          background: error ? 'var(--danger-bg)' : 'var(--bg-topbar)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          boxSizing: 'border-box'
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(37, 99, 235, 0.4)'; e.target.style.background = 'var(--surface)'; }}
        onBlur={e => { e.target.style.borderColor = error ? 'var(--danger-soft)' : 'var(--border)'; e.target.style.background = error ? 'var(--danger-bg)' : 'var(--bg-topbar)'; }}
        {...rest}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

const CATEGORIA_OPTIONS = [
  { value: 'COBRE', label: 'Cobre' },
  { value: 'PLATA', label: 'Plata' },
  { value: 'PLATINO', label: 'Platino' },
  { value: 'DIAMANTE', label: 'Diamante' },
  { value: 'OBSIDIANA', label: 'Obsidiana' },
];

const ESTADO_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'GRACIA', label: 'En Periodo de Gracia' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
];

function FormSelect({ label, name, value, onChange, options, required, glossaryKey, ...rest }) {
  return (
    <div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}</span>
        {glossaryKey && <InfoTooltip glossaryKey={glossaryKey} position="top" />}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid var(--border)',
          borderRadius: 5,
          fontSize: 12,
          fontFamily: 'inherit',
          background: 'var(--bg-topbar)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          boxSizing: 'border-box',
          cursor: 'pointer'
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(37, 99, 235, 0.4)'; e.target.style.background = 'var(--surface)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-topbar)'; }}
        {...rest}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const SectionTitle = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
    <Svg paths={icon} color="var(--text-faint)" size={12} />
    <h3 style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>{title}</h3>
  </div>
);

export default function NewClientModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState('natural');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    // Ya no cargamos tenants para mostrarlos en un select, 
    // porque el backend creará el tenant automáticamente.
  }, [user]);

  const [form, setForm] = useState({
    email_principal: '',
    telefono_contacto: '',
    run: '',
    nombre_completo: '',
    rut: '',
    razon_social: '',
    giro: '',
    contacto_nombre: '',
    contacto_cargo: '',
    contacto_email: '',
    contacto_telefono: '',
    tenant_id: '',
    categoria: 'COBRE',
    estado: 'ACTIVO',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    if (name === 'run' || name === 'rut') {
      filteredValue = value.replace(/[a-zA-Z]/g, (match) => match.toUpperCase() === 'K' ? 'K' : '');
    } else if (name === 'telefono_contacto' || name === 'contacto_telefono') {
      filteredValue = value.replace(/[a-zA-Z]/g, '');
    }

    setForm(f => ({ ...f, [name]: filteredValue }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};

    const emailVal = form.email_principal.trim();
    if (!emailVal) {
      newErrors.email_principal = 'Email requerido';
    } else {
      const validEmail = validarEmailDominioLimpio(emailVal);
      if (!validEmail.valido) newErrors.email_principal = validEmail.razon || 'Email inválido';
    }

    const teleVal = form.telefono_contacto.trim();
    if (teleVal) {
      const validTele = validarTelefonoChile(teleVal);
      if (!validTele.valido) newErrors.telefono_contacto = validTele.razon || 'Teléfono inválido';
    }

    if (tipo === 'natural') {
      const runVal = form.run.trim();
      if (!runVal) newErrors.run = 'RUN requerido';
      else if (!validarMaximoRut(runVal)) newErrors.run = 'RUN supera el máximo (99.999.999)';
      else if (!validarRut(runVal)) newErrors.run = 'RUN inválido';

      if (!form.nombre_completo.trim()) newErrors.nombre_completo = 'Nombre requerido';
    } else {
      const rutVal = form.rut.trim();
      if (!rutVal) newErrors.rut = 'RUT requerido';
      else if (!validarMaximoRut(rutVal)) newErrors.rut = 'RUT supera el máximo (99.999.999)';
      else if (!validarRut(rutVal)) newErrors.rut = 'RUT inválido';

      if (!form.razon_social.trim()) newErrors.razon_social = 'Razón social requerida';
      if (!form.giro.trim()) newErrors.giro = 'Giro requerido';

      const teleContactoVal = form.contacto_telefono.trim();
      if (teleContactoVal) {
        const validTele = validarTelefonoChile(teleContactoVal);
        if (!validTele.valido) newErrors.contacto_telefono = validTele.razon || 'Teléfono inválido';
      }
    }

    // Eliminada la validación de tenant_id porque se crea automáticamente en el backend
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      // Si es un botón o botón de submit, permitimos la acción por defecto
      if (activeEl.tagName === 'BUTTON' || activeEl.type === 'submit') {
        return;
      }

      // Si el elemento activo es un checkbox, al dar Enter lo seleccionamos
      if (activeEl.type === 'checkbox') {
        e.preventDefault();
        activeEl.click();
        return;
      }

      // Evitamos el envío del formulario por defecto
      e.preventDefault();

      const formEl = document.getElementById('new-client-form');
      if (!formEl) return;

      // Obtener todos los inputs, selects y textareas enfocables y visibles
      const elements = Array.from(
        formEl.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
      ).filter(el => {
        return el.tabIndex !== -1 && el.offsetWidth > 0 && el.offsetHeight > 0;
      });

      const index = elements.indexOf(activeEl);
      if (index > -1 && index < elements.length - 1) {
        const nextEl = elements[index + 1];
        nextEl.focus();

        // Si el siguiente campo es un checkbox, lo seleccionamos
        if (nextEl.type === 'checkbox') {
          nextEl.click();
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        tipo,
        email_principal: form.email_principal.trim(),
        telefono_contacto: form.telefono_contacto.trim(),
      };
      
      // El tenant_id ya no se envía desde el frontend; el backend lo crea.
      if (tipo === 'natural') {
        payload.run = form.run.trim();
        payload.nombre_completo = form.nombre_completo.trim();
      } else {
        payload.rut = form.rut.trim();
        payload.razon_social = form.razon_social.trim();
        payload.giro = form.giro.trim();
        payload.categoria = form.categoria;
        payload.estado = form.estado;
        if (form.contacto_nombre.trim() || form.contacto_email.trim()) {
          payload.contacto_representante = {
            nombre: form.contacto_nombre.trim(),
            cargo: form.contacto_cargo.trim(),
            email: form.contacto_email.trim(),
            telefono: form.contacto_telefono.trim(),
          };
        }
      }

      const created = await createCliente(payload);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      setErrors(e => ({ ...e, submit: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 40, animation: 'fadeIn 0.15s ease-out',
        }}
      />

      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--surface)',
          borderRadius: 6,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 50,
          width: '90%', maxWidth: 540, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Nuevo Cliente</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Registro de cliente natural o empresa</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--bg-topbar)',
              borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.target.style.background = 'var(--danger-tint)'}
            onMouseLeave={e => e.target.style.background = 'var(--bg-topbar)'}
          >
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-faint)" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          
          <p style={{ margin: '0 0 12px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>Tipo de Cliente</span>
            <InfoTooltip glossaryKey="tipo_cliente" position="right" />
          </p>
          <div className="ncm-tipo-row" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { value: 'natural', label: 'Persona Natural', desc: 'Individuo o profesional', icon: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8z'] },
              { value: 'juridica', label: 'Empresa', desc: 'Sociedad o corporación', icon: ['M3 21h18', 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16', 'M9 7h6', 'M9 11h6', 'M9 15h6'] },
            ].map(opt => {
              const active = tipo === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTipo(opt.value); setErrors({}); }}
                  style={{
                    flex: 1, padding: '16px 20px', borderRadius: 8,
                    border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: active ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-topbar)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                    textAlign: 'left', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--neutral-200)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--bg-topbar)'; }}
                >
                  <Svg paths={opt.icon} color={active ? 'var(--primary)' : 'var(--text-muted)'} size={24} strokeWidth={1.5} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: active ? 'var(--primary)' : 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {errors.submit && (
            <div style={{
              padding: '12px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 6,
              display: 'flex', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--danger)',
            }}>
              <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={14} />
              {errors.submit}
            </div>
          )}

          <form id="new-client-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            {/* Se eliminó el selector de Asignación de Tenant */}
            <div style={{ marginBottom: 16 }}>
              <SectionTitle icon={['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z']} title="Identificación Legal" />
              <div className="ncm-grid">
                {tipo === 'natural' ? (
                  <>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <FormField label="Nombre Completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} error={errors.nombre_completo} placeholder="ej: Juan Pérez" required glossaryKey="nombre_completo" />
                    </div>
                    <FormField label="RUN" name="run" value={form.run} onChange={handleChange} error={errors.run} placeholder="ej: 12345678-9" required glossaryKey="run" />
                  </>
                ) : (
                  <>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <FormField label="Razón Social" name="razon_social" value={form.razon_social} onChange={handleChange} error={errors.razon_social} placeholder="ej: Acme Inc." required glossaryKey="razon_social" />
                    </div>
                    <FormField label="RUT Empresa" name="rut" value={form.rut} onChange={handleChange} error={errors.rut} placeholder="ej: 76123456-7" required glossaryKey="rut_empresa" />
                    <FormField label="Giro" name="giro" value={form.giro} onChange={handleChange} error={errors.giro} placeholder="ej: Servicios de Consultoría" required glossaryKey="giro" />
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: tipo === 'juridica' ? 16 : 0 }}>
              <SectionTitle icon={['M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z']} title="Contacto Principal" />
              <div className="ncm-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="Email Principal" name="email_principal" type="email" value={form.email_principal} onChange={handleChange} error={errors.email_principal} placeholder="ej: contacto@empresa.com" required glossaryKey="email_principal" />
                </div>
                <FormField label="Teléfono" name="telefono_contacto" value={form.telefono_contacto} onChange={handleChange} error={errors.telefono_contacto} placeholder="ej: +56912345678" glossaryKey="telefono_contacto" />
              </div>
            </div>

            {tipo === 'juridica' && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-faint)', borderRadius: 8, border: '1px solid var(--neutral-200)' }}>
                <SectionTitle icon={['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 9h1', 'M9 13h1', 'M14 9h1', 'M14 13h1', 'M10 21v-4h4v4']} title="Suscripción & Plan (Tenant)" />
                <div className="ncm-grid">
                  <FormSelect label="Categoría (Plan)" name="categoria" value={form.categoria} onChange={handleChange} options={CATEGORIA_OPTIONS} required glossaryKey="categoria_plan" />
                  <FormSelect label="Estado Suscripción" name="estado" value={form.estado} onChange={handleChange} options={ESTADO_OPTIONS} required glossaryKey="estado_suscripcion" />
                </div>
              </div>
            )}

            {tipo === 'juridica' && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-faint)', borderRadius: 8, border: '1px solid var(--neutral-200)' }}>
                <SectionTitle icon={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8z']} title="Representante Legal (Opcional)" />
                <div className="ncm-grid">
                  <FormField label="Nombre" name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} placeholder="ej: Carlos López" glossaryKey="representante_legal" />
                  <FormField label="Cargo" name="contacto_cargo" value={form.contacto_cargo} onChange={handleChange} placeholder="ej: Gerente General" glossaryKey="contacto_cargo" />
                  <FormField label="Email" name="contacto_email" type="email" value={form.contacto_email} onChange={handleChange} placeholder="ej: carlos@empresa.com" glossaryKey="email_principal" />
                  <FormField label="Teléfono" name="contacto_telefono" value={form.contacto_telefono} onChange={handleChange} placeholder="ej: +56912345678" glossaryKey="telefono_contacto" />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-faint)',
          display: 'flex', gap: 8,
          borderRadius: '0 0 6px 6px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'var(--bg-topbar)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'background 0.12s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.target.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.target.style.background = 'var(--bg-topbar)'}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-client-form"
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: 5, border: 'none',
              background: loading ? 'var(--border-strong)' : 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.12s', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--primary-hover)'; }}
            onMouseLeave={e => { if (!loading) e.target.style.background = 'var(--primary)'; }}
          >
            {loading ? 'Creando...' : 'Crear Cliente'}
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          .ncm-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 12px;
          }
          @media (max-width: 520px) {
            .ncm-grid { grid-template-columns: 1fr; }
            .ncm-tipo-row { flex-direction: column; }
          }
        `}</style>
      </div>
    </>
  );
}

