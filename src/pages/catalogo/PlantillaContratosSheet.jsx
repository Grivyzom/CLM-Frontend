import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlantillaContratos } from '../../api';
import { Icon } from './ui';

const ETAPA_CFG = {
  BORRADOR:        { color: 'var(--text-muted)',    bg: 'var(--bg-faint)' },
  REVISION:        { color: 'var(--warning)',        bg: 'var(--warning-bg)' },
  APROBADO:        { color: 'var(--violet)',          bg: 'var(--violet-bg)' },
  PENDIENTE_FIRMA: { color: 'var(--warning-bright)',  bg: 'var(--warning-bg)' },
  ACTIVO:          { color: 'var(--success-deep)',    bg: 'var(--success-bg)' },
  ENMENDADO:       { color: 'var(--primary)',         bg: 'var(--primary-bg)' },
  TERMINADO:       { color: 'var(--text-faint)',      bg: 'var(--bg-faint)' },
};

function EtapaTag({ etapa, label }) {
  const c = ETAPA_CFG[etapa] || ETAPA_CFG.TERMINADO;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function formatearFecha(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Sheet: contratos que usan una versión o familia de plantilla ──────────
export default function PlantillaContratosSheet({ plantilla, familia, onClose }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plantilla && !familia) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    if (familia) {
      Promise.all(familia.versiones.map(v => getPlantillaContratos(v.id)))
        .then(results => {
          if (cancelled) return;
          let allResults = [];
          results.forEach(d => {
            allResults = allResults.concat(d.results.map(r => ({ ...r, version_usada: d.plantilla_version })));
          });
          
          const uniqueContracts = new Map();
          allResults.forEach(r => {
             if (!uniqueContracts.has(r.contrato_id)) {
                 uniqueContracts.set(r.contrato_id, r);
             } else {
                 const existing = uniqueContracts.get(r.contrato_id);
                 if (new Date(r.fecha_ultima_generacion) > new Date(existing.fecha_ultima_generacion)) {
                     uniqueContracts.set(r.contrato_id, r);
                 }
             }
          });
          let finalResults = Array.from(uniqueContracts.values());
          finalResults.sort((a, b) => new Date(b.fecha_ultima_generacion) - new Date(a.fecha_ultima_generacion));

          setData({
            plantilla_nombre: familia.representante.name,
            plantilla_version: `${familia.totalVersiones} versión(es)`,
            _raw: { codigo_prefijo: familia.prefijo },
            total_contratos: finalResults.length,
            results: finalResults,
          });
          setLoading(false);
        })
        .catch(e => {
          if (!cancelled) {
             setError(e.message || 'Error al cargar los contratos');
             setLoading(false);
          }
        });
    } else if (plantilla) {
      getPlantillaContratos(plantilla.id)
        .then(d => { if (!cancelled) setData(d); })
        .catch(e => { if (!cancelled) setError(e.message || 'Error al cargar los contratos'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => { cancelled = true; };
  }, [plantilla, familia]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!plantilla && !familia) return null;

  const titleName = data?.plantilla_nombre || (plantilla ? plantilla.name : familia?.representante?.name);
  const titleVersion = data?.plantilla_version || (plantilla ? plantilla.version : `${familia?.totalVersiones} versión(es)`);
  const titlePrefijo = data?._raw?.codigo_prefijo || (plantilla ? plantilla._raw?.codigo_prefijo : familia?.prefijo);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1140, background: 'rgba(10,10,10,0.35)' }}
      />
      <div
        role="dialog"
        aria-label={`Contratos que usan ${titleName}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,.15)', zIndex: 1150,
          display: 'flex', flexDirection: 'column', animation: 'catalogoSheetIn 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Contratos que usan esta {familia ? 'familia' : 'versión'}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {titleName}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono',monospace" }}>
              {titleVersion} · {titlePrefijo}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18, flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: 'var(--text-faint)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span style={{ fontSize: 12 }}>Cargando contratos…</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: 'var(--danger)' }}>
              <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={26} />
              <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{error}</span>
            </div>
          )}

          {!loading && !error && data?.results.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
              <Icon d={['M9 12h6', 'M9 16h6', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} w={36} color="var(--border)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Ningún contrato usa esta {familia ? 'familia' : 'versión'} todavía</span>
            </div>
          )}

          {!loading && !error && data?.results.map(c => (
            <div
              key={c.contrato_id}
              onClick={() => navigate(`/contratos/${c.contrato_id}`)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                background: 'var(--bg-faint)', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-faint)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>
                  {c.contrato_display}
                </span>
                <EtapaTag etapa={c.etapa} label={c.etapa_display} />
              </div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.nombre || c.cliente_nombre}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.cliente_nombre} · {c.software_nombre}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                  {formatearFecha(c.fecha_ultima_generacion)}{c.total_generaciones > 1 ? ` · ${c.total_generaciones}x` : ''}
                </span>
              </div>
              {c.version_usada && (
                <div style={{ marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 600, padding: '2px 6px', background: 'var(--primary-bg)', borderRadius: 4 }}>
                    Versión: {c.version_usada}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
