import React, { useState } from 'react';
import { createCliente } from '../api';
import { validarRut, validarEmail, validarMaximoRut, validarTelefonoChile, validarEmailDominioLimpio } from '../utils/validators';

function Svg({ paths = [], circles = [], size = 14, color = '#7c7670', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
      {circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
    </svg>
  );
}

function FormField({ label, name, type = 'text', value, onChange, error, placeholder, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#7c7670', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
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
          border: error ? '1px solid #fca5a5' : '1px solid #d8d4cc',
          borderRadius: 5,
          fontSize: 12,
          fontFamily: 'inherit',
          background: error ? '#fef2f2' : '#efede8',
          color: '#3b3631',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(37, 99, 235, 0.4)'; e.target.style.background = '#fff'; }}
        onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#d8d4cc'; e.target.style.background = error ? '#fef2f2' : '#efede8'; }}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

export default function NewClientModal({ onClose, onSuccess }) {
  const [tipo, setTipo] = useState('natural');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    email_principal: '',
    telefono_contacto: '',
    // Natural
    run: '',
    nombre_completo: '',
    // Juridica
    rut: '',
    razon_social: '',
    giro: '',
    // Contacto representante (juridica)
    contacto_nombre: '',
    contacto_cargo: '',
    contacto_email: '',
    contacto_telefono: '',
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

    // Email
    const emailVal = form.email_principal.trim();
    if (!emailVal) {
      newErrors.email_principal = 'Email requerido';
    } else {
      const validEmail = validarEmailDominioLimpio(emailVal);
      if (!validEmail.valido) {
        newErrors.email_principal = validEmail.razon || 'Email inválido';
      }
    }

    // Teléfono (opcional, pero si se ingresa debe ser válido)
    const teleVal = form.telefono_contacto.trim();
    if (teleVal) {
      const validTele = validarTelefonoChile(teleVal);
      if (!validTele.valido) {
        newErrors.telefono_contacto = validTele.razon || 'Teléfono inválido';
      }
    }

    if (tipo === 'natural') {
      const runVal = form.run.trim();
      if (!runVal) {
        newErrors.run = 'RUN requerido';
      } else if (!validarMaximoRut(runVal)) {
        newErrors.run = 'RUN supera el máximo permitido (99.999.999)';
      } else if (!validarRut(runVal)) {
        newErrors.run = 'RUN inválido (verificar dígito verificador)';
      }

      if (!form.nombre_completo.trim()) newErrors.nombre_completo = 'Nombre requerido';
    } else {
      const rutVal = form.rut.trim();
      if (!rutVal) {
        newErrors.rut = 'RUT requerido';
      } else if (!validarMaximoRut(rutVal)) {
        newErrors.rut = 'RUT supera el máximo permitido (99.999.999)';
      } else if (!validarRut(rutVal)) {
        newErrors.rut = 'RUT inválido (verificar dígito verificador)';
      }

      if (!form.razon_social.trim()) newErrors.razon_social = 'Razón social requerida';
      if (!form.giro.trim()) newErrors.giro = 'Giro requerido';

      // Validar teléfono contacto representante si se ingresa
      const teleContactoVal = form.contacto_telefono.trim();
      if (teleContactoVal) {
        const validTele = validarTelefonoChile(teleContactoVal);
        if (!validTele.valido) {
          newErrors.contacto_telefono = validTele.razon || 'Teléfono inválido';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      if (tipo === 'natural') {
        payload.run = form.run.trim();
        payload.nombre_completo = form.nombre_completo.trim();
      } else {
        payload.rut = form.rut.trim();
        payload.razon_social = form.razon_social.trim();
        payload.giro = form.giro.trim();
        if (form.contacto_nombre.trim() || form.contacto_email.trim()) {
          payload.contacto_representante = {
            nombre: form.contacto_nombre.trim(),
            cargo: form.contacto_cargo.trim(),
            email: form.contacto_email.trim(),
            telefono: form.contacto_telefono.trim(),
          };
        }
      }

      await createCliente(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors(e => ({ ...e, submit: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 40,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 6,
          border: '1px solid #d8d4cc',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 50,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #d8d4cc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#3b3631' }}>Nuevo Cliente</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7c7670' }}>Registro de cliente natural o empresa</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: '1px solid #d8d4cc',
              background: '#efede8',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.target.style.background = '#fee2e2'}
            onMouseLeave={e => e.target.style.background = '#efede8'}
          >
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="#b0aaa3" size={13} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Tipo Selector */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, color: '#7c7670', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
              Tipo de Cliente
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'natural', label: 'Persona Natural', icon: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'] },
                { value: 'juridica', label: 'Empresa', icon: ['M3 3h18v18H3z', 'M10 7h4', 'M10 13h4', 'M3 7h2', 'M3 13h2'] },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipo(opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: tipo === opt.value ? '2px solid #2563eb' : '1px solid #d8d4cc',
                    background: tipo === opt.value ? 'rgba(37, 99, 235, 0.05)' : '#efede8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: tipo === opt.value ? 600 : 500,
                    color: tipo === opt.value ? '#2563eb' : '#5c574f',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (tipo !== opt.value) e.currentTarget.style.background = '#e5e2da'; }}
                  onMouseLeave={e => { if (tipo !== opt.value) e.currentTarget.style.background = '#efede8'; }}
                >
                  <Svg paths={opt.icon} color={tipo === opt.value ? '#2563eb' : '#b0aaa3'} size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error global */}
          {errors.submit && (
            <div style={{
              padding: '12px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              fontSize: 12,
              color: '#dc2626',
            }}>
              <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="#dc2626" size={14} />
              {errors.submit}
            </div>
          )}

          {/* Sección: Identificación */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 9, fontWeight: 700, color: '#b0aaa3', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 5 }}>
              <Svg paths={['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z']} color="#b0aaa3" size={11} />
              Identificación Legal
            </p>

            {tipo === 'natural' ? (
              <>
                <FormField
                  label="RUN"
                  name="run"
                  value={form.run}
                  onChange={handleChange}
                  error={errors.run}
                  placeholder="ej: 12345678-9"
                  required
                />
                <FormField
                  label="Nombre Completo"
                  name="nombre_completo"
                  value={form.nombre_completo}
                  onChange={handleChange}
                  error={errors.nombre_completo}
                  placeholder="ej: Juan Pérez"
                  required
                />
              </>
            ) : (
              <>
                <FormField
                  label="RUT Empresa"
                  name="rut"
                  value={form.rut}
                  onChange={handleChange}
                  error={errors.rut}
                  placeholder="ej: 76123456-7"
                  required
                />
                <FormField
                  label="Razón Social"
                  name="razon_social"
                  value={form.razon_social}
                  onChange={handleChange}
                  error={errors.razon_social}
                  placeholder="ej: Acme Inc."
                  required
                />
                <FormField
                  label="Giro"
                  name="giro"
                  value={form.giro}
                  onChange={handleChange}
                  error={errors.giro}
                  placeholder="ej: Servicios de Consultoría"
                  required
                />
              </>
            )}
          </div>

          {/* Sección: Contacto */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 9, fontWeight: 700, color: '#b0aaa3', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 5 }}>
              <Svg paths={['M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z']} color="#b0aaa3" size={11} />
              Contacto Principal
            </p>

            <FormField
              label="Email"
              name="email_principal"
              type="email"
              value={form.email_principal}
              onChange={handleChange}
              error={errors.email_principal}
              placeholder="ej: contacto@empresa.com"
              required
            />
            <FormField
              label="Teléfono"
              name="telefono_contacto"
              value={form.telefono_contacto}
              onChange={handleChange}
              placeholder="ej: +56912345678"
            />
          </div>

          {/* Sección: Contacto Representante (solo para juridica) */}
          {tipo === 'juridica' && (
            <div style={{ marginBottom: 20, padding: '14px', background: '#efede8', borderRadius: 6, border: '1px solid #e5e2da' }}>
              <p style={{ margin: '0 0 12px', fontSize: 9, fontWeight: 700, color: '#b0aaa3', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 5 }}>
                <Svg paths={['M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z']} color="#b0aaa3" size={11} />
                Contacto Representante (Opcional)
              </p>

              <FormField
                label="Nombre"
                name="contacto_nombre"
                value={form.contacto_nombre}
                onChange={handleChange}
                placeholder="ej: Carlos López"
              />
              <FormField
                label="Cargo"
                name="contacto_cargo"
                value={form.contacto_cargo}
                onChange={handleChange}
                placeholder="ej: Gerente General"
              />
              <FormField
                label="Email"
                name="contacto_email"
                type="email"
                value={form.contacto_email}
                onChange={handleChange}
                placeholder="ej: carlos@empresa.com"
              />
              <FormField
                label="Teléfono"
                name="contacto_telefono"
                value={form.contacto_telefono}
                onChange={handleChange}
                placeholder="ej: +56912345678"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #d8d4cc',
          display: 'flex',
          gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 5,
              border: '1px solid #d8d4cc',
              background: '#efede8',
              color: '#5c574f',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.12s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.target.style.background = '#e5e2da'}
            onMouseLeave={e => e.target.style.background = '#efede8'}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 5,
              border: 'none',
              background: loading ? '#c9c4bc' : '#2563eb',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.12s',
              fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { if (!loading) e.target.style.background = '#2563eb'; }}
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
        `}</style>
      </div>
    </>
  );
}
