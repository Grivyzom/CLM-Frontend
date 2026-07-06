import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createContrato, getClientes, getSoftwareList, getSLAs } from '../api';

const TIPO_CONTRATO_OPTIONS = [
  { value: 'RECURRENTE', label: 'Recurrente' },
  { value: 'PERPETUO', label: 'Perpetuo' },
  { value: 'PRO_BONO', label: 'Pro Bono' },
  { value: 'INTERNO', label: 'Interno / Propio' },
];

const FRECUENCIA_OPTIONS = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'ANUAL', label: 'Anual' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Svg({ paths = [], size = 14, color = '#7c7670', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#7c7670', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
      {children} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
  );
}

const inputStyle = (error) => ({
  width: '100%',
  padding: '8px 12px',
  border: error ? '1px solid #fca5a5' : '1px solid #d8d4cc',
  borderRadius: 5,
  fontSize: 12,
  fontFamily: 'inherit',
  background: error ? '#fef2f2' : '#efede8',
  color: '#3b3631',
  outline: 'none',
  boxSizing: 'border-box',
});

function TextField({ label, name, type = 'text', value, onChange, error, placeholder, required, ...rest }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle(error)}
        {...rest}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, error, required, options, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <select name={name} value={value} onChange={onChange} style={inputStyle(error)}>
        <option value="">{placeholder || 'Seleccionar…'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

export default function NewContractModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    software_id: '',
    sla_id: '',
    tipo_contrato: 'RECURRENTE',
    frecuencia_facturacion: 'MENSUAL',
    monto: '',
    fecha_inicio: todayISO(),
    fecha_vencimiento: '',
    dias_gracia_autorizados: '0',
  });

  // ── Cliente: buscador con autocompletado ──────────────────────────────────
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState([]);
  const [clienteSelected, setClienteSelected] = useState(null);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteLoading, setClienteLoading] = useState(false);
  const clienteTimerRef = useRef(null);

  useEffect(() => {
    if (clienteSelected) return; // ya hay uno elegido, no buscar
    if (clienteTimerRef.current) clearTimeout(clienteTimerRef.current);
    if (clienteQuery.trim().length < 2) {
      setClienteResults([]);
      return;
    }
    clienteTimerRef.current = setTimeout(async () => {
      setClienteLoading(true);
      try {
        const res = await getClientes({ search: clienteQuery.trim(), page_size: 8 });
        setClienteResults(res.results || []);
      } catch (_) {
        setClienteResults([]);
      } finally {
        setClienteLoading(false);
      }
    }, 300);
    return () => clearTimeout(clienteTimerRef.current);
  }, [clienteQuery, clienteSelected]);

  function pickCliente(c) {
    setClienteSelected(c);
    setClienteQuery(c.nombre_comercial || c.razon_social || '');
    setClienteOpen(false);
    if (errors.cliente_id) setErrors(e => ({ ...e, cliente_id: '' }));
  }

  function clearCliente() {
    setClienteSelected(null);
    setClienteQuery('');
    setClienteResults([]);
  }

  // ── Software / SLA: catálogos ──────────────────────────────────────────────
  const [softwareList, setSoftwareList] = useState([]);
  const [slaList, setSlaList] = useState([]);

  useEffect(() => {
    getSoftwareList().then(setSoftwareList).catch(() => setSoftwareList([]));
    getSLAs().then(setSlaList).catch(() => setSlaList([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};

    if (!clienteSelected) newErrors.cliente_id = 'Selecciona un cliente';
    if (!form.software_id) newErrors.software_id = 'Selecciona un software';
    if (!form.sla_id) newErrors.sla_id = 'Selecciona un SLA';

    const montoNum = parseFloat(form.monto);
    if (form.monto === '' || isNaN(montoNum) || montoNum < 0) {
      newErrors.monto = 'Monto inválido';
    }

    if (!form.fecha_inicio) newErrors.fecha_inicio = 'Fecha de inicio requerida';

    if (form.fecha_vencimiento && form.fecha_inicio && form.fecha_vencimiento < form.fecha_inicio) {
      newErrors.fecha_vencimiento = 'Debe ser posterior a la fecha de inicio';
    }

    if (form.tipo_contrato === 'RECURRENTE' && !form.frecuencia_facturacion) {
      newErrors.frecuencia_facturacion = 'Requerido para contratos recurrentes';
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
        cliente_id: clienteSelected.id,
        software_id: form.software_id,
        sla_id: form.sla_id,
        tipo_contrato: form.tipo_contrato,
        monto: form.monto,
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: form.fecha_vencimiento || null,
        dias_gracia_autorizados: parseInt(form.dias_gracia_autorizados, 10) || 0,
      };
      if (form.tipo_contrato === 'RECURRENTE') {
        payload.frecuencia_facturacion = form.frecuencia_facturacion;
      }

      const nuevo = await createContrato(payload);
      onSuccess?.(nuevo);
      onClose();
    } catch (err) {
      setErrors(er => ({ ...er, submit: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 40, animation: 'fadeIn 0.15s ease-out' }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 6, border: '1px solid #d8d4cc',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)', zIndex: 50,
        width: '90%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto',
        animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #d8d4cc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#3b3631' }}>Nuevo Contrato</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7c7670' }}>Se crea en etapa Borrador</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: '1px solid #d8d4cc', background: '#efede8', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="#b0aaa3" size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errors.submit && (
            <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, display: 'flex', gap: 8, marginBottom: 16, fontSize: 12, color: '#dc2626' }}>
              <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="#dc2626" size={14} />
              {errors.submit}
            </div>
          )}

          {/* Cliente */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <FieldLabel required>Cliente</FieldLabel>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={clienteQuery}
                onChange={e => { setClienteQuery(e.target.value); setClienteSelected(null); setClienteOpen(true); if (errors.cliente_id) setErrors(er => ({ ...er, cliente_id: '' })); }}
                onFocus={() => setClienteOpen(true)}
                placeholder="Buscar por nombre, razón social o email…"
                style={inputStyle(errors.cliente_id)}
              />
              {clienteSelected && (
                <button type="button" onClick={clearCliente} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}>
                  <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="#b0aaa3" size={12} />
                </button>
              )}
            </div>
            {clienteOpen && !clienteSelected && clienteQuery.trim().length >= 2 && (
              <div style={{ position: 'absolute', zIndex: 60, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #d8d4cc', borderRadius: 6, boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                {clienteLoading && <div style={{ padding: 10, fontSize: 11, color: '#7c7670' }}>Buscando…</div>}
                {!clienteLoading && clienteResults.length === 0 && (
                  <div style={{ padding: 10, fontSize: 11, color: '#7c7670' }}>Sin resultados</div>
                )}
                {!clienteLoading && clienteResults.map(c => (
                  <div key={c.id} onClick={() => pickCliente(c)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#3b3631', borderBottom: '1px solid #efede8' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: 600 }}>{c.nombre_comercial || c.razon_social}</div>
                    <div style={{ fontSize: 10, color: '#7c7670' }}>{c.email} · {c.id_fiscal}</div>
                  </div>
                ))}
              </div>
            )}
            {errors.cliente_id && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#dc2626' }}>{errors.cliente_id}</p>}
          </div>

          {/* Software + SLA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SelectField
              label="Software"
              name="software_id"
              value={form.software_id}
              onChange={handleChange}
              error={errors.software_id}
              required
              placeholder="Producto licenciado"
              options={softwareList.map(s => ({ value: s.id, label: s.nombre }))}
            />
            <SelectField
              label="SLA"
              name="sla_id"
              value={form.sla_id}
              onChange={handleChange}
              error={errors.sla_id}
              required
              placeholder="Nivel de servicio"
              options={slaList.map(s => ({ value: s.id, label: s.nombre }))}
            />
          </div>

          {/* Tipo de contrato + frecuencia */}
          <div style={{ display: 'grid', gridTemplateColumns: form.tipo_contrato === 'RECURRENTE' ? '1fr 1fr' : '1fr', gap: 12 }}>
            <SelectField
              label="Tipo de Contrato"
              name="tipo_contrato"
              value={form.tipo_contrato}
              onChange={handleChange}
              error={errors.tipo_contrato}
              required
              options={TIPO_CONTRATO_OPTIONS}
            />
            {form.tipo_contrato === 'RECURRENTE' && (
              <SelectField
                label="Frecuencia de Facturación"
                name="frecuencia_facturacion"
                value={form.frecuencia_facturacion}
                onChange={handleChange}
                error={errors.frecuencia_facturacion}
                required
                options={FRECUENCIA_OPTIONS}
              />
            )}
          </div>

          {/* Monto */}
          <TextField
            label={form.tipo_contrato === 'RECURRENTE' ? `Monto por ciclo (${form.frecuencia_facturacion === 'ANUAL' ? 'anual' : 'mensual'})` : 'Monto'}
            name="monto"
            type="number"
            step="0.01"
            min="0"
            value={form.monto}
            onChange={handleChange}
            error={errors.monto}
            placeholder="ej: 1500.00"
            required
          />

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextField
              label="Fecha de Inicio"
              name="fecha_inicio"
              type="date"
              value={form.fecha_inicio}
              onChange={handleChange}
              error={errors.fecha_inicio}
              required
            />
            <TextField
              label="Fecha de Vencimiento"
              name="fecha_vencimiento"
              type="date"
              value={form.fecha_vencimiento}
              onChange={handleChange}
              error={errors.fecha_vencimiento}
              placeholder="Opcional"
            />
          </div>

          <TextField
            label="Días de Gracia Autorizados"
            name="dias_gracia_autorizados"
            type="number"
            min="0"
            value={form.dias_gracia_autorizados}
            onChange={handleChange}
            error={errors.dias_gracia_autorizados}
          />
        </form>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #d8d4cc', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 5, border: '1px solid #d8d4cc', background: '#efede8', color: '#5c574f', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: 5, border: 'none', background: loading ? '#c9c4bc' : '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Creando…' : 'Crear Contrato'}
          </button>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        `}</style>
      </div>
    </>
  );
}
