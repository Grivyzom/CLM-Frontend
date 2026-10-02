import { useState, useEffect } from 'react';
import { createProducto, updateProducto, getTenants } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from './ui';
import {
  PRODUCTO_CATEGORIAS, PRODUCTO_VACIO,
  MONEDAS, MONEDA_POR_CODIGO, TASAS_REFERENCIA_FECHA,
  convertirMonto, redondearAMoneda, formatMoneda, esMonedaConocida,
} from './helpers';
import { ICONS } from './icons';

// ─── Options configuration for ChipSelector ──────────────────────────────────
const TIPO_SOFTWARE_OPTIONS = [
  { value: 'App Web', label: 'Web App', icon: ICONS.globe },
  { value: 'App Android', label: 'Android', icon: ICONS.android },
  { value: 'App iOS', label: 'iOS', icon: ICONS.apple },
  { value: 'App Multiplataforma', label: 'Híbrida', icon: ICONS.layers },
  { value: 'Software Nativo PC', label: 'Windows PC', icon: ICONS.monitor },
  { value: 'Software Nativo Mac', label: 'macOS', icon: ICONS.laptop },
  { value: 'Servicio Backend', label: 'Backend / API', icon: ICONS.server },
  { value: 'Otro', label: 'Otro', icon: ICONS.tool }
];

const MODALIDAD_ENTREGA_OPTIONS = [
  { value: 'SaaS (Cloud)', label: 'SaaS (Nube)', icon: ICONS.cloud },
  { value: 'On-Premise', label: 'On-Premise', icon: ICONS.building },
  { value: 'Híbrido', label: 'Híbrido', icon: ICONS.refresh },
  { value: 'Instalación Local', label: 'Instalación Local', icon: ICONS.hardDrive }
];

const NIVEL_SOPORTE_OPTIONS = [
  { value: 'Sin soporte incluido', label: 'Sin Soporte', icon: ICONS.ban },
  { value: 'Básico (Email/Tickets)', label: 'Básico', icon: ICONS.mail },
  { value: 'Estándar (Horario Laboral)', label: 'Estándar (9x5)', icon: ICONS.clock },
  { value: 'Premium (SLA 24/7)', label: 'Premium (24/7)', icon: ICONS.star }
];

const PROPIEDAD_INTELECTUAL_OPTIONS = [
  { value: 'Propiedad del Desarrollador (Licencia de uso)', label: 'Licencia de Uso', icon: ICONS.fileText },
  { value: 'Propiedad del Cliente (Traspaso total)', label: 'Propiedad del Cliente', icon: ICONS.briefcase },
  { value: 'Código Abierto (Open Source)', label: 'Open Source', icon: ICONS.unlock }
];

const PUBLICACION_TIENDAS_OPTIONS = [
  { value: 'A cargo del desarrollador', label: 'Por Desarrollador', icon: ICONS.rocket },
  { value: 'A cargo del cliente', label: 'Por Cliente', icon: ICONS.user },
  { value: 'No aplica / Distribución interna', label: 'No aplica', icon: ICONS.lock }
];

const MANTENIMIENTO_SO_OPTIONS = [
  { value: 'Incluye adaptación a nuevas versiones (1 año)', label: 'Incluye (1 año)', icon: ICONS.calendar },
  { value: 'No incluye adaptación', label: 'No Incluye', icon: ICONS.xCircle },
  { value: 'Mantenimiento continuo (Contrato SLA)', label: 'SLA Continuo', icon: ICONS.refresh }
];

const ALOJAMIENTO_DATOS_OPTIONS = [
  { value: 'Nube del Desarrollador (SaaS)', label: 'Nube Desarrollador', icon: ICONS.cloud },
  { value: 'Nube del Cliente (On-Premise/Cloud propia)', label: 'Nube Cliente', icon: ICONS.home },
  { value: 'Tercero / PaaS', label: 'Tercero / PaaS', icon: ICONS.building }
];

const ACUERDOS_NIVEL_SERVICIO_SLA_OPTIONS = [
  { value: 'Uptime 99.9% (Garantizado)', label: '99.9% SLA', icon: ICONS.gem },
  { value: 'Uptime 99% (Estándar)', label: '99% SLA', icon: ICONS.trendingUp },
  { value: 'Mejor esfuerzo (Sin SLA estricto)', label: 'Mejor Esfuerzo', icon: ICONS.zap }
];

const LIMITE_USUARIOS_OPTIONS = [
  { value: 'Ilimitado', label: 'Ilimitado', icon: ICONS.infinity },
  { value: 'Por rangos (especificado en contrato)', label: 'Por Rangos', icon: ICONS.barChart },
  { value: 'Concurrencia limitada', label: 'Concurrencia Lim.', icon: ICONS.alertTriangle }
];

const LICENCIAMIENTO_EQUIPOS_OPTIONS = [
  { value: 'Por dispositivo / MAC Address', label: 'Por Dispositivo', icon: ICONS.plug },
  { value: 'Por usuario nominal', label: 'Por Usuario', icon: ICONS.user },
  { value: 'Licencia global / Ilimitada', label: 'Global / Ilim.', icon: ICONS.globe }
];

const DISTRIBUCION_OPTIONS = [
  { value: 'Instalador ejecutable (.exe / .dmg)', label: 'Ejecutable', icon: ICONS.package },
  { value: 'Tienda oficial (MS Store / Mac App Store)', label: 'Tienda Oficial', icon: ICONS.store },
  { value: 'Despliegue corporativo (MDM / GPO)', label: 'MDM Corporativo', icon: ICONS.building }
];

// Helper components for visual controls
function ChipSelector({ options, value, onChange, disabled, hasError }) {
  return (
    <div className="cat-chipset" role="radiogroup">
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`cat-chip${isSelected ? ' is-selected' : ''}${hasError && !isSelected ? ' has-error' : ''}`}
          >
            {opt.icon && (
              <Icon
                d={opt.icon}
                w={12}
                color={isSelected ? 'var(--primary)' : 'var(--text-faint)'}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Selector de divisa: monedas de primera clase + entrada libre para el resto.
function CurrencySelector({ value, onChange, onCustomChange, disabled, hasError, custom, onCustomToggle }) {
  return (
    <div className="cat-currency">
      <div className={`cat-currency-seg${hasError ? ' has-error' : ''}`} role="radiogroup" aria-label="Moneda">
        {MONEDAS.map(m => {
          const isSelected = !custom && m.code === value;
          return (
            <button
              key={m.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              title={m.label}
              onClick={() => onChange(m.code)}
              className={`cat-currency-opt${isSelected ? ' is-selected' : ''}`}
            >
              <span className="cat-currency-sym">{m.symbol}</span>
              {m.code}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          disabled={disabled}
          title="Otra divisa"
          onClick={() => onCustomToggle(true)}
          className={`cat-currency-opt${custom ? ' is-selected' : ''}`}
        >
          Otra
        </button>
      </div>
      {custom && (
        <div className="cat-currency-custom">
          <input
            value={value}
            onChange={e => onCustomChange(e.target.value.toUpperCase().slice(0, 8))}
            disabled={disabled}
            placeholder="Ej: MXN, ARS, GBP"
            aria-label="Código de divisa personalizado"
          />
          {!disabled && (
            <button type="button" onClick={() => onCustomToggle(false)} title="Volver a las monedas frecuentes">
              <Icon d={ICONS.x} w={12} color="var(--text-muted)" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Resumen en vivo del precio: monto formateado en su moneda + equivalencias.
function PricePreview({ price, currency, unit, isFree }) {
  if (isFree) {
    return (
      <div className="cat-price-preview is-free">
        <Icon d={ICONS.gift} w={13} color="var(--success-deep)" />
        <span className="cat-price-preview-main">Gratuito / OpenSource</span>
        <span className="cat-price-preview-note">Sin monto ni divisa asociada</span>
      </div>
    );
  }

  const n = Number(price);
  const tieneMonto = price !== '' && price !== null && Number.isFinite(n);

  if (!tieneMonto) {
    return (
      <div className="cat-price-preview is-empty">
        <Icon d={ICONS.info} w={13} color="var(--text-faint)" />
        <span>Ingresa un monto para ver el precio formateado y sus equivalencias.</span>
      </div>
    );
  }

  const equivalencias = esMonedaConocida(currency)
    ? MONEDAS.filter(m => m.code !== String(currency).toUpperCase()).map(m => ({
        code: m.code,
        texto: formatMoneda(redondearAMoneda(convertirMonto(n, currency, m.code), m.code), m.code),
      }))
    : [];

  return (
    <div className="cat-price-preview">
      <div className="cat-price-preview-row">
        <span className="cat-price-preview-main">
          {formatMoneda(n, currency)}
          <em>{String(currency || '').toUpperCase()}</em>
          {unit && <small>{unit}</small>}
        </span>
      </div>
      {equivalencias.length > 0 ? (
        <div className="cat-price-preview-row cat-price-preview-eq">
          <Icon d={ICONS.arrowRightLeft} w={11} color="var(--text-faint)" />
          {equivalencias.map(eq => (
            <span key={eq.code} className="cat-price-eq-chip">
              ≈ {eq.texto} <em>{eq.code}</em>
            </span>
          ))}
          <span className="cat-price-preview-note" title={`Tasas de referencia al ${TASAS_REFERENCIA_FECHA}. Solo orientativas: el contrato se emite en la moneda seleccionada.`}>
            tasas ref. {TASAS_REFERENCIA_FECHA}
          </span>
        </div>
      ) : (
        <div className="cat-price-preview-row">
          <span className="cat-price-preview-note">Divisa sin tasa de referencia: no se calculan equivalencias.</span>
        </div>
      )}
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
  const { user } = useAuth();

  const [tenants, setTenants] = useState([]);
  useEffect(() => {
    if (user?.isSuperadmin && isCreate) {
      getTenants().then(res => setTenants(res.results || res || [])).catch(() => {});
    }
  }, [user?.isSuperadmin, isCreate]);

  const [localForm, setLocalForm] = useState(() => {
    if (product) {
      return {
        ...PRODUCTO_VACIO,
        ...product,
        tipo_licencia: product.tipo_licencia || 'Comercial',
        datos_adicionales: product.datos_adicionales || {},
        tenant_id: product.tenant_id || '',
        tenant_nombre: product.tenant_nombre || '',
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

  // Divisa: las monedas frecuentes van en el segmentado; cualquier otra abre
  // la entrada libre.
  const [showCustomCurrency, setShowCustomCurrency] = useState(() => {
    const c = String(product?.currency || createForm?.currency || '').toUpperCase();
    return !!c && c !== 'N/A' && !esMonedaConocida(c);
  });

  // Última conversión aplicada al cambiar de divisa, para poder deshacerla.
  const [conversionInfo, setConversionInfo] = useState(null);

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

  /**
   * Cambiar de divisa reexpresa el monto con las tasas de referencia (si ambas
   * monedas están tarifadas) en lugar de dejar el número anterior, que ya no
   * significaría lo mismo. La conversión es reversible con «Deshacer».
   */
  const handleCurrencyChange = (code) => {
    const anterior = String(form.currency || '').toUpperCase();
    const nuevo = String(code || '').toUpperCase();
    if (anterior === nuevo) return;

    const convertido = form.price === '' ? null : convertirMonto(form.price, anterior, nuevo);
    if (convertido === null) {
      setForm(prev => ({ ...prev, currency: nuevo }));
      setConversionInfo(null);
      return;
    }

    const montoRedondeado = redondearAMoneda(convertido, nuevo);
    setForm(prev => ({ ...prev, currency: nuevo, price: String(montoRedondeado) }));
    setConversionInfo({ desde: anterior, hacia: nuevo, montoPrevio: form.price });
  };

  const deshacerConversion = () => {
    if (!conversionInfo) return;
    setForm(prev => ({ ...prev, currency: conversionInfo.desde, price: conversionInfo.montoPrevio }));
    setShowCustomCurrency(!esMonedaConocida(conversionInfo.desde));
    setConversionInfo(null);
  };

  const getValidationErrors = () => {
    const errs = {};
    if (user?.isSuperadmin && isCreate && !form.tenant_id) {
      errs.tenant_id = 'Debes seleccionar una empresa (tenant)';
    }
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
      if (user?.isSuperadmin && isCreate && form.tenant_id) {
        payload.tenant_id = form.tenant_id;
      }

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
            aria-label="Cerrar"
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Icon d={ICONS.x} w={15} color="currentColor" />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', minHeight: 380, maxHeight: '70vh', overflow: 'hidden' }}>
          {/* Left Column: General Data */}
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            {/* Tenant — solo Superadmin creando (no pertenece a ningún tenant propio) */}
            {user?.isSuperadmin && isCreate && (
              <div>
                <label style={getLabelStyle('tenant_id')}>Empresa (tenant) *</label>
                <select
                  style={getInputStyle('tenant_id')}
                  value={form.tenant_id || ''}
                  onChange={e => setField('tenant_id', e.target.value)}
                  disabled={isView}
                >
                  <option value="">-- Seleccionar empresa --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.razon_social}</option>
                  ))}
                </select>
                {renderFieldError('tenant_id')}
              </div>
            )}
            {/* Tenant — Superadmin visualizando o editando */}
            {user?.isSuperadmin && !isCreate && (form.tenant_nombre || form.tenant_id) && (
              <div>
                <label style={labelStyle}>Empresa (tenant)</label>
                <input
                  style={{ ...inputStyle, backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)' }}
                  value={form.tenant_nombre || `Tenant #${form.tenant_id}`}
                  disabled={true}
                />
              </div>
            )}

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
                      currency: isFree ? 'N/A' : prev.currency === 'N/A' ? 'CLP' : prev.currency,
                      unit: isFree ? 'No aplica' : prev.unit === 'No aplica' ? '' : prev.unit
                    }));
                    setConversionInfo(null);
                    if (isFree) setShowCustomCurrency(false);
                  }}
                  disabled={isView}
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Gratuito / OpenSource">Gratuito / OpenSource</option>
                </select>
              </div>
            </div>

            <div className={`cat-price-block${isFreeLicense ? ' is-free' : ''}`}>
              <div className="cat-price-block-grid">
                <div>
                  <label style={getLabelStyle('price')}>Monto a cobrar (Precio) *</label>
                  <div className={`cat-amount-field${(showValidation && validationErrors.price) ? ' has-error' : ''}${(isView || isFreeLicense) ? ' is-readonly' : ''}`}>
                    <span className="cat-amount-symbol">
                      {isFreeLicense ? '—' : (MONEDA_POR_CODIGO[String(form.currency || '').toUpperCase()]?.symbol || String(form.currency || '$').slice(0, 3))}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={MONEDA_POR_CODIGO[String(form.currency || '').toUpperCase()]?.decimals === 0 ? '1' : '0.01'}
                      inputMode="decimal"
                      value={form.price}
                      onChange={e => { setField('price', e.target.value); setConversionInfo(null); }}
                      disabled={isView || isFreeLicense}
                      placeholder={isFreeLicense ? '0' : '1200'}
                    />
                  </div>
                  {renderFieldError('price')}
                </div>
                <div>
                  <label style={getLabelStyle('currency')}>Divisa (Moneda) *</label>
                  <CurrencySelector
                    value={isFreeLicense ? 'N/A' : (form.currency || '')}
                    onChange={handleCurrencyChange}
                    onCustomChange={(code) => { setField('currency', code); setConversionInfo(null); }}
                    disabled={isView || isFreeLicense}
                    hasError={showValidation && !!validationErrors.currency}
                    custom={showCustomCurrency && !isFreeLicense}
                    onCustomToggle={(on) => {
                      setShowCustomCurrency(on);
                      if (!on) handleCurrencyChange('CLP');
                      else setConversionInfo(null);
                    }}
                  />
                  {renderFieldError('currency')}
                </div>
              </div>

              {conversionInfo && !isView && (
                <div className="cat-conversion-note">
                  <Icon d={ICONS.arrowRightLeft} w={12} color="var(--primary)" />
                  <span>
                    Monto reexpresado de <strong>{formatMoneda(conversionInfo.montoPrevio, conversionInfo.desde)} {conversionInfo.desde}</strong> a{' '}
                    <strong>{formatMoneda(form.price, conversionInfo.hacia)} {conversionInfo.hacia}</strong> con tasas de referencia.
                  </span>
                  <button type="button" onClick={deshacerConversion}>
                    <Icon d={ICONS.rotateLeft} w={11} color="currentColor" />
                    Deshacer
                  </button>
                </div>
              )}

              <PricePreview price={form.price} currency={form.currency} unit={form.unit} isFree={isFreeLicense} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
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
                          { value: 'Autónomo', label: 'Autónomo', icon: ICONS.bot },
                          { value: 'Semiautónomo', label: 'Semiautónomo', icon: ICONS.users },
                          { value: 'Reactivo / Reglas', label: 'Reactivo / Reglas', icon: ICONS.sliders }
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
                          { value: 'Bash/Shell', label: 'Bash/Shell', icon: ICONS.terminal },
                          { value: 'Python', label: 'Python', icon: ICONS.code },
                          { value: 'Node.js', label: 'Node.js', icon: ICONS.hexagon },
                          { value: 'PowerShell', label: 'PowerShell', icon: ICONS.terminalBox },
                          { value: 'Go/CLI', label: 'Go/CLI', icon: ICONS.chevronsRight }
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
                          { value: 'Automatización', label: 'Automatización', icon: ICONS.settings },
                          { value: 'Datos/ETL', label: 'Datos / ETL', icon: ICONS.database },
                          { value: 'DevOps', label: 'DevOps', icon: ICONS.rocket },
                          { value: 'Scraping', label: 'Scraping / Extracción', icon: ICONS.search }
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
                          { value: 'Seguridad/Pentesting', label: 'Seguridad / Pentest', icon: ICONS.shield },
                          { value: 'Calidad de Código/QA', label: 'Calidad de Código / QA', icon: ICONS.search },
                          { value: 'Rendimiento', label: 'Rendimiento', icon: ICONS.zap },
                          { value: 'Cumplimiento Normativo', label: 'Cumplimiento Normativo', icon: ICONS.scale }
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
                          { value: 'Por Hora', label: 'Por Hora', icon: ICONS.clock },
                          { value: 'Por Proyecto', label: 'Por Proyecto', icon: ICONS.folder },
                          { value: 'Asesoría Continua', label: 'Asesoría Continua', icon: ICONS.handshake }
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
                transition: 'background-color 0.15s ease',
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              {!saving && <Icon d={['M20 6 9 17l-5-5']} w={13} color="currentColor" />}
              {saving ? 'Guardando…' : isCreate ? 'Crear producto' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
