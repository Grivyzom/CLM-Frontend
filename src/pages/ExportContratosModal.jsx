import React, { useState, useEffect, useRef } from 'react';
import { getClientes, exportContratos } from '../api';
import './Contratos.css';

function Svg({ paths = [], size = 14, color = 'var(--text-muted)', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export default function ExportContratosModal({ onClose }) {
  const [modo, setModo] = useState('cliente'); // 'cliente' | 'codigo'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cerrar con Escape (salvo mientras exporta)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loading, onClose]);

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
      <div className="ctm-backdrop" onClick={onClose} />
      <div className="ctm-panel ctm-panel-sm" role="dialog" aria-modal="true" aria-label="Exportar contratos">
        <div className="ctm-header">
          <div>
            <h2 className="ctm-title">Exportar Contratos</h2>
            <p className="ctm-subtitle">Por cliente (todos sus contratos) o por nombre/código</p>
          </div>
          <button className="ctm-close" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" size={13} />
          </button>
        </div>

        <div className="ctm-body ctm-body--pt ctm-body--free">
          <div className="ctm-mode-row">
            {[
              { value: 'cliente', label: 'Por Cliente' },
              { value: 'codigo', label: 'Por Nombre / Código' },
            ].map(opt => (
              <button key={opt.value} type="button"
                className={`ctm-mode-btn${modo === opt.value ? ' active' : ''}`}
                onClick={() => { setModo(opt.value); setError(''); }}>
                {opt.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="ct-alert-error ctm-alert" role="alert">{error}</div>
          )}

          {modo === 'cliente' ? (
            <div className="ctm-rel">
              <label className="ctm-label">Cliente</label>
              <div className="ctm-rel">
                <input
                  type="text"
                  autoFocus
                  value={clienteQuery}
                  onChange={e => { setClienteQuery(e.target.value); setClienteSelected(null); setClienteOpen(true); setError(''); }}
                  onFocus={() => setClienteOpen(true)}
                  placeholder="Buscar por nombre, razón social o email…"
                  className="ctm-control"
                />
                {clienteSelected && (
                  <button type="button" className="ctm-clear" title="Quitar cliente" aria-label="Quitar cliente" onClick={clearCliente}>
                    <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" size={12} />
                  </button>
                )}
              </div>
              {clienteOpen && !clienteSelected && clienteQuery.trim().length >= 2 && (
                <div className="ctm-dropdown">
                  {clienteLoading && <div className="ctm-dropdown-note">Buscando…</div>}
                  {!clienteLoading && clienteResults.length === 0 && (
                    <div className="ctm-dropdown-note">Sin resultados</div>
                  )}
                  {!clienteLoading && clienteResults.map(c => (
                    <div key={c.id} className="ctm-dropdown-item"
                      title={c.nombre_comercial || c.razon_social}
                      onClick={() => pickCliente(c)}>
                      <div className="ctm-dropdown-item-name">{c.nombre_comercial || c.razon_social}</div>
                      <div className="ctm-dropdown-item-meta">{c.email} · {c.id_fiscal} · {c.contratos_count} contrato(s)</div>
                    </div>
                  ))}
                </div>
              )}
              <p className="ctm-hint">
                Se exportan todos los contratos vinculados al cliente elegido.
              </p>
            </div>
          ) : (
            <div>
              <label className="ctm-label">Nombre o código del contrato</label>
              <input
                type="text"
                autoFocus
                value={codigoQuery}
                onChange={e => { setCodigoQuery(e.target.value); setError(''); }}
                placeholder="ej: CTR-000041, Recurrente, Soft1…"
                className="ctm-control"
              />
              <p className="ctm-hint">
                Busca por la nomenclatura estandarizada del contrato (CTR-XXXXXX) o por su nombre (software licenciado / tipo de contrato).
              </p>
            </div>
          )}
        </div>

        <div className="ctm-footer">
          <button className="ct-btn-secondary ctm-grow" onClick={() => handleExport('csv')} disabled={loading}>
            {loading ? 'Exportando…' : 'CSV'}
          </button>
          <button className="ct-btn-primary ctm-grow" onClick={() => handleExport('excel')} disabled={loading}>
            {loading ? 'Exportando…' : 'Excel'}
          </button>
        </div>
      </div>
    </>
  );
}
