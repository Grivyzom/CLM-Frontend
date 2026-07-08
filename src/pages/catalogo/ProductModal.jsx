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
      return !!extra.tipo_software;
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
                <label style={labelStyle}>Precio</label>
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
                <label style={labelStyle}>Moneda</label>
                <input
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.currency}
                  onChange={e => setField('currency', e.target.value.toUpperCase())}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'N/A' : 'USD'}
                  maxLength={8}
                />
              </div>
              <div>
                <label style={labelStyle}>Unidad</label>
                <input
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'No aplica' : '/usuario/año'}
                />
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
                    <label style={labelStyle}>Tipo de Software *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.tipo_software || ''}
                      onChange={e => setExtraField('tipo_software', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="App Android">App Android</option>
                      <option value="App Multiplataforma">App Multiplataforma</option>
                      <option value="App Web">App Web</option>
                      <option value="Software Nativo PC">Software Nativo PC</option>
                    </select>
                  </div>
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
