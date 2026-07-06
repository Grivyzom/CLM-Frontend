import React, { useState, useEffect, useRef } from 'react';
import { getClientes, exportContratos } from '../api';

function Svg({ paths = [], size = 14, color = '#7c7670', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d8d4cc',
  borderRadius: 5,
  fontSize: 12,
  fontFamily: 'inherit',
  background: '#efede8',
  color: '#3b3631',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function ExportContratosModal({ onClose }) {
  const [modo, setModo] = useState('cliente'); // 'cliente' | 'codigo'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modo cliente: buscador con autocompletado (mismo patrón que NewContractModal)
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState([]);
  const [clienteSelected, setClienteSelected] = useState(null);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteLoading, setClienteLoading] = useState(false);
  const clienteTimerRef = useRef(null);

  useEffect(() => {
    if (clienteSelected) return;
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
  }

  function clearCliente() {
    setClienteSelected(null);
    setClienteQuery('');
    setClienteResults([]);
  }

  // Modo código/nombre: texto libre
  const [codigoQuery, setCodigoQuery] = useState('');

  async function handleExport(format) {
    setError('');
    if (modo === 'cliente' && !clienteSelected) {
      setError('Selecciona un cliente de la lista.');
      return;
    }
    if (modo === 'codigo' && !codigoQuery.trim()) {
      setError('Escribe un nombre o código de contrato (ej. CTR-000041).');
      return;
    }

    setLoading(true);
    try {
      if (modo === 'cliente') {
        await exportContratos(format, { clienteId: clienteSelected.id });
      } else {
        await exportContratos(format, { search: codigoQuery.trim() });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 6, border: '1px solid #d8d4cc',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)', zIndex: 50,
        width: '90%', maxWidth: 460, overflow: 'visible',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #d8d4cc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#3b3631' }}>Exportar Contratos</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7c7670' }}>Por cliente (todos sus contratos) o por nombre/código</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: '1px solid #d8d4cc', background: '#efede8', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="#b0aaa3" size={13} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { value: 'cliente', label: 'Por Cliente' },
              { value: 'codigo', label: 'Por Nombre / Código' },
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => { setModo(opt.value); setError(''); }}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6,
                  border: modo === opt.value ? '2px solid #2563eb' : '1px solid #d8d4cc',
                  background: modo === opt.value ? 'rgba(37, 99, 235, 0.05)' : '#efede8',
                  cursor: 'pointer', fontSize: 12,
                  fontWeight: modo === opt.value ? 600 : 500,
                  color: modo === opt.value ? '#2563eb' : '#5c574f',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {modo === 'cliente' ? (
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#7c7670', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
                Cliente
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={clienteQuery}
                  onChange={e => { setClienteQuery(e.target.value); setClienteSelected(null); setClienteOpen(true); setError(''); }}
                  onFocus={() => setClienteOpen(true)}
                  placeholder="Buscar por nombre, razón social o email…"
                  style={inputStyle}
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
                      <div style={{ fontSize: 10, color: '#7c7670' }}>{c.email} · {c.id_fiscal} · {c.contratos_count} contrato(s)</div>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#b0aaa3' }}>
                Se exportan todos los contratos vinculados al cliente elegido.
              </p>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#7c7670', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'JetBrains Mono', monospace" }}>
                Nombre o código del contrato
              </label>
              <input
                type="text"
                value={codigoQuery}
                onChange={e => { setCodigoQuery(e.target.value); setError(''); }}
                placeholder="ej: CTR-000041, Recurrente, Soft1…"
                style={inputStyle}
              />
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#b0aaa3' }}>
                Busca por la nomenclatura estandarizada del contrato (CTR-XXXXXX) o por su nombre (software licenciado / tipo de contrato).
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #d8d4cc', display: 'flex', gap: 8 }}>
          <button onClick={() => handleExport('csv')} disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: 5, border: '1px solid #d8d4cc', background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Exportando…' : 'CSV'}
          </button>
          <button onClick={() => handleExport('excel')} disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: 5, border: 'none', background: loading ? '#c9c4bc' : '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Exportando…' : 'Excel'}
          </button>
        </div>
      </div>
    </>
  );
}
