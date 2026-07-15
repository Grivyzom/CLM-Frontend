import { useState, useEffect } from 'react';
import { createProducto, updateProducto } from '../../api';
import { Icon } from './ui';
import { PRODUCTO_CATEGORIAS, PRODUCTO_VACIO } from './helpers';

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

  const validateDynamicFields = (cat, extra) => {
    if (cat === 'Software') {
      const isTipoValido = extra.tipo_software === 'Otro' 
        ? !!extra.tipo_software_otro?.trim() 
        : !!extra.tipo_software;
      
      let isValid = isTipoValido && 
             !!extra.mas_informacion?.trim() &&
             !!extra.modalidad_entrega &&
             !!extra.nivel_soporte &&
             !!extra.propiedad_intelectual;

      if (['App Android', 'App iOS', 'App Multiplataforma'].includes(extra.tipo_software)) {
        isValid = isValid && !!extra.publicacion_tiendas && !!extra.mantenimiento_so;
      } else if (['App Web', 'Servicio Backend'].includes(extra.tipo_software)) {
        isValid = isValid && !!extra.alojamiento_datos && !!extra.acuerdos_nivel_servicio_sla && !!extra.limite_usuarios;
      } else if (['Software Nativo PC', 'Software Nativo Mac'].includes(extra.tipo_software)) {
        isValid = isValid && !!extra.licenciamiento_equipos && !!extra.distribucion;
      } else if (extra.tipo_software === 'Otro') {
        isValid = isValid && !!extra.entregables_especificos?.trim();
      }

      return isValid;
    }
    if (cat === 'Agente') {
      return !!extra.tipo_agente && !!extra.integracion_llm?.trim();
    }
    if (cat === 'Script') {
      return !!extra.entorno_lenguaje && !!extra.proposito;
    }
    if (cat === 'Auditoría') {
      return !!extra.enfoque;
    }
    if (cat === 'Consultoría') {
      return !!extra.modalidad;
    }
    return true;
  };

  const isFreeLicense = form.tipo_licencia === 'Gratuito / OpenSource';

  const isPriceValid = isFreeLicense || (
    form.price !== '' && Number(form.price) >= 0 && form.currency.trim() && form.unit.trim()
  );

  const isDynamicValid = validateDynamicFields(form.cat, form.datos_adicionales || {});

  const isValid = form.name.trim() && isPriceValid && isDynamicValid;

  const handleSubmit = async () => {
    if (isView) return;
    if (!isValid || saving) return;
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
          width: '100%', maxWidth: hasDynamicPanel ? 860 : 520, display: 'flex', flexDirection: 'column',
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
                <label style={labelStyle}>Nombre</label>
                <input style={inputStyle} value={form.name} onChange={e => setField('name', e.target.value)} disabled={isView} placeholder="SoftTrack Pro v3 – Anual" autoFocus={isCreate} />
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
                <label style={labelStyle}>Monto a cobrar (Precio)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? '0' : '1200'}
                />
              </div>
              <div>
                <label style={labelStyle}>Divisa (Moneda)</label>
                <input
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.currency}
                  onChange={e => setField('currency', e.target.value.toUpperCase())}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'N/A' : 'Ej: USD, EUR, MXN'}
                  maxLength={8}
                />
              </div>
              <div>
                <label style={labelStyle}>Formato de cobro (Unidad)</label>
                {showCustomUnit ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)', flex: 1 }}
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
                    style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
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
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12 }}>
                <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={14} />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Side Panel "Más Información" */}
          {hasDynamicPanel && (
            <div style={{
              width: 320, borderLeft: '1px solid var(--neutral-200)', background: 'var(--bg-faint)',
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Más Información</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Campos requeridos para la categoría <strong>{form.cat}</strong>.</p>
              </div>

              <div style={{ width: '100%', height: '1px', background: 'var(--neutral-200)', margin: '4px 0' }} />

              {form.cat === 'Software' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Plataforma / Formato del Software *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.tipo_software || ''}
                      onChange={e => {
                        setExtraField('tipo_software', e.target.value);
                        if (e.target.value !== 'Otro') {
                          setExtraField('tipo_software_otro', '');
                        }
                      }}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="App Android">App Android</option>
                      <option value="App iOS">App iOS</option>
                      <option value="App Multiplataforma">App Multiplataforma</option>
                      <option value="App Web">App Web</option>
                      <option value="Software Nativo PC">Software Nativo PC</option>
                      <option value="Software Nativo Mac">Software Nativo Mac</option>
                      <option value="Servicio Backend">Servicio Backend</option>
                      <option value="Otro">Otro ...</option>
                    </select>
                  </div>
                  
                  {form.datos_adicionales?.tipo_software === 'Otro' && (
                    <div>
                      <label style={labelStyle}>Describa el software *</label>
                      <input
                        style={inputStyle}
                        value={form.datos_adicionales?.tipo_software_otro || ''}
                        onChange={e => setExtraField('tipo_software_otro', e.target.value)}
                        disabled={isView}
                        placeholder="Ej. Sistema Embebido, Firmware, etc."
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>Más información del Software *</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                      value={form.datos_adicionales?.mas_informacion || ''}
                      onChange={e => setExtraField('mas_informacion', e.target.value)}
                      disabled={isView}
                      placeholder="Detalles sobre el software, funciones principales, tecnologías utilizadas, etc."
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Modalidad de Entrega *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.modalidad_entrega || ''}
                      onChange={e => setExtraField('modalidad_entrega', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="SaaS (Cloud)">SaaS (Cloud)</option>
                      <option value="On-Premise">On-Premise</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Instalación Local">Instalación Local</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Nivel de Soporte *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.nivel_soporte || ''}
                      onChange={e => setExtraField('nivel_soporte', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Sin soporte incluido">Sin soporte incluido</option>
                      <option value="Básico (Email/Tickets)">Básico (Email/Tickets)</option>
                      <option value="Estándar (Horario Laboral)">Estándar (Horario Laboral)</option>
                      <option value="Premium (SLA 24/7)">Premium (SLA 24/7)</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Propiedad Intelectual *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.propiedad_intelectual || ''}
                      onChange={e => setExtraField('propiedad_intelectual', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Propiedad del Desarrollador (Licencia de uso)">Propiedad del Desarrollador (Licencia de uso)</option>
                      <option value="Propiedad del Cliente (Traspaso total)">Propiedad del Cliente (Traspaso total)</option>
                      <option value="Código Abierto (Open Source)">Código Abierto (Open Source)</option>
                    </select>
                  </div>

                  {['App Android', 'App iOS', 'App Multiplataforma'].includes(form.datos_adicionales?.tipo_software) && (
                    <>
                      <div>
                        <label style={labelStyle}>Publicación en Tiendas *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.publicacion_tiendas || ''}
                          onChange={e => setExtraField('publicacion_tiendas', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="A cargo del desarrollador">A cargo del desarrollador</option>
                          <option value="A cargo del cliente">A cargo del cliente</option>
                          <option value="No aplica / Distribución interna">No aplica / Distribución interna</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Mantenimiento de Sistema Operativo *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.mantenimiento_so || ''}
                          onChange={e => setExtraField('mantenimiento_so', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Incluye adaptación a nuevas versiones (1 año)">Incluye adaptación a nuevas versiones (1 año)</option>
                          <option value="No incluye adaptación">No incluye adaptación</option>
                          <option value="Mantenimiento continuo (Contrato SLA)">Mantenimiento continuo (Contrato SLA)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {['App Web', 'Servicio Backend'].includes(form.datos_adicionales?.tipo_software) && (
                    <>
                      <div>
                        <label style={labelStyle}>Alojamiento de Datos *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.alojamiento_datos || ''}
                          onChange={e => setExtraField('alojamiento_datos', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Nube del Desarrollador (SaaS)">Nube del Desarrollador (SaaS)</option>
                          <option value="Nube del Cliente (On-Premise/Cloud propia)">Nube del Cliente (On-Premise/Cloud propia)</option>
                          <option value="Tercero / PaaS">Tercero / PaaS</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Acuerdos de Nivel de Servicio (SLA) *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.acuerdos_nivel_servicio_sla || ''}
                          onChange={e => setExtraField('acuerdos_nivel_servicio_sla', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Uptime 99.9% (Garantizado)">Uptime 99.9% (Garantizado)</option>
                          <option value="Uptime 99% (Estándar)">Uptime 99% (Estándar)</option>
                          <option value="Mejor esfuerzo (Sin SLA estricto)">Mejor esfuerzo (Sin SLA estricto)</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Límite de Usuarios / Concurrencia *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.limite_usuarios || ''}
                          onChange={e => setExtraField('limite_usuarios', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Ilimitado">Ilimitado</option>
                          <option value="Por rangos (especificado en contrato)">Por rangos (especificado en contrato)</option>
                          <option value="Concurrencia limitada">Concurrencia limitada</option>
                        </select>
                      </div>
                    </>
                  )}

                  {['Software Nativo PC', 'Software Nativo Mac'].includes(form.datos_adicionales?.tipo_software) && (
                    <>
                      <div>
                        <label style={labelStyle}>Licenciamiento por Equipos *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.licenciamiento_equipos || ''}
                          onChange={e => setExtraField('licenciamiento_equipos', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Por dispositivo / MAC Address">Por dispositivo / MAC Address</option>
                          <option value="Por usuario nominal">Por usuario nominal</option>
                          <option value="Licencia global / Ilimitada">Licencia global / Ilimitada</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Distribución del Software *</label>
                        <select
                          style={inputStyle}
                          value={form.datos_adicionales?.distribucion || ''}
                          onChange={e => setExtraField('distribucion', e.target.value)}
                          disabled={isView}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Instalador ejecutable (.exe / .dmg)">Instalador ejecutable (.exe / .dmg)</option>
                          <option value="Tienda oficial (MS Store / Mac App Store)">Tienda oficial (MS Store / Mac App Store)</option>
                          <option value="Despliegue corporativo (MDM / GPO)">Despliegue corporativo (MDM / GPO)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {form.datos_adicionales?.tipo_software === 'Otro' && (
                    <div>
                      <label style={labelStyle}>Entregables Específicos *</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                        value={form.datos_adicionales?.entregables_especificos || ''}
                        onChange={e => setExtraField('entregables_especificos', e.target.value)}
                        disabled={isView}
                        placeholder="Detallar entregables (binarios, código fuente, manuales, hardware, etc.)"
                      />
                    </div>
                  )}
                </div>
              )}

              {form.cat === 'Agente' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tipo de Agente *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.tipo_agente || ''}
                      onChange={e => setExtraField('tipo_agente', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Autónomo">Autónomo</option>
                      <option value="Semiautónomo">Semiautónomo</option>
                      <option value="Reactivo / Reglas">Reactivo / Reglas</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Integración / LLM *</label>
                    <input
                      style={inputStyle}
                      value={form.datos_adicionales?.integracion_llm || ''}
                      onChange={e => setExtraField('integracion_llm', e.target.value)}
                      disabled={isView}
                      placeholder="e.g. OpenAI GPT-4, Claude 3.5"
                    />
                  </div>
                </div>
              )}

              {form.cat === 'Script' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Entorno / Lenguaje *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.entorno_lenguaje || ''}
                      onChange={e => setExtraField('entorno_lenguaje', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Bash/Shell">Bash/Shell</option>
                      <option value="Python">Python</option>
                      <option value="Node.js">Node.js</option>
                      <option value="PowerShell">PowerShell</option>
                      <option value="Go/CLI">Go/CLI</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Propósito *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.proposito || ''}
                      onChange={e => setExtraField('proposito', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Automatización">Automatización</option>
                      <option value="Datos/ETL">Datos/ETL</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Scraping">Scraping</option>
                    </select>
                  </div>
                </div>
              )}

              {form.cat === 'Auditoría' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Enfoque *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.enfoque || ''}
                      onChange={e => setExtraField('enfoque', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Seguridad/Pentesting">Seguridad/Pentesting</option>
                      <option value="Calidad de Código/QA">Calidad de Código/QA</option>
                      <option value="Rendimiento">Rendimiento</option>
                      <option value="Cumplimiento Normativo">Cumplimiento Normativo</option>
                    </select>
                  </div>
                </div>
              )}

              {form.cat === 'Consultoría' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Modalidad *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.modalidad || ''}
                      onChange={e => setExtraField('modalidad', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Por Hora">Por Hora</option>
                      <option value="Por Proyecto">Por Proyecto</option>
                      <option value="Asesoría Continua">Asesoría Continua</option>
                    </select>
                  </div>
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
              disabled={!isValid || saving}
              onClick={handleSubmit}
              style={{
                padding: '7px 16px', borderRadius: 5, border: 'none',
                background: (!isValid || saving) ? 'var(--primary-soft)' : 'var(--primary)',
                color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
                cursor: (!isValid || saving) ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}
            >{saving ? 'Guardando…' : isCreate ? 'Crear producto ✓' : 'Guardar cambios ✓'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
