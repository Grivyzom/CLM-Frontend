import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function fmtMontoCompacto(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function DeltaBadge({ deltaPct }) {
  if (deltaPct === null || deltaPct === undefined) {
    return <span className="db-trend" style={{ color: 'var(--text-muted)' }}><Minus size={10} /> nuevo</span>;
  }
  const positivo = deltaPct >= 0;
  return (
    <span className={`db-trend ${positivo ? 'color-emerald' : 'color-red'}`}>
      {positivo ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(deltaPct)}%
    </span>
  );
}

const STATS = [
  { key: 'contratos_nuevos', label: 'Contratos nuevos', fmt: (v) => v },
  { key: 'contratos_cerrados', label: 'Contratos cerrados', fmt: (v) => v },
  { key: 'valor_negociado', label: 'Valor negociado', fmt: fmtMontoCompacto },
  { key: 'clientes_nuevos', label: 'Clientes nuevos', fmt: (v) => v },
];

/**
 * Resumen semanal: semana actual vs. semana anterior. `cartera_en_riesgo_pct`
 * no lleva comparativo — el sistema no guarda snapshots históricos de cartera,
 * así que se muestra solo el valor actual en vez de un delta aproximado.
 */
export default function ResumenSemanalCard({ resumen, loading }) {
  return (
    <div className="db-panel-card">
      <p className="db-section-label">Esta semana vs. la anterior</p>
      <h3 className="db-section-title">Resumen semanal</h3>

      {loading || !resumen ? (
        <div className="db-inicio-skel">
          {[0, 1, 2, 3].map((i) => <div key={i} className="db-inicio-skel-line" />)}
        </div>
      ) : (
        <>
          <ul className="db-reco-list" style={{ gap: '0.625rem' }}>
            {STATS.map(({ key, label, fmt }) => {
              const stat = resumen[key];
              if (!stat) return null;
              return (
                <li key={key} className="db-week-stat">
                  <span className="db-week-stat-label">{label}</span>
                  <span className="db-week-stat-value">{fmt(stat.actual)}</span>
                  <DeltaBadge deltaPct={stat.delta_pct} />
                </li>
              );
            })}
          </ul>
          <div className="db-panel-footer">
            <span>Cartera en riesgo</span>
            <strong>{resumen.cartera_en_riesgo_pct}%</strong>
          </div>
        </>
      )}
    </div>
  );
}
