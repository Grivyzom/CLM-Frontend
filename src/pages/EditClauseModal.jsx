import React, { useState, useEffect } from 'react';
import { createClausula, updateClausula } from '../api';

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

function FormField({ label, name, type = 'text', value, onChange, placeholder, required }) {
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
          boxSizing: 'border-box',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(37, 99, 235, 0.4)'; e.target.style.background = 'var(--surface)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-topbar)'; }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      <select
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
          boxSizing: 'border-box',
          appearance: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function EditClauseModal({ clause, onClose, onSuccess, createForm, setCreateForm }) {
  const isEditing = !!clause;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [localFormData, setLocalFormData] = useState({
    name: '',
    cat: '',
    risk: 'Medio',
    versions: [
      { label: 'Estándar', tag: 'Estándar', text: '' }
    ]
  });

  const formData = isEditing ? localFormData : createForm;
  const setFormData = isEditing ? setLocalFormData : setCreateForm;

  useEffect(() => {
    if (isEditing && clause) {
      setLocalFormData({
        name: clause.name || '',
        cat: clause.cat || '',
        risk: clause.risk || 'Medio',
        versions: (clause.versions && clause.versions.length > 0) 
          ? clause.versions.map(v => ({
              id: v.id,
              label: v.label || v.etiqueta,
              tag: v.tag || v.tipo,
              text: v.text || v.texto || ''
            }))
          : [{ label: 'Estándar', tag: 'Estándar', text: '' }]
      });
    }
  }, [clause, isEditing]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVersionChange = (index, field, value) => {
    const newVersions = [...formData.versions];
    newVersions[index][field] = value;
    setFormData(prev => ({ ...prev, versions: newVersions }));
  };

  const handleAddVersion = () => {
    setFormData(prev => ({
      ...prev,
      versions: [...prev.versions, { label: 'Nueva Versión', tag: 'Alternativa', text: '' }]
    }));
  };

  const handleRemoveVersion = (index) => {
    if (formData.versions.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      versions: prev.versions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.cat) {
      setError('Por favor completa el nombre y la categoría.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      if (isEditing) {
        await updateClausula(clause.id, formData);
      } else {
        await createClausula(formData);
        if (setCreateForm) {
          setCreateForm({
            name: '',
            cat: '',
            risk: 'Medio',
            versions: [
              { label: 'Estándar', tag: 'Estándar', text: '' }
            ]
          });
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar la cláusula');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={!loading ? onClose : undefined}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          width: '90%',
          maxWidth: 600,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          animation: 'dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bg-topbar)', background: 'var(--bg-faint)', borderRadius: '6px 6px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>
              {isEditing ? 'Editar Cláusula' : 'Nueva Cláusula'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Define el texto y las variantes alternativas de esta cláusula.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-faint)',
              borderRadius: 4,
            }}
          >
            <Svg paths={['M18 6L6 18', 'M6 6l12 12']} size={16} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-soft)', borderRadius: 4, color: 'var(--danger)', fontSize: 11, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Svg paths={['M12 8v4', 'M12 16h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z']} size={14} color="var(--danger)" />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <FormField
                label="Categoría"
                name="cat"
                value={formData.cat}
                onChange={handleChange}
                placeholder="Ej. Confidencialidad"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <FormField
                label="Nombre de la Cláusula"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Obligación de Confidencialidad"
                required
              />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <SelectField
                label="Nivel de Riesgo"
                value={formData.risk}
                onChange={(e) => setFormData(prev => ({ ...prev, risk: e.target.value }))}
                options={[
                  { label: 'Bajo', value: 'Bajo' },
                  { label: 'Medio', value: 'Medio' },
                  { label: 'Alto', value: 'Alto' },
                ]}
              />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Versiones</h3>
              <button
                type="button"
                onClick={handleAddVersion}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <Svg paths={['M12 5v14', 'M5 12h14']} size={12} color="var(--primary)" /> Agregar Versión
              </button>
            </div>

            {formData.versions.map((v, idx) => (
              <div key={idx} style={{ background: 'var(--bg-faint)', border: '1px solid var(--bg-topbar)', borderRadius: 6, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <FormField
                      label="Etiqueta"
                      value={v.label}
                      onChange={(e) => handleVersionChange(idx, 'label', e.target.value)}
                      placeholder="Ej. Estándar"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SelectField
                      label="Tipo"
                      value={v.tag}
                      onChange={(e) => handleVersionChange(idx, 'tag', e.target.value)}
                      options={[
                        { label: 'Estándar', value: 'Estándar' },
                        { label: 'Alternativa', value: 'Alternativa' },
                      ]}
                    />
                  </div>
                  {formData.versions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVersion(idx)}
                      style={{ marginTop: 20, padding: 8, background: 'var(--danger-bg)', border: '1px solid var(--danger-soft)', borderRadius: 4, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Eliminar versión"
                    >
                      <Svg paths={['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']} size={14} color="var(--danger)" />
                    </button>
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
                    Texto de la Cláusula
                  </label>
                  <textarea
                    value={v.text}
                    onChange={(e) => handleVersionChange(idx, 'text', e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      fontSize: 12,
                      fontFamily: 'inherit',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(37, 99, 235, 0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--bg-topbar)', background: 'var(--bg-faint)', borderRadius: '0 0 6px 6px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '6px 14px', border: '1px solid var(--border)', background: 'var(--surface)',
              borderRadius: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', border: 'none', background: 'var(--primary)',
              borderRadius: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-on-accent)', cursor: 'pointer'
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Cláusula'}
          </button>
        </div>
      </div>
    </>
  );
}
