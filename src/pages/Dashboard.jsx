import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Download, RefreshCw,
  CheckCircle2, AlertTriangle, FileWarning, ArrowRight,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import './Dashboard.css';

// Paleta categórica fija (validada CVD): una serie = un color, orden estable.
const SERIES_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#be123c', '#0891b2'];

// Ramp ordinal (validado): etapas del pipeline, claro → oscuro.
const PIPELINE_COLORS = ['#7cb1f7', '#4f8ef0', '#2563eb', '#1a45c2', '#132f8f'];

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

function tiempoRelativo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

// ── Tooltip para la serie MRR (valores en $k) ────────────────────────────────

function MrrTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      <div className="db-tooltip-items">
        {payload.map((entry) => (
          <div key={entry.name} className="db-tooltip-item">
            <span className="db-tooltip-dot" style={{ backgroundColor: entry.color }}></span>
            <span className="db-tooltip-name">{entry.name}</span>
            <span className="db-tooltip-value">{fmtCLP(entry.value * 1000)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exportación CSV ──────────────────────────────────────────────────────────

function downloadMetricsCSV(kpis) {
  const rows = [
    ['Métrica', 'Valor', 'Detalles'],
    ['MRR', fmtCLP(kpis.mrr.value), `${kpis.mrr.variacion_pct}% vs mes anterior`],
    ['ARR', fmtCLP(kpis.mrr.value * 12), '12 × MRR'],
    ['Contratos Activos', kpis.contratos_activos.value, `${kpis.contratos_activos.nuevos_mes} nuevos este mes`],
    ['Clientes Activos', kpis.clientes_activos.value, `${kpis.clientes_activos.nuevos_mes} nuevos este mes`],
    ['Renovaciones 30 días', kpis.renovaciones_30d.value, `${fmtCLP(kpis.renovaciones_30d.monto)} en juego`],
    ['Requieren acción', kpis.requieren_accion.value, 'mora, gracia o vencen en ≤7 días'],
    ['Activos sin documento', kpis.sin_documento.value, 'sin PDF de respaldo generado'],
  ];
  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `clm-metricas-${new Date().toISOString().split('T')[0]}.csv`;
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

// ── Página ───────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    kpis, mrr_series, pipeline, renovaciones, urgent_contracts, actividad,
    loading, error, refetch,
  } = useDashboard();

  const [sortConfig, setSortConfig] = useState({ key: 'date_value', direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedContracts = useMemo(() => {
    const items = [...urgent_contracts];
    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [urgent_contracts, sortConfig]);

  const SortableHeader = ({ label, sortKey }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th className="db-th-sortable" onClick={() => handleSort(sortKey)} title={`Ordenar por ${label}`}>
        <div className="db-th-inner">
          {label}
          {isActive
            ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
            : <ChevronsUpDown size={12} style={{ opacity: 0.3 }} />}
        </div>
      </th>
    );
  };

  const variacionMrr = kpis.mrr.variacion_pct;
  const kpiCards = [
    {
      label: 'MRR',
      value: fmtCompact(kpis.mrr.value),
      sub: `${variacionMrr >= 0 ? '↑ +' : '↓ '}${Math.abs(variacionMrr)}% vs mes anterior`,
      subColor: variacionMrr >= 0 ? 'color-emerald' : 'color-red',
    },
    {
      label: 'Contratos Activos',
      value: kpis.contratos_activos.value,
      sub: `+${kpis.contratos_activos.nuevos_mes} este mes`,
      subColor: 'color-emerald',
    },
    {
      label: 'Clientes Activos',
      value: kpis.clientes_activos.value,
      sub: `+${kpis.clientes_activos.nuevos_mes} nuevos`,
      subColor: 'color-emerald',
    },
    {
      label: 'Renovaciones 30d',
      value: kpis.renovaciones_30d.value,
      sub: `${fmtCompact(kpis.renovaciones_30d.monto)} en juego`,
      subColor: kpis.renovaciones_30d.value > 0 ? 'color-amber' : '',
    },
    {
      label: 'Requieren Acción',
      value: kpis.requieren_accion.value,
      sub: 'mora · gracia · vencen ≤7d',
      bg: kpis.requieren_accion.value > 0 ? 'bg-amber' : '',
      valueColor: kpis.requieren_accion.value > 0 ? 'color-amber-value' : 'color-emerald',
    },
    {
      label: 'Sin Documento',
      value: kpis.sin_documento.value,
      sub: 'activos sin PDF generado',
      valueColor: kpis.sin_documento.value > 0 ? 'color-amber-value' : 'color-emerald',
    },
  ];

  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));
  const maxRenovacion = Math.max(1, ...renovaciones.map((r) => r.monto));
  const totalRenovaciones = renovaciones.reduce((acc, r) => acc + r.monto, 0);
  const hayMrr = mrr_series.data.some((punto) =>
    mrr_series.softwares.some((sw) => (punto[sw] || 0) > 0)
  );

  return (
    <div className="db-container">

      <div className="db-topbar">
        <div>
          <p className="db-topbar-subtitle">Gestión de Contratos</p>
          <h1 className="db-topbar-title">Vista General</h1>
        </div>
        <div className="db-topbar-actions">
          <span className="db-date">
            {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="db-divider"></div>
          <button className="db-icon-btn" onClick={refetch} title="Actualizar datos">
            <RefreshCw size={13} className={loading ? 'db-spin' : ''} />
          </button>
          <button className="db-icon-btn" onClick={() => downloadMetricsCSV(kpis)} title="Exportar métricas (CSV)">
            <Download size={13} />
          </button>
        </div>
      </div>

      <div className="db-scroll-area" style={loading && urgent_contracts.length ? { opacity: 0.6 } : undefined}>

        {error ? (
          <ErrorBanner message={error} onRetry={refetch} />
        ) : (
          <>
            {/* KPIs */}
            <div className="db-kpi-bar">
              {kpiCards.map((kpi, i) => (
                <div key={i} className={`db-kpi-item ${kpi.bg || ''}`}>
                  <div className="db-kpi-content">
                    <span className={`db-kpi-label-compact ${kpi.labelColor || ''}`}>{kpi.label}</span>
                    <span className={`db-kpi-value-compact ${kpi.valueColor || ''}`}>{loading ? '—' : kpi.value}</span>
                  </div>
                  <span className={`db-kpi-sub-compact ${kpi.subColor || ''}`}>{loading ? '' : kpi.sub}</span>
                </div>
              ))}
            </div>

            <div className="db-main-grid">

              {/* Requieren acción */}
              <div className="db-table-card">
                <div className="db-table-header">
                  <div>
                    <p className="db-section-label">Prioridad Operativa</p>
                    <h3 className="db-table-title">Contratos que requieren acción</h3>
                  </div>
                  <button className="db-link-btn" onClick={() => navigate('/contratos')}>
                    Ver todos →
                  </button>
                </div>
                {sortedContracts.length === 0 ? (
                  <div className="db-empty">
                    <CheckCircle2 size={18} className="db-empty-icon-ok" />
                    <p>Nada requiere acción hoy. Sin contratos en mora, gracia ni vencimientos próximos.</p>
                  </div>
                ) : (
                  <div className="db-table-wrapper">
                    <table className="db-table">
                      <thead>
                        <tr>
                          <SortableHeader label="Cliente" sortKey="client" />
                          <SortableHeader label="Software" sortKey="app" />
                          <SortableHeader label="Monto" sortKey="monto" />
                          <SortableHeader label="Vence" sortKey="date_value" />
                          <SortableHeader label="SLA" sortKey="plan" />
                          <SortableHeader label="Estado" sortKey="status" />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedContracts.map((c) => (
                          <tr key={c.id} className="db-row-link" onClick={() => navigate(`/contratos/${c.id}`)}>
                            <td className="db-td-client">{c.client}</td>
                            <td>{c.app}</td>
                            <td className="db-td-mono">{fmtCompact(c.monto)}</td>
                            <td className={c.date_class}>{c.date}</td>
                            <td>{c.plan}</td>
                            <td>
                              <span className={`db-status-badge ${c.status_class}`}>
                                <AlertTriangle size={9} /> {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Columna lateral: pipeline + renovaciones */}
              <div className="db-side-col">

                <div className="db-panel-card">
                  <p className="db-section-label">Ciclo de Vida</p>
                  <h3 className="db-section-title">Pipeline por etapa</h3>
                  <div className="db-hbar-list">
                    {pipeline.map((p, i) => (
                      <div key={p.etapa} className="db-hbar-row" title={`${p.count} contrato(s) · ${fmtCLP(p.monto)}`}>
                        <span className="db-hbar-label">{p.label.split(' ')[0]}</span>
                        <div className="db-hbar-track">
                          <div
                            className="db-hbar-fill"
                            style={{
                              width: `${(p.count / maxPipeline) * 100}%`,
                              backgroundColor: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
                            }}
                          ></div>
                        </div>
                        <span className="db-hbar-value">{p.count}</span>
                        <span className="db-hbar-amount">{p.monto > 0 ? fmtCompact(p.monto) : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="db-panel-card">
                  <p className="db-section-label">Renovaciones</p>
                  <h3 className="db-section-title">Monto por renovar (90 días)</h3>
                  <div className="db-hbar-list">
                    {renovaciones.map((r) => (
                      <div key={r.label} className="db-hbar-row" title={`${r.count} contrato(s) · ${fmtCLP(r.monto)}`}>
                        <span className="db-hbar-label">{r.label}</span>
                        <div className="db-hbar-track">
                          <div
                            className="db-hbar-fill"
                            style={{ width: `${(r.monto / maxRenovacion) * 100}%`, backgroundColor: '#2563eb' }}
                          ></div>
                        </div>
                        <span className="db-hbar-value">{r.count}</span>
                        <span className="db-hbar-amount">{r.monto > 0 ? fmtCompact(r.monto) : '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="db-panel-footer">
                    <span>Total esperado</span>
                    <strong>{fmtCLP(totalRenovaciones)}</strong>
                  </div>
                </div>
              </div>

              {/* Evolución MRR */}
              <div className="db-panel-card">
                <div className="db-panel-head-row">
                  <div>
                    <p className="db-section-label">Ingresos Recurrentes</p>
                    <h3 className="db-section-title">MRR últimos 6 meses, por software</h3>
                  </div>
                  <span className={`db-trend ${variacionMrr >= 0 ? 'color-emerald' : 'color-red'}`}>
                    {variacionMrr >= 0 ? `↑ +${variacionMrr}%` : `↓ ${variacionMrr}%`}
                  </span>
                </div>
                {!hayMrr ? (
                  <div className="db-empty">
                    <p>Aún no hay contratos recurrentes registrados. Cuando crees contratos de tipo Recurrente, verás aquí la evolución del MRR.</p>
                  </div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mrr_series.data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#eceae4" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7c7670', fontFamily: 'JetBrains Mono' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7c7670', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}k`} />
                        <RechartsTooltip content={<MrrTooltip />} cursor={{ fill: '#f4f3ef' }} />
                        {mrr_series.softwares.length > 1 && (
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        )}
                        {mrr_series.softwares.map((nombre, i) => (
                          <Bar
                            key={nombre}
                            dataKey={nombre}
                            stackId="mrr"
                            fill={nombre === 'Otros' ? '#a8a29e' : SERIES_COLORS[i % SERIES_COLORS.length]}
                            stroke="#ffffff"
                            strokeWidth={1}
                            radius={i === mrr_series.softwares.length - 1 ? [3, 3, 0, 0] : 0}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Actividad reciente */}
              <div className="db-panel-card">
                <p className="db-section-label">Trazabilidad</p>
                <h3 className="db-section-title">Actividad reciente</h3>
                {actividad.length === 0 ? (
                  <div className="db-empty">
                    <p>Sin movimientos de etapa registrados todavía.</p>
                  </div>
                ) : (
                  <ul className="db-activity-list">
                    {actividad.map((a) => (
                      <li key={a.id} className="db-activity-item" onClick={() => navigate(`/contratos/${a.contrato_id}`)}>
                        <div className="db-activity-main">
                          <span className="db-activity-client">{a.cliente}</span>
                          <span className="db-activity-transition">
                            {a.etapa_anterior && <>{a.etapa_anterior.split(' ')[0]} <ArrowRight size={9} /></>}
                            {a.etapa_nueva.split(' ')[0]}
                          </span>
                        </div>
                        <div className="db-activity-meta">
                          <span>{a.software}</span>
                          <span>{a.usuario} · {tiempoRelativo(a.fecha)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>

            {kpis.sin_documento.value > 0 && (
              <div className="db-doc-warning">
                <FileWarning size={13} />
                <span>
                  {kpis.sin_documento.value} contrato(s) activo(s) sin documento PDF de respaldo.
                  Genera el documento desde la ficha del contrato para mantener la trazabilidad legal.
                </span>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
