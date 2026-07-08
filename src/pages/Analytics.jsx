import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import TopbarActions from '../components/layout/TopbarActions';
import './Dashboard.css';
import './Analytics.css';

// Ramp ordinal reutilizado del dashboard (claro → oscuro) para la mezcla por tipo.
const TIPO_COLORS = ['var(--chart-pipeline-1)', 'var(--chart-pipeline-2)', 'var(--primary)', 'var(--chart-pipeline-4)'];

// Estado de cobranza (status del contrato, no etapa) → color de riesgo.
const ESTADO_COLOR = {
  ACTIVO: 'var(--success)',
  GRACIA: 'var(--warning)',
  MORA: 'var(--danger)',
  SUSPENDIDO: 'var(--danger-deep)',
};
const ESTADO_BADGE_CLASS = {
  MORA: 'db-status-danger',
  SUSPENDIDO: 'db-status-danger',
  GRACIA: 'db-status-warning',
};

// ── Formato ──────────────────────────────────────────────────────────────────

function fmtCLP(value) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function fmtCompact(value) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return fmtCLP(value);
}

// ── Tooltips Recharts ────────────────────────────────────────────────────────

function FlujoTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      <div className="db-tooltip-items">
        {payload.map((entry) => (
          <div key={entry.name} className="db-tooltip-item">
            <span className="db-tooltip-dot" style={{ backgroundColor: entry.color }}></span>
            <span className="db-tooltip-name">{entry.name}</span>
            <span className="db-tooltip-value">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VencimientosTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const punto = payload[0].payload;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      <div className="db-tooltip-items">
        <div className="db-tooltip-item">
          <span className="db-tooltip-name">Monto</span>
          <span className="db-tooltip-value">{fmtCLP(punto.monto)}</span>
        </div>
        <div className="db-tooltip-item">
          <span className="db-tooltip-name">Contratos</span>
          <span className="db-tooltip-value">{punto.count}</span>
        </div>
      </div>
    </div>
  );
}

// ── Exportación CSV ──────────────────────────────────────────────────────────

function downloadAnalyticsCSV({ kpis, salud_cartera, reincidencia_perdonazos, por_software, top_clientes, por_tipo, por_sla }) {
  const rows = [
    ['Sección', 'Concepto', 'Monto', 'Detalle'],
    ['KPI', 'Valor cartera activa', fmtCLP(kpis.valor_cartera.value), `${kpis.valor_cartera.contratos} contratos`],
    ['KPI', 'ARR', fmtCLP(kpis.arr.value), '12 × MRR vigente'],
    ['KPI', 'Ticket promedio', fmtCLP(kpis.ticket_promedio.value), 'por contrato activo'],
    ['KPI', 'Duración media', `${kpis.duracion_media.value} meses`, 'contratos con vencimiento'],
    ['KPI', 'Mix recurrente', `${kpis.mix_recurrente.value}%`, 'del monto de cartera'],
    ['Salud cobranza', '% cartera en riesgo', `${salud_cartera.pct_riesgo}%`, fmtCLP(salud_cartera.monto_riesgo)],
    ...salud_cartera.por_estado.map((e) => ['Salud cobranza', e.label, fmtCLP(e.monto), `${e.count} contrato(s)`]),
    ...salud_cartera.contratos_riesgo.map((c) => ['Contrato en riesgo', `${c.cliente} — ${c.software}`, fmtCLP(c.monto), `${c.estado_label} · ${c.dias_vencido} días vencido`]),
    ...reincidencia_perdonazos.top_reincidentes.map((r) => ['Perdonazo reincidente', r.cliente, '', `${r.count} perdonazo(s) · ${r.dias_totales} días · ${r.contratos} contrato(s)`]),
    ...por_software.map((s) => ['Software', s.nombre, fmtCLP(s.monto), `${s.count} contrato(s)`]),
    ...top_clientes.map((c) => ['Cliente', c.nombre, fmtCLP(c.monto), `${c.count} contrato(s)`]),
    ...por_tipo.map((t) => ['Tipo contrato', t.label, fmtCLP(t.monto), `${t.count} contrato(s)`]),
    ...por_sla.map((s) => ['SLA', s.nombre, fmtCLP(s.monto), `${s.count} contrato(s)`]),
  ];
  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `clm-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="db-error-wrap">
      <div className="db-error-box">
        <AlertTriangle size={14} />
        <span>{message}</span>
      </div>
      <button className="db-action-btn" onClick={onRetry}>Reintentar</button>
    </div>
  );
}

// ── Lista de barras horizontales (concentración / mezcla) ────────────────────

function HBarList({ items, maxValue, color, colorByIndex }) {
  return (
    <div className="db-hbar-list">
      {items.map((item, i) => (
        <div
          key={item.nombre}
          className="db-hbar-row an-hbar-row"
          title={`${item.nombre}: ${item.count} contrato(s) · ${fmtCLP(item.monto)}`}
        >
          <span className="db-hbar-label">{item.nombre}</span>
          <div className="db-hbar-track">
            <div
              className="db-hbar-fill"
              style={{
                width: `${(item.monto / maxValue) * 100}%`,
                backgroundColor: colorByIndex ? colorByIndex[i % colorByIndex.length] : color,
              }}
            ></div>
          </div>
          <span className="db-hbar-value">{item.count}</span>
          <span className="db-hbar-amount">{item.monto > 0 ? fmtCompact(item.monto) : '—'}</span>
        </div>
      ))}
    </div>
  );
}

// ── Reincidencia de perdonazos (riesgo de churn) ─────────────────────────────

function PerdonazosList({ items }) {
  const maxDias = Math.max(1, ...items.map((i) => i.dias_totales));
  return (
    <div className="db-hbar-list">
      {items.map((it) => (
        <div
          key={it.cliente_id}
          className="db-hbar-row an-hbar-row"
          title={`${it.count} perdonazo(s) · ${it.dias_totales} días extendidos · ${it.contratos} contrato(s)`}
        >
          <span className="db-hbar-label">{it.cliente}</span>
          <div className="db-hbar-track">
            <div
              className="db-hbar-fill"
              style={{
                width: `${(it.dias_totales / maxDias) * 100}%`,
                backgroundColor: it.reincidente ? 'var(--danger)' : 'var(--warning)',
              }}
            ></div>
          </div>
          <span className="db-hbar-value">{it.count}</span>
          <span className="db-hbar-amount">{it.dias_totales}d</span>
        </div>
      ))}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function Analytics() {
  const navigate = useNavigate();
  const {
    kpis, salud_cartera, reincidencia_perdonazos,
    flujo_contratos, vencimientos, por_software, top_clientes, por_tipo, por_sla,
    loading, error, refetch,
  } = useAnalytics();

  const kpiCards = [
    {
      label: 'Valor Cartera Activa',
      value: fmtCompact(kpis.valor_cartera.value),
      sub: `${kpis.valor_cartera.contratos} contrato(s) activo(s)`,
    },
    {
      label: 'ARR',
      value: fmtCompact(kpis.arr.value),
      sub: '12 × MRR vigente',
    },
    {
      label: 'Ticket Promedio',
      value: fmtCompact(kpis.ticket_promedio.value),
      sub: 'por contrato activo',
    },
    {
      label: 'Duración Media',
      value: `${kpis.duracion_media.value} m`,
      sub: 'contratos con vencimiento',
    },
    {
      label: 'Mix Recurrente',
      value: `${kpis.mix_recurrente.value}%`,
      sub: 'del monto de cartera',
      valueColor: kpis.mix_recurrente.value >= 50 ? 'color-emerald' : '',
    },
  ];

  const hayFlujo = flujo_contratos.some((p) => p.iniciados > 0 || p.terminados > 0);
  const hayVencimientos = vencimientos.some((p) => p.monto > 0 || p.count > 0);
  const vencData = vencimientos.map((p) => ({ ...p, monto_k: p.monto / 1000 }));

  const maxSoftware = Math.max(1, ...por_software.map((s) => s.monto));
  const maxClientes = Math.max(1, ...top_clientes.map((c) => c.monto));
  const maxTipo = Math.max(1, ...por_tipo.map((t) => t.monto));
  const maxSla = Math.max(1, ...por_sla.map((s) => s.monto));
  const datos = { kpis, salud_cartera, reincidencia_perdonazos, por_software, top_clientes, por_tipo, por_sla };

  return (
    <div className="db-container">

      <div className="db-topbar">
        <div>
          <p className="db-topbar-subtitle">Business Intelligence</p>
          <h1 className="db-topbar-title">Analytics</h1>
        </div>
        <div className="db-topbar-actions">
          <span className="db-date">
            {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="db-divider"></div>
          <button className="db-icon-btn" onClick={refetch} title="Actualizar datos">
            <RefreshCw size={13} className={loading ? 'db-spin' : ''} />
          </button>
          <button className="db-icon-btn" onClick={() => downloadAnalyticsCSV(datos)} title="Exportar métricas (CSV)">
            <Download size={13} />
          </button>
          <TopbarActions />
        </div>
      </div>

      <div className="db-scroll-area" style={loading && hayFlujo ? { opacity: 0.6 } : undefined}>

        {error ? (
          <ErrorBanner message={error} onRetry={refetch} />
        ) : (
          <>
            {/* KPIs */}
            <div className="db-kpi-bar">
              {kpiCards.map((kpi, i) => (
                <div key={i} className="db-kpi-item">
                  <span className="db-kpi-label-compact">{kpi.label}</span>
                  <span className={`db-kpi-value-compact ${kpi.valueColor || ''}`}>{loading ? '—' : kpi.value}</span>
                  <span className="db-kpi-sub-compact">{loading ? ' ' : kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* Salud de cobranza */}
            <div className="db-table-card an-salud-card">
              <div className="db-table-header">
                <div>
                  <p className="db-section-label">Riesgo</p>
                  <h3 className="db-table-title">Salud de cobranza</h3>
                </div>
                <span className={`db-kpi-value-compact ${salud_cartera.pct_riesgo >= 15 ? 'color-red' : salud_cartera.pct_riesgo > 0 ? 'color-amber' : 'color-emerald'}`}>
                  {salud_cartera.pct_riesgo}% de la cartera en riesgo
                </span>
              </div>

              {salud_cartera.por_estado.some((e) => e.monto > 0) && (
                <div className="an-estado-bar" title={salud_cartera.por_estado.map((e) => `${e.label}: ${e.count}`).join(' · ')}>
                  {salud_cartera.por_estado.filter((e) => e.monto > 0).map((e) => (
                    <div
                      key={e.estado}
                      className="an-estado-seg"
                      style={{ width: `${(e.monto / salud_cartera.por_estado.reduce((s, x) => s + x.monto, 0)) * 100}%`, backgroundColor: ESTADO_COLOR[e.estado] }}
                    ></div>
                  ))}
                </div>
              )}
              <div className="an-estado-legend">
                {salud_cartera.por_estado.map((e) => (
                  <span key={e.estado} className="an-estado-legend-item">
                    <span className="an-estado-dot" style={{ backgroundColor: ESTADO_COLOR[e.estado] }}></span>
                    {e.label} · {e.count}
                  </span>
                ))}
              </div>

              {salud_cartera.contratos_riesgo.length === 0 ? (
                <div className="db-empty">
                  <CheckCircle2 size={18} className="db-empty-icon-ok" />
                  <p>Cartera sana. Sin contratos en mora, gracia ni suspendidos.</p>
                </div>
              ) : (
                <div className="db-table-wrapper">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Software</th>
                        <th>Monto</th>
                        <th>Días vencido</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salud_cartera.contratos_riesgo.map((c) => (
                        <tr
                          key={c.id}
                          className="db-row-link"
                          tabIndex={0}
                          onClick={() => navigate(`/contratos/${c.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/contratos/${c.id}`);
                            }
                          }}
                        >
                          <td className="db-td-client">{c.cliente}</td>
                          <td>{c.software}</td>
                          <td className="db-td-mono">{fmtCompact(c.monto)}</td>
                          <td className={c.dias_vencido > 0 ? 'db-date-urgent' : ''}>{c.dias_vencido > 0 ? `${c.dias_vencido} días` : '—'}</td>
                          <td>
                            <span className={`db-status-badge ${ESTADO_BADGE_CLASS[c.estado] || ''}`}>
                              <AlertTriangle size={9} /> {c.estado_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="db-main-grid">

              {/* Flujo de contratos */}
              <div className="db-panel-card">
                <p className="db-section-label">Ciclo de Vida</p>
                <h3 className="db-section-title">Flujo de contratos — iniciados vs terminados (12 meses)</h3>
                {!hayFlujo ? (
                  <div className="db-empty">
                    <p>Aún no hay movimientos de contratos registrados. Cuando existan inicios o términos de contrato, verás aquí el flujo mensual.</p>
                  </div>
                ) : (
                  <div className="an-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={flujo_contratos} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
                        <CartesianGrid vertical={false} stroke="var(--bg-inset)" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} dy={8} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} />
                        <RechartsTooltip content={<FlujoTooltip />} cursor={{ fill: 'var(--bg-page)' }} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <Bar dataKey="iniciados" name="Iniciados" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="terminados" name="Terminados" fill="var(--text-faint)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Lateral: concentración de cartera */}
              <div className="db-side-col">
                <div className="db-panel-card">
                  <p className="db-section-label">Concentración</p>
                  <h3 className="db-section-title">Ingresos por software</h3>
                  {por_software.length === 0 ? (
                    <div className="db-empty"><p>Sin contratos activos con software asociado.</p></div>
                  ) : (
                    <HBarList items={por_software} maxValue={maxSoftware} color="var(--primary)" />
                  )}
                </div>

                <div className="db-panel-card">
                  <p className="db-section-label">Concentración</p>
                  <h3 className="db-section-title">Top clientes por monto</h3>
                  {top_clientes.length === 0 ? (
                    <div className="db-empty"><p>Sin contratos activos registrados.</p></div>
                  ) : (
                    <HBarList items={top_clientes} maxValue={maxClientes} color="var(--violet-bright)" />
                  )}
                </div>

                <div className="db-panel-card">
                  <p className="db-section-label">Riesgo</p>
                  <h3 className="db-section-title">Clientes con perdonazos recurrentes ({reincidencia_perdonazos.ventana_meses}m)</h3>
                  {reincidencia_perdonazos.top_reincidentes.length === 0 ? (
                    <div className="db-empty"><p>Sin perdonazos otorgados en la ventana analizada.</p></div>
                  ) : (
                    <PerdonazosList items={reincidencia_perdonazos.top_reincidentes} />
                  )}
                </div>
              </div>

              {/* Calendario de vencimientos */}
              <div className="db-panel-card">
                <p className="db-section-label">Renovaciones</p>
                <h3 className="db-section-title">Monto por vencer — próximos 12 meses</h3>
                {!hayVencimientos ? (
                  <div className="db-empty">
                    <p>Sin vencimientos en los próximos 12 meses. Los contratos activos con fecha de vencimiento aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="an-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vencData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--bg-inset)" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}k`} />
                        <RechartsTooltip content={<VencimientosTooltip />} cursor={{ fill: 'var(--bg-page)' }} />
                        <Bar dataKey="monto_k" name="Monto" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Lateral: mezcla de cartera */}
              <div className="db-side-col">
                <div className="db-panel-card">
                  <p className="db-section-label">Mezcla</p>
                  <h3 className="db-section-title">Cartera por tipo de contrato</h3>
                  {por_tipo.length === 0 ? (
                    <div className="db-empty"><p>Sin contratos activos registrados.</p></div>
                  ) : (
                    <HBarList
                      items={por_tipo.map((t) => ({ ...t, nombre: t.label }))}
                      maxValue={maxTipo}
                      colorByIndex={TIPO_COLORS}
                    />
                  )}
                </div>

                <div className="db-panel-card">
                  <p className="db-section-label">Mezcla</p>
                  <h3 className="db-section-title">Contratos por SLA</h3>
                  {por_sla.length === 0 ? (
                    <div className="db-empty"><p>Sin contratos activos con SLA asignado.</p></div>
                  ) : (
                    <HBarList items={por_sla} maxValue={maxSla} color="var(--cyan)" />
                  )}
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
