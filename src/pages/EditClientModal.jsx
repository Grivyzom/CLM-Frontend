import React, { useState, useEffect } from 'react';
import { getClienteDetail, updateCliente } from '../api';

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

function FormField({ label, name, type = 'text', value, onChange, error, placeholder, required, disabled }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: error ? '1px solid var(--danger-soft)' : '1px solid var(--border)',
          borderRadius: 5,
          fontSize: 12,
          fontFamily: 'inherit',
          background: error ? 'var(--danger-bg)' : disabled ? 'var(--bg-inset)' : 'var(--bg-topbar)',
          color: disabled ? 'var(--text-faint)' : 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = 'rgba(37, 99, 235, 0.4)'; e.target.style.background = 'var(--surface)'; } }}
        onBlur={e => { e.target.style.borderColor = error ? 'var(--danger-soft)' : 'var(--border)'; e.target.style.background = error ? 'var(--danger-bg)' : disabled ? 'var(--bg-inset)' : 'var(--bg-topbar)'; }}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default function EditClientModal({ clientId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [tipo, setTipo] = useState(null);

  const [form, setForm] = useState({
    email_principal: '',
    telefono_contacto: '',
    run: '',
    nombre_completo: '',
    rut: '',
    razon_social: '',
    giro: '',
  });

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    getClienteDetail(clientId)
      .then(detail => {
        setTipo(detail.tipo);
        setForm({
          email_principal: detail.email_principal || '',
          telefono_contacto: detail.telefono_contacto || '',
          run: detail.run || '',
          nombre_completo: detail.nombre_completo || '',
          rut: detail.rut || '',
          razon_social: detail.razon_social || '',
          giro: detail.giro || '',
        });
      })
      .catch(err => {
        console.error('Error cargando cliente:', err);
        alert('Error al cargar datos del cliente');
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email_principal.trim()) newErrors.email_principal = 'Email requerido';
    if (tipo === 'natural' && !form.nombre_completo.trim()) newErrors.nombre_completo = 'Nombre requerido';
    if (tipo === 'juridica') {
      if (!form.razon_social.trim()) newErrors.razon_social = 'Razón social requerida';
      if (!form.giro.trim()) newErrors.giro = 'Giro requerido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        email_principal: form.email_principal.trim(),
        telefono_contacto: form.telefono_contacto.trim() || null,
      };

      if (tipo === 'natural') {
        payload.nombre_completo = form.nombre_completo.trim();
      } else {
        payload.razon_social = form.razon_social.trim();
        payload.giro = form.giro.trim();
      }

      const updated = await updateCliente(clientId, payload);
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setErrors(e => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  if (!clientId) return null;

  return (
    <>
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

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--surface)',
          borderRadius: 6,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 50,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Editar Cliente</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Actualizar información del cliente</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--border)',
              background: 'var(--bg-faint)',
              borderRadius: 6,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.12s',
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={e => !saving && (e.target.style.background = 'var(--danger-tint)')}
            onMouseLeave={e => !saving && (e.target.style.background = 'var(--bg-faint)')}
          >
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" size={13} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-faint)' }}>
            Cargando...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {errors.submit && (
              <div style={{
                padding: '12px 14px',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 6,
                display: 'flex',
                gap: 8,
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--danger)',
              }}>
                <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={14} />
                {errors.submit}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Svg paths={['M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z']} color="var(--text-muted)" size={11} />
                Contacto
              </p>
              <FormField
                label="Email"
                name="email_principal"
                type="email"
                value={form.email_principal}
                onChange={handleChange}
                error={errors.email_principal}
                placeholder="contacto@empresa.com"
                required
              />
              <FormField
                label="Teléfono"
                name="telefono_contacto"
                value={form.telefono_contacto}
                onChange={handleChange}
                placeholder="+56912345678"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Svg paths={['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z']} color="var(--text-muted)" size={11} />
                Identificación
              </p>

              {tipo === 'natural' ? (
                <>
                  <FormField
                    label="RUN"
                    name="run"
                    value={form.run}
                    onChange={handleChange}
                    error={errors.run}
                    disabled
                    placeholder="No editable"
                  />
                  <FormField
                    label="Nombre Completo"
                    name="nombre_completo"
                    value={form.nombre_completo}
                    onChange={handleChange}
                    error={errors.nombre_completo}
                    placeholder="Juan Pérez"
                    required
                  />
                </>
              ) : (
                <>
                  <FormField
                    label="RUT"
                    name="rut"
                    value={form.rut}
                    onChange={handleChange}
                    error={errors.rut}
                    disabled
                    placeholder="No editable"
                  />
                  <FormField
                    label="Razón Social"
                    name="razon_social"
                    value={form.razon_social}
                    onChange={handleChange}
                    error={errors.razon_social}
                    placeholder="Acme Inc."
                    required
                  />
                  <FormField
                    label="Giro"
                    name="giro"
                    value={form.giro}
                    onChange={handleChange}
                    error={errors.giro}
                    placeholder="Servicios de Consultoría"
                    required
                  />
                </>
              )}
            </div>
          </form>
        )}

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
        }}>
          <button
            onClick={onClose}
            disabled={saving || loading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              background: 'var(--bg-topbar)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
              opacity: saving || loading ? 0.6 : 1,
            }}
            onMouseEnter={e => !saving && !loading && (e.target.style.background = 'var(--neutral-200)')}
            onMouseLeave={e => !saving && !loading && (e.target.style.background = 'var(--bg-topbar)')}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 5,
              border: 'none',
              background: saving || loading ? 'var(--border)' : 'var(--primary)',
              color: 'var(--text-on-accent)',
              fontSize: 12,
              fontWeight: 600,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
              opacity: saving || loading ? 0.7 : 1,
            }}
            onMouseEnter={e => !saving && !loading && (e.target.style.background = 'var(--primary-hover)')}
            onMouseLeave={e => !saving && !loading && (e.target.style.background = 'var(--primary)')}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
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
