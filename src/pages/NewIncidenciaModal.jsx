import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createIncidencia, getContratos, getClientes } from '../api';
import { useAuth } from '../contexts/AuthContext';

function Svg({ paths = [], size = 14, color = 'var(--text-muted)', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function FormField({ label, name, type = 'text', value, onChange, error, placeholder, required, as = 'input', children, rows }) {
  const sharedStyle = {
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
    boxSizing: 'border-box',
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {as === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={rows || 4} style={{ ...sharedStyle, resize: 'vertical' }} />
      ) : as === 'select' ? (
        <select name={name} value={value} onChange={onChange} style={sharedStyle}>{children}</select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} style={sharedStyle} />
      )}
      {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

const SEVERIDADES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

export default function NewIncidenciaModal({ onClose, onSuccess }) {
  const { user, isClienteExterno } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    severidad: 'MEDIA',
    contrato_id: '',
  });
  const [files, setFiles] = useState([]);

  const [contratos, setContratos] = useState([]);
  const [contratosLoading, setContratosLoading] = useState(false);

  // Solo relevante para staff: buscar/seleccionar el cliente en cuyo nombre se reporta.
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteOptions, setClienteOptions] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const clienteSearchTimer = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const loadContratos = useCallback(async (clienteId) => {
    setContratosLoading(true);
    try {
      const result = await getContratos({ cliente: clienteId, page_size: 100 });
      setContratos(result.results || []);
    } catch (_) {
      setContratos([]);
    } finally {
      setContratosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isClienteExterno && user?.clienteId) {
      loadContratos(user.clienteId);
    }
  }, [isClienteExterno, user, loadContratos]);

  useEffect(() => {
    if (isClienteExterno) return;
    if (clienteSearchTimer.current) clearTimeout(clienteSearchTimer.current);
    if (!clienteSearch.trim()) { setClienteOptions([]); return; }
    clienteSearchTimer.current = setTimeout(async () => {
      try {
        const result = await getClientes({ search: clienteSearch, page_size: 8 });
        setClienteOptions(result.results || []);
      } catch (_) {
        setClienteOptions([]);
      }
    }, 300);
    return () => clearTimeout(clienteSearchTimer.current);
  }, [clienteSearch, isClienteExterno]);

  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setClienteOptions([]);
    setClienteSearch(cliente.razon_social || cliente.email);
    setForm(f => ({ ...f, contrato_id: '' }));
    loadContratos(cliente.id);
    if (errors.cliente_id) setErrors(er => ({ ...er, cliente_id: '' }));
  };

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.titulo.trim()) newErrors.titulo = 'Título requerido';
    if (!form.descripcion.trim()) newErrors.descripcion = 'Descripción requerida';
    if (!isClienteExterno && !selectedCliente) newErrors.cliente_id = 'Selecciona el cliente que reporta';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('titulo', form.titulo.trim());
      formData.append('descripcion', form.descripcion.trim());
      formData.append('severidad', form.severidad);
      if (form.contrato_id) formData.append('contrato_id', form.contrato_id);
      if (!isClienteExterno && selectedCliente) formData.append('cliente_id', selectedCliente.id);
      files.forEach(f => formData.append('adjuntos', f));

      await createIncidencia(formData);
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors(er => ({ ...er, submit: err.message }));
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
          width: '90%', maxWidth: 560, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Reportar Incidencia</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Reporte de fallas sobre el software contratado</p>
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

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {errors.submit && (
            <div style={{
              padding: '12px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 6,
              display: 'flex', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--danger)',
            }}>
              <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--danger)" size={14} />
              {errors.submit}
            </div>
          )}

          <form id="new-incidencia-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '10px 12px', marginBottom: 16 }}>
              {!isClienteExterno && (
                <div style={{ position: 'relative' }}>
                  <FormField
                    label="Cliente que reporta"
                    name="cliente_search"
                    value={clienteSearch}
                    onChange={(e) => { setClienteSearch(e.target.value); setSelectedCliente(null); }}
                    error={errors.cliente_id}
                    placeholder="Buscar por nombre, razón social o email"
                    required
                  />
                  {clienteOptions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5,
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5,
                      marginTop: 2, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    }}>
                      {clienteOptions.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCliente(c)}
                          style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text-primary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-faint)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {c.razon_social} — <span style={{ color: 'var(--text-muted)' }}>{c.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <FormField label="Título" name="titulo" value={form.titulo} onChange={handleChange} error={errors.titulo} placeholder="ej: Error al generar reporte mensual" required />

              <FormField label="Descripción" name="descripcion" as="textarea" rows={4} value={form.descripcion} onChange={handleChange} error={errors.descripcion} placeholder="Describe el problema, pasos para reproducirlo, y su impacto" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                <FormField label="Severidad" name="severidad" as="select" value={form.severidad} onChange={handleChange} required>
                  {SEVERIDADES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </FormField>

                <FormField label="Contrato / Software afectado" name="contrato_id" as="select" value={form.contrato_id} onChange={handleChange}>
                  <option value="">
                    {contratosLoading ? 'Cargando...' : (contratos.length === 0 ? 'Sin contratos disponibles' : 'Sin especificar')}
                  </option>
                  {contratos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.software?.nombre || `Contrato #${c.id}`}
                    </option>
                  ))}
                </FormField>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
                  Adjuntos (capturas, logs)
                </label>
                <input type="file" multiple onChange={handleFilesChange} style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                {files.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{files.length} archivo(s) seleccionado(s)</p>
                )}
              </div>
            </div>
          </form>
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-faint)',
          display: 'flex', gap: 8,
          borderRadius: '0 0 6px 6px',
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
            form="new-incidencia-form"
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
            {loading ? 'Reportando...' : 'Reportar Incidencia'}
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
