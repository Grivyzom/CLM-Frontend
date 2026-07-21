import { useState, useEffect } from 'react';
import { createProducto, updateProducto } from '../../api';
import { Icon } from './ui';
import { PRODUCTO_CATEGORIAS, PRODUCTO_VACIO } from './helpers';

// ─── Options configuration for ChipSelector ──────────────────────────────────
const TIPO_SOFTWARE_OPTIONS = [
  { value: 'App Web', label: 'Web App', icon: '🌐' },
  { value: 'App Android', label: 'Android', icon: '🤖' },
  { value: 'App iOS', label: 'iOS', icon: '🍎' },
  { value: 'App Multiplataforma', label: 'Híbrida', icon: '📱' },
  { value: 'Software Nativo PC', label: 'Windows PC', icon: '💻' },
  { value: 'Software Nativo Mac', label: 'macOS', icon: '🖥️' },
  { value: 'Servicio Backend', label: 'Backend / API', icon: '⚙️' },
  { value: 'Otro', label: 'Otro', icon: '🔧' }
];

const MODALIDAD_ENTREGA_OPTIONS = [
  { value: 'SaaS (Cloud)', label: 'SaaS (Nube)', icon: '☁️' },
  { value: 'On-Premise', label: 'On-Premise', icon: '🏢' },
  { value: 'Híbrido', label: 'Híbrido', icon: '🔄' },
  { value: 'Instalación Local', label: 'Instalación Local', icon: '💾' }
];

const NIVEL_SOPORTE_OPTIONS = [
  { value: 'Sin soporte incluido', label: 'Sin Soporte', icon: '🚫' },
  { value: 'Básico (Email/Tickets)', label: 'Básico', icon: '✉️' },
  { value: 'Estándar (Horario Laboral)', label: 'Estándar (9x5)', icon: '🕒' },
  { value: 'Premium (SLA 24/7)', label: 'Premium (24/7)', icon: '⭐' }
];

const PROPIEDAD_INTELECTUAL_OPTIONS = [
  { value: 'Propiedad del Desarrollador (Licencia de uso)', label: 'Licencia de Uso', icon: '📝' },
  { value: 'Propiedad del Cliente (Traspaso total)', label: 'Propiedad del Cliente', icon: '💼' },
  { value: 'Código Abierto (Open Source)', label: 'Open Source', icon: '🔓' }
];

const PUBLICACION_TIENDAS_OPTIONS = [
  { value: 'A cargo del desarrollador', label: 'Por Desarrollador', icon: '🚀' },
  { value: 'A cargo del cliente', label: 'Por Cliente', icon: '👤' },
  { value: 'No aplica / Distribución interna', label: 'No aplica', icon: '🔒' }
];

const MANTENIMIENTO_SO_OPTIONS = [
  { value: 'Incluye adaptación a nuevas versiones (1 año)', label: 'Incluye (1 año)', icon: '📅' },
  { value: 'No incluye adaptación', label: 'No Incluye', icon: '❌' },
  { value: 'Mantenimiento continuo (Contrato SLA)', label: 'SLA Continuo', icon: '🔄' }
];

const ALOJAMIENTO_DATOS_OPTIONS = [
  { value: 'Nube del Desarrollador (SaaS)', label: 'Nube Desarrollador', icon: '☁️' },
  { value: 'Nube del Cliente (On-Premise/Cloud propia)', label: 'Nube Cliente', icon: '🏠' },
  { value: 'Tercero / PaaS', label: 'Tercero / PaaS', icon: '🏢' }
];

const ACUERDOS_NIVEL_SERVICIO_SLA_OPTIONS = [
  { value: 'Uptime 99.9% (Garantizado)', label: '99.9% SLA', icon: '💎' },
  { value: 'Uptime 99% (Estándar)', label: '99% SLA', icon: '📈' },
  { value: 'Mejor esfuerzo (Sin SLA estricto)', label: 'Mejor Esfuerzo', icon: '⚡' }
];

const LIMITE_USUARIOS_OPTIONS = [
  { value: 'Ilimitado', label: 'Ilimitado', icon: '♾️' },
  { value: 'Por rangos (especificado en contrato)', label: 'Por Rangos', icon: '📊' },
  { value: 'Concurrencia limitada', label: 'Concurrencia Lim.', icon: '⚠️' }
];

const LICENCIAMIENTO_EQUIPOS_OPTIONS = [
  { value: 'Por dispositivo / MAC Address', label: 'Por Dispositivo', icon: '🔌' },
  { value: 'Por usuario nominal', label: 'Por Usuario', icon: '👤' },
  { value: 'Licencia global / Ilimitada', label: 'Global / Ilim.', icon: '🌍' }
];

const DISTRIBUCION_OPTIONS = [
  { value: 'Instalador ejecutable (.exe / .dmg)', label: 'Ejecutable', icon: '📦' },
  { value: 'Tienda oficial (MS Store / Mac App Store)', label: 'Tienda Oficial', icon: '🏪' },
  { value: 'Despliegue corporativo (MDM / GPO)', label: 'MDM Corporativo', icon: '🏢' }
];

// Helper components for visual controls
function ChipSelector({ options, value, onChange, disabled, hasError }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 20,
              border: isSelected 
                ? '1px solid var(--primary)' 
                : hasError 
                  ? '1px solid var(--danger)' 
                  : '1px solid var(--border)',
              background: isSelected 
                ? 'var(--primary-soft)' 
                : hasError 
                  ? 'rgba(239, 68, 68, 0.04)' 
                  : 'var(--surface)',
              color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '10.5px',
              fontWeight: isSelected ? 600 : 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {opt.icon && <span style={{ fontSize: 12 }}>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      marginBottom: 10
    }}>
      <h5 style={{ margin: '0 0 6px 0', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        {title}
      </h5>
      {children}
    </div>
  );
}

// ─── New Product Modal ───────────────────────────────────────────────────────

export default function ProductModal({ onClose, onSaved, mode = 'create', product, createForm, setCreateForm }) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [localForm, setLocalForm] = useState(() => {
    if (product) {
      return {
        ...PRODUCTO_VACIO,
        ...product,
        tipo_licencia: product.tipo_licencia || 'Comercial',
        datos_adicionales: product.datos_adicionales || {}
      };
    }
    return PRODUCTO_VACIO;
  });

  const form = isCreate ? createForm : localForm;
  const setForm = isCreate ? setCreateForm : setLocalForm;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [showCustomUnit, setShowCustomUnit] = useState(() => {
    const predefinedUnits = ['/usuario/mes', '/usuario/año', '/mes', '/año', '/licencia', '/dispositivo', '/proyecto', '/hora', ''];
    return (product?.unit || createForm?.unit || '') && !predefinedUnits.includes(product?.unit || createForm?.unit || '');
  });

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const setExtraField = (key, val) => {
    setForm(prev => ({
      ...prev,
      datos_adicionales: {
        ...(prev.datos_adicionales || {}),
        [key]: val
      }
    }));
  };

  const [showValidation, setShowValidation] = useState(false);

  const isFreeLicense = form.tipo_licencia === 'Gratuito / OpenSource';

  const getValidationErrors = () => {
    const errs = {};
    if (!form.name || !form.name.trim()) {
      errs.name = 'El nombre es obligatorio';
    }
    
    if (!isFreeLicense) {
      if (form.price === '' || Number(form.price) < 0 || isNaN(Number(form.price))) {
        errs.price = 'Debe indicar un precio válido (>= 0)';
      }
      if (!form.currency || !form.currency.trim()) {
        errs.currency = 'La divisa es obligatoria';
      }
      if (!form.unit || !form.unit.trim()) {
        errs.unit = 'La unidad de cobro es obligatoria';
      }
    }

    if (form.cat === 'Software') {
      const extra = form.datos_adicionales || {};
      if (!extra.tipo_software) {
        errs.tipo_software = 'Seleccione plataforma';
      } else if (extra.tipo_software === 'Otro' && (!extra.tipo_software_otro || !extra.tipo_software_otro.trim())) {
        errs.tipo_software_otro = 'Describa el software';
      }

      if (!extra.mas_informacion || !extra.mas_informacion.trim()) {
        errs.mas_informacion = 'La descripción es obligatoria';
      }
      if (!extra.modalidad_entrega) {
        errs.modalidad_entrega = 'Seleccione entrega';
      }
      if (!extra.nivel_soporte) {
        errs.nivel_soporte = 'Seleccione soporte';
      }
      if (!extra.propiedad_intelectual) {
        errs.propiedad_intelectual = 'Seleccione propiedad';
      }

      if (['App Android', 'App iOS', 'App Multiplataforma'].includes(extra.tipo_software)) {
        if (!extra.publicacion_tiendas) errs.publicacion_tiendas = 'Seleccione publicación';
        if (!extra.mantenimiento_so) errs.mantenimiento_so = 'Seleccione mantenimiento';
      } else if (['App Web', 'Servicio Backend'].includes(extra.tipo_software)) {
        if (!extra.alojamiento_datos) errs.alojamiento_datos = 'Seleccione alojamiento';
        if (!extra.acuerdos_nivel_servicio_sla) errs.acuerdos_nivel_servicio_sla = 'Seleccione SLA';
        if (!extra.limite_usuarios) errs.limite_usuarios = 'Seleccione límite';
      } else if (['Software Nativo PC', 'Software Nativo Mac'].includes(extra.tipo_software)) {
        if (!extra.licenciamiento_equipos) errs.licenciamiento_equipos = 'Seleccione licenciamiento';
        if (!extra.distribucion) errs.distribucion = 'Seleccione distribución';
      } else if (extra.tipo_software === 'Otro') {
        if (!extra.entregables_especificos || !extra.entregables_especificos.trim()) {
          errs.entregables_especificos = 'Describa entregables';
        }
      }
    } else if (form.cat === 'Agente') {
      const extra = form.datos_adicionales || {};
      if (!extra.tipo_agente) errs.tipo_agente = 'Seleccione tipo';
      if (!extra.integracion_llm || !extra.integracion_llm.trim()) errs.integracion_llm = 'Indique modelo/LLM';
    } else if (form.cat === 'Script') {
      const extra = form.datos_adicionales || {};
      if (!extra.entorno_lenguaje) errs.entorno_lenguaje = 'Seleccione entorno';
      if (!extra.proposito) errs.proposito = 'Seleccione propósito';
    } else if (form.cat === 'Auditoría') {
      const extra = form.datos_adicionales || {};
      if (!extra.enfoque) errs.enfoque = 'Seleccione enfoque';
    } else if (form.cat === 'Consultoría') {
      const extra = form.datos_adicionales || {};
      if (!extra.modalidad) errs.modalidad = 'Seleccione modalidad';
    }

    return errs;
  };

  const validationErrors = getValidationErrors();
  const isValid = Object.keys(validationErrors).length === 0;

  const handleSubmit = async () => {
    if (isView) return;
    if (saving) return;
    if (!isValid) {
      setShowValidation(true);
      setError('Por favor, completa todos los campos obligatorios indicados en rojo.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        price: isFreeLicense ? '0' : form.price,
        currency: isFreeLicense ? 'N/A' : form.currency,
        unit: isFreeLicense ? 'No aplica' : form.unit,
      };

      if (isCreate) {
        const nuevo = await createProducto(payload);
        onSaved(nuevo, 'create');
        if (setCreateForm) setCreateForm(PRODUCTO_VACIO);
      } else {
        const editado = await updateProducto(product.id, payload);
        onSaved(editado, 'edit');
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const renderFieldError = (fieldKey) => {
    if (showValidation && validationErrors[fieldKey]) {
      return (
        <span style={{ color: 'var(--danger)', fontSize: 10, marginTop: 4, display: 'block', fontWeight: 500 }}>
          {validationErrors[fieldKey]}
        </span>
      );
    }
    return null;
  };

  const getLabelStyle = (fieldKey) => ({
    ...labelStyle,
    color: (showValidation && validationErrors[fieldKey]) ? 'var(--danger)' : 'var(--text-muted)'
  });

  const getInputStyle = (fieldKey) => ({
    ...inputStyle,
    borderColor: (showValidation && validationErrors[fieldKey]) ? 'var(--danger)' : 'var(--border)',
    boxShadow: (showValidation && validationErrors[fieldKey]) ? '0 0 0 1px var(--danger-soft)' : 'none',
  });

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: 'var(--text-primary)',
    backgroundColor: isView ? 'var(--bg-page)' : 'var(--surface)',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };

  let modalTitle = 'Nuevo Ítem — Producto / Tarifa';
  if (isEdit) modalTitle = 'Editar Ítem — Producto / Tarifa';
  if (isView) modalTitle = 'Detalle de Producto / Tarifa';

  const hasDynamicPanel = ['Software', 'Agente', 'Script', 'Auditoría', 'Consultoría'].includes(form.cat);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: hasDynamicPanel ? 920 : 520, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', transition: 'max-width 0.25s ease-in-out', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{modalTitle}</p>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', minHeight: 380, maxHeight: '70vh', overflow: 'hidden' }}>
          {/* Left Column: General Data */}
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>SKU</label>
                <input
                  style={{ ...inputStyle, backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)' }}
                  value={isCreate ? 'Auto-generado' : form.sku}
                  disabled={true}
                  placeholder="Auto-generado"
                />
              </div>
              <div>
                <label style={getLabelStyle('name')}>Nombre *</label>
                <input style={getInputStyle('name')} value={form.name} onChange={e => setField('name', e.target.value)} disabled={isView} placeholder="SoftTrack Pro v3 – Anual" autoFocus={isCreate} />
                {renderFieldError('name')}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 56, fontFamily: 'inherit' }}
                value={form.desc}
                onChange={e => setField('desc', e.target.value)}
                disabled={isView}
                placeholder="Licencia anual por usuario, incluye soporte 8×5"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select style={inputStyle} value={form.cat} onChange={e => setField('cat', e.target.value)} disabled={isView}>
                  {PRODUCTO_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Licencia</label>
                <select
                  style={inputStyle}
                  value={form.tipo_licencia || 'Comercial'}
                  onChange={e => {
                    const type = e.target.value;
                    const isFree = type === 'Gratuito / OpenSource';
                    setForm(prev => ({
                      ...prev,
                      tipo_licencia: type,
                      price: isFree ? '0' : prev.price === '0' ? '' : prev.price,
                      currency: isFree ? 'N/A' : prev.currency === 'N/A' ? 'USD' : prev.currency,
                      unit: isFree ? 'No aplica' : prev.unit === 'No aplica' ? '' : prev.unit
                    }));
                  }}
                  disabled={isView}
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Gratuito / OpenSource">Gratuito / OpenSource</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={getLabelStyle('price')}>Monto a cobrar (Precio) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...getInputStyle('price'), backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? '0' : '1200'}
                />
                {renderFieldError('price')}
              </div>
              <div>
                <label style={getLabelStyle('currency')}>Divisa (Moneda) *</label>
                <input
                  style={{ ...getInputStyle('currency'), backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.currency}
                  onChange={e => setField('currency', e.target.value.toUpperCase())}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'N/A' : 'Ej: USD, EUR, MXN'}
                  maxLength={8}
                />
                {renderFieldError('currency')}
              </div>
              <div>
                <label style={getLabelStyle('unit')}>Formato de cobro (Unidad) *</label>
                {showCustomUnit ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...getInputStyle('unit'), backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)', flex: 1 }}
                      value={form.unit}
                      onChange={e => setField('unit', e.target.value)}
                      disabled={isView || isFreeLicense}
                      placeholder={isFreeLicense ? 'No aplica' : 'Ej: /servidor/mes'}
                    />
                    {!isView && !isFreeLicense && (
                      <button 
                        type="button" 
                        onClick={() => { setShowCustomUnit(false); setField('unit', ''); }}
                        style={{ padding: '0 12px', borderRadius: 6, border: '1px solid var(--neutral-300)', background: 'var(--surface)', cursor: 'pointer' }}
                        title="Volver a la lista"
                      >
                        <Icon d="M6 18L18 6M6 6l12 12" w={14} color="var(--text-muted)" />
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    style={{ ...getInputStyle('unit'), backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                    value={form.unit || ''}
                    onChange={e => {
                      if (e.target.value === 'Otro') {
                        setShowCustomUnit(true);
                        setField('unit', '');
                      } else {
                        setField('unit', e.target.value);
                      }
                    }}
                    disabled={isView || isFreeLicense}
                  >
                    <option value="">Selecciona una unidad</option>
                    <option value="/usuario/mes">Por usuario al mes (/usuario/mes)</option>
                    <option value="/usuario/año">Por usuario al año (/usuario/año)</option>
                    <option value="/mes">Por mes (/mes)</option>
                    <option value="/año">Por año (/año)</option>
                    <option value="/licencia">Por licencia vitalicia (/licencia)</option>
                    <option value="/dispositivo">Por dispositivo (/dispositivo)</option>
                    <option value="/proyecto">Por proyecto (/proyecto)</option>
                    <option value="/hora">Por hora de desarrollo (/hora)</option>
                    <option value="Otro">Otro ...</option>
                  </select>
                )}
                {renderFieldError('unit')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Repositorios de GitHub</label>
                {(form.datos_adicionales?.github_repos || []).map((repo, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={repo}
                      onChange={e => {
                        const newRepos = [...(form.datos_adicionales?.github_repos || [])];
                        newRepos[i] = e.target.value;
                        setExtraField('github_repos', newRepos);
                      }}
                      disabled={isView}
                      placeholder="https://github.com/org/repo"
                    />
                    {!isView && (
                      <button
                        type="button"
                        onClick={() => {
                          const newRepos = [...(form.datos_adicionales?.github_repos || [])];
                          newRepos.splice(i, 1);
                          setExtraField('github_repos', newRepos);
                        }}
                        style={{ padding: '0 12px', borderRadius: 6, border: '1px solid var(--danger)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer' }}
                        title="Eliminar Repositorio"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
                {!isView && (
                  <button
                    type="button"
                    onClick={() => {
                      const newRepos = [...(form.datos_adicionales?.github_repos || [])];
                      newRepos.push('');
                      setExtraField('github_repos', newRepos);
                    }}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    + Añadir Repositorio
                  </button>
                )}
              </div>

              <div>
                <label style={labelStyle}>Subir Archivos (Próximamente)</label>
                <input
                  type="file"
                  multiple
                  disabled
                  style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                  title="Esta opción estará disponible próximamente"
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>
                <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={14} />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Side Panel "Más Información" */}
          {hasDynamicPanel && (
            <div style={{
              width: 380, borderLeft: '1px solid var(--neutral-200)', background: 'var(--bg-faint)',
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Más Información</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Campos requeridos para la categoría <strong>{form.cat}</strong>.</p>
              </div>

              <div style={{ width: '100%', height: '1px', background: 'var(--neutral-200)', margin: '4px 0' }} />

              {form.cat === 'Software' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormSection title="Clasificación y Detalle">
                    <div>
                      <label style={getLabelStyle('tipo_software')}>Plataforma / Formato del Software *</label>
                      <ChipSelector
                        options={TIPO_SOFTWARE_OPTIONS}
                        value={form.datos_adicionales?.tipo_software || ''}
                        onChange={val => {
                          setExtraField('tipo_software', val);
                          if (val !== 'Otro') {
                            setExtraField('tipo_software_otro', '');
                          }
                        }}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.tipo_software}
                      />
                      {renderFieldError('tipo_software')}
                    </div>
                    
                    {form.datos_adicionales?.tipo_software === 'Otro' && (
                      <div>
                        <label style={getLabelStyle('tipo_software_otro')}>Describa el software *</label>
                        <input
                          style={getInputStyle('tipo_software_otro')}
                          value={form.datos_adicionales?.tipo_software_otro || ''}
                          onChange={e => setExtraField('tipo_software_otro', e.target.value)}
                          disabled={isView}
                          placeholder="Ej. Sistema Embebido, Firmware, etc."
                        />
                        {renderFieldError('tipo_software_otro')}
                      </div>
                    )}

                    <div>
                      <label style={getLabelStyle('mas_informacion')}>Más información del Software *</label>
                      <textarea
                        style={{ ...getInputStyle('mas_informacion'), minHeight: '60px', resize: 'vertical' }}
                        value={form.datos_adicionales?.mas_informacion || ''}
                        onChange={e => setExtraField('mas_informacion', e.target.value)}
                        disabled={isView}
                        placeholder="Detalles sobre el software, funciones principales, tecnologías utilizadas, etc."
                      />
                      {renderFieldError('mas_informacion')}
                    </div>
                  </FormSection>

                  <FormSection title="Modelo de Negocio y Soporte">
                    <div>
                      <label style={getLabelStyle('modalidad_entrega')}>Modalidad de Entrega *</label>
                      <ChipSelector
                        options={MODALIDAD_ENTREGA_OPTIONS}
                        value={form.datos_adicionales?.modalidad_entrega || ''}
                        onChange={val => setExtraField('modalidad_entrega', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.modalidad_entrega}
                      />
                      {renderFieldError('modalidad_entrega')}
                    </div>

                    <div>
                      <label style={getLabelStyle('nivel_soporte')}>Nivel de Soporte *</label>
                      <ChipSelector
                        options={NIVEL_SOPORTE_OPTIONS}
                        value={form.datos_adicionales?.nivel_soporte || ''}
                        onChange={val => setExtraField('nivel_soporte', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.nivel_soporte}
                      />
                      {renderFieldError('nivel_soporte')}
                    </div>

                    <div>
                      <label style={getLabelStyle('propiedad_intelectual')}>Propiedad Intelectual *</label>
                      <ChipSelector
                        options={PROPIEDAD_INTELECTUAL_OPTIONS}
                        value={form.datos_adicionales?.propiedad_intelectual || ''}
                        onChange={val => setExtraField('propiedad_intelectual', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.propiedad_intelectual}
                      />
                      {renderFieldError('propiedad_intelectual')}
                    </div>
                  </FormSection>

                  {/* Especificaciones de Plataforma */}
                  {['App Android', 'App iOS', 'App Multiplataforma'].includes(form.datos_adicionales?.tipo_software) && (
                    <FormSection title="Especificaciones Móviles">
                      <div>
                        <label style={getLabelStyle('publicacion_tiendas')}>Publicación en Tiendas *</label>
                        <ChipSelector
                          options={PUBLICACION_TIENDAS_OPTIONS}
                          value={form.datos_adicionales?.publicacion_tiendas || ''}
                          onChange={val => setExtraField('publicacion_tiendas', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.publicacion_tiendas}
                        />
                        {renderFieldError('publicacion_tiendas')}
                      </div>
                      <div>
                        <label style={getLabelStyle('mantenimiento_so')}>Mantenimiento de Sistema Operativo *</label>
                        <ChipSelector
                          options={MANTENIMIENTO_SO_OPTIONS}
                          value={form.datos_adicionales?.mantenimiento_so || ''}
                          onChange={val => setExtraField('mantenimiento_so', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.mantenimiento_so}
                        />
                        {renderFieldError('mantenimiento_so')}
                      </div>
                    </FormSection>
                  )}

                  {['App Web', 'Servicio Backend'].includes(form.datos_adicionales?.tipo_software) && (
                    <FormSection title="Especificaciones Web / API">
                      <div>
                        <label style={getLabelStyle('alojamiento_datos')}>Alojamiento de Datos *</label>
                        <ChipSelector
                          options={ALOJAMIENTO_DATOS_OPTIONS}
                          value={form.datos_adicionales?.alojamiento_datos || ''}
                          onChange={val => setExtraField('alojamiento_datos', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.alojamiento_datos}
                        />
                        {renderFieldError('alojamiento_datos')}
                      </div>
                      <div>
                        <label style={getLabelStyle('acuerdos_nivel_servicio_sla')}>Acuerdos de Nivel de Servicio (SLA) *</label>
                        <ChipSelector
                          options={ACUERDOS_NIVEL_SERVICIO_SLA_OPTIONS}
                          value={form.datos_adicionales?.acuerdos_nivel_servicio_sla || ''}
                          onChange={val => setExtraField('acuerdos_nivel_servicio_sla', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.acuerdos_nivel_servicio_sla}
                        />
                        {renderFieldError('acuerdos_nivel_servicio_sla')}
                      </div>
                      <div>
                        <label style={getLabelStyle('limite_usuarios')}>Límite de Usuarios / Concurrencia *</label>
                        <ChipSelector
                          options={LIMITE_USUARIOS_OPTIONS}
                          value={form.datos_adicionales?.limite_usuarios || ''}
                          onChange={val => setExtraField('limite_usuarios', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.limite_usuarios}
                        />
                        {renderFieldError('limite_usuarios')}
                      </div>
                    </FormSection>
                  )}

                  {['Software Nativo PC', 'Software Nativo Mac'].includes(form.datos_adicionales?.tipo_software) && (
                    <FormSection title="Especificaciones de Escritorio">
                      <div>
                        <label style={getLabelStyle('licenciamiento_equipos')}>Licenciamiento por Equipos *</label>
                        <ChipSelector
                          options={LICENCIAMIENTO_EQUIPOS_OPTIONS}
                          value={form.datos_adicionales?.licenciamiento_equipos || ''}
                          onChange={val => setExtraField('licenciamiento_equipos', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.licenciamiento_equipos}
                        />
                        {renderFieldError('licenciamiento_equipos')}
                      </div>
                      <div>
                        <label style={getLabelStyle('distribucion')}>Distribución del Software *</label>
                        <ChipSelector
                          options={DISTRIBUCION_OPTIONS}
                          value={form.datos_adicionales?.distribucion || ''}
                          onChange={val => setExtraField('distribucion', val)}
                          disabled={isView}
                          hasError={showValidation && !!validationErrors.distribucion}
                        />
                        {renderFieldError('distribucion')}
                      </div>
                    </FormSection>
                  )}

                  {form.datos_adicionales?.tipo_software === 'Otro' && (
                    <FormSection title="Entregables">
                      <div>
                        <label style={getLabelStyle('entregables_especificos')}>Entregables Específicos *</label>
                        <textarea
                          style={{ ...getInputStyle('entregables_especificos'), minHeight: '60px', resize: 'vertical' }}
                          value={form.datos_adicionales?.entregables_especificos || ''}
                          onChange={e => setExtraField('entregables_especificos', e.target.value)}
                          disabled={isView}
                          placeholder="Detallar entregables (binarios, código fuente, manuales, hardware, etc.)"
                        />
                        {renderFieldError('entregables_especificos')}
                      </div>
                    </FormSection>
                  )}
                </div>
              )}

              {form.cat === 'Agente' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormSection title="Detalles del Agente">
                    <div>
                      <label style={getLabelStyle('tipo_agente')}>Tipo de Agente *</label>
                      <ChipSelector
                        options={[
                          { value: 'Autónomo', label: 'Autónomo', icon: '🤖' },
                          { value: 'Semiautónomo', label: 'Semiautónomo', icon: '👥' },
                          { value: 'Reactivo / Reglas', label: 'Reactivo / Reglas', icon: '⚙️' }
                        ]}
                        value={form.datos_adicionales?.tipo_agente || ''}
                        onChange={val => setExtraField('tipo_agente', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.tipo_agente}
                      />
                      {renderFieldError('tipo_agente')}
                    </div>
                    <div>
                      <label style={getLabelStyle('integracion_llm')}>Integración / LLM *</label>
                      <input
                        style={getInputStyle('integracion_llm')}
                        value={form.datos_adicionales?.integracion_llm || ''}
                        onChange={e => setExtraField('integracion_llm', e.target.value)}
                        disabled={isView}
                        placeholder="e.g. OpenAI GPT-4, Claude 3.5"
                      />
                      {renderFieldError('integracion_llm')}
                    </div>
                  </FormSection>
                </div>
              )}

              {form.cat === 'Script' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormSection title="Detalles del Script">
                    <div>
                      <label style={getLabelStyle('entorno_lenguaje')}>Entorno / Lenguaje *</label>
                      <ChipSelector
                        options={[
                          { value: 'Bash/Shell', label: 'Bash/Shell', icon: '🐚' },
                          { value: 'Python', label: 'Python', icon: '🐍' },
                          { value: 'Node.js', label: 'Node.js', icon: '🟢' },
                          { value: 'PowerShell', label: 'PowerShell', icon: '🟦' },
                          { value: 'Go/CLI', label: 'Go/CLI', icon: '🐹' }
                        ]}
                        value={form.datos_adicionales?.entorno_lenguaje || ''}
                        onChange={val => setExtraField('entorno_lenguaje', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.entorno_lenguaje}
                      />
                      {renderFieldError('entorno_lenguaje')}
                    </div>
                    <div>
                      <label style={getLabelStyle('proposito')}>Propósito *</label>
                      <ChipSelector
                        options={[
                          { value: 'Automatización', label: 'Automatización', icon: '⚙️' },
                          { value: 'Datos/ETL', label: 'Datos / ETL', icon: '📊' },
                          { value: 'DevOps', label: 'DevOps', icon: '🚀' },
                          { value: 'Scraping', label: 'Scraping / Extracción', icon: '🕷️' }
                        ]}
                        value={form.datos_adicionales?.proposito || ''}
                        onChange={val => setExtraField('proposito', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.proposito}
                      />
                      {renderFieldError('proposito')}
                    </div>
                  </FormSection>
                </div>
              )}

              {form.cat === 'Auditoría' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormSection title="Detalles de la Auditoría">
                    <div>
                      <label style={getLabelStyle('enfoque')}>Enfoque *</label>
                      <ChipSelector
                        options={[
                          { value: 'Seguridad/Pentesting', label: 'Seguridad / Pentest', icon: '🛡️' },
                          { value: 'Calidad de Código/QA', label: 'Calidad de Código / QA', icon: '🔍' },
                          { value: 'Rendimiento', label: 'Rendimiento', icon: '⚡' },
                          { value: 'Cumplimiento Normativo', label: 'Cumplimiento Normativo', icon: '⚖️' }
                        ]}
                        value={form.datos_adicionales?.enfoque || ''}
                        onChange={val => setExtraField('enfoque', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.enfoque}
                      />
                      {renderFieldError('enfoque')}
                    </div>
                  </FormSection>
                </div>
              )}

              {form.cat === 'Consultoría' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormSection title="Detalles de Consultoría">
                    <div>
                      <label style={getLabelStyle('modalidad')}>Modalidad *</label>
                      <ChipSelector
                        options={[
                          { value: 'Por Hora', label: 'Por Hora', icon: '🕒' },
                          { value: 'Por Proyecto', label: 'Por Proyecto', icon: '📁' },
                          { value: 'Asesoría Continua', label: 'Asesoría Continua', icon: '🤝' }
                        ]}
                        value={form.datos_adicionales?.modalidad || ''}
                        onChange={val => setExtraField('modalidad', val)}
                        disabled={isView}
                        hasError={showValidation && !!validationErrors.modalidad}
                      />
                      {renderFieldError('modalidad')}
                    </div>
                  </FormSection>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-faint)', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >{isView ? 'Cerrar' : 'Cancelar'}</button>
          {!isView && (
            <button
              disabled={saving}
              onClick={handleSubmit}
              style={{
                padding: '7px 16px', borderRadius: 5, border: 'none',
                background: saving ? 'var(--primary-soft)' : 'var(--primary)',
                color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                transition: 'background-color 0.15s ease'
              }}
            >{saving ? 'Guardando…' : isCreate ? 'Crear producto ✓' : 'Guardar cambios ✓'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
