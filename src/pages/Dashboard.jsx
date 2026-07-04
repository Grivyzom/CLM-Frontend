import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter
} from 'recharts';
import { ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Download, TrendingUp } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import './Dashboard.css';

// Configuración de moneda
const CURRENCY_CONFIG = {
  default: 'CLP',
  symbol: '$',
  exchange_rates: {
    CLP: 1,
    USD: 900,    // 1 USD = ~900 CLP
    EUR: 1000,   // 1 EUR = ~1000 CLP
  },
};

// Paleta cíclica para series dinámicas (una por software activo)
const SERIES_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#be123c', '#0891b2'];

// Tooltip Personalizado
const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="db-tooltip">
        <p className="db-tooltip-label">{label}</p>
        <div className="db-tooltip-items">
          {payload.map((entry, index) => (
            <div key={index} className="db-tooltip-item">
              <span className="db-tooltip-dot" style={{ backgroundColor: entry.color }}></span>
              <span className="db-tooltip-name">{entry.name}</span>
              <span className="db-tooltip-value">
                {isCurrency ? `${CURRENCY_CONFIG.symbol}${(entry.value * 1000).toLocaleString('es-CL')}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};



function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{message}</span>
      </div>
      <br />
      <button className="db-btn-secondary" onClick={onRetry} style={{ margin: '0 auto' }}>
        Reintentar
      </button>
    </div>
  );
}

function fmtMoneyK(value) {
  return `$${(value / 1000).toFixed(1)}k`;
}

function generateMetricsCSV(kpis) {
  const headers = ['Métrica', 'Valor', 'Detalles'];
  const rows = [
    ['Contratos Activos', kpis.contratos_activos.value, `${kpis.contratos_activos.nuevos_mes} nuevos este mes`],
    ['Clientes Activos', kpis.clientes_activos.value, `${kpis.clientes_activos.nuevos_mes} nuevos`],
    ['Ingresos del Mes', fmtMoneyK(kpis.ingresos_mes.value), `${kpis.ingresos_mes.variacion_pct}% vs mes anterior`],
    ['Tasa de Retención', `${kpis.tasa_retencion.value}%`, 'últimos 90 días'],
    ['Por Vencer (7 días)', kpis.por_vencer_7dias.value, 'requieren acción'],
    ['Servicios en Línea', `${kpis.servicios.activos}/${kpis.servicios.total}`, kpis.servicios.activos === kpis.servicios.total ? 'todos operativos' : 'requiere revisión'],
  ];
  return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
}

function downloadMetricsCSV(kpis) {
  const csv = generateMetricsCSV(kpis);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clm-metrics-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const {
    kpis, chart_area, chart_bar, urgent_contracts,
    loading, error, refetch,
  } = useDashboard();

  const [activeContext, setActiveContext] = useState('Administración Global');
  const [sortConfig, setSortConfig] = useState({ key: 'date_value', direction: 'asc' });
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = async () => {
    setExportLoading(true);
    setTimeout(() => {
      downloadMetricsCSV(kpis);
      setExportLoading(false);
    }, 500);
  };

  const sortedContracts = useMemo(() => {
    const sortableItems = [...urgent_contracts];
    sortableItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [urgent_contracts, sortConfig]);

  const SortableHeader = ({ label, sortKey }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th
        className="db-th-sortable"
        onClick={() => handleSort(sortKey)}
        title={`Ordenar por ${label}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          {label}
          {isActive ? (
            sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          ) : (
            <ChevronsUpDown size={12} style={{ opacity: 0.3 }} />
          )}
        </div>
      </th>
    );
  };

  const ingresoVariacion = kpis.ingresos_mes.variacion_pct;
  const kpiCards = [
    {
      label: 'Contratos Activos',
      value: kpis.contratos_activos.value || 0,
      sub: `↑ ${kpis.contratos_activos.nuevos_mes || 0} este mes`,
      subColor: 'color-emerald',
    },
    {
      label: 'Clientes Activos',
      value: kpis.clientes_activos.value || 0,
      sub: `↑ ${kpis.clientes_activos.nuevos_mes || 0} nuevos`,
      subColor: 'color-emerald',
    },
    {
      label: 'Ingresos del Mes',
      value: fmtMoneyK(kpis.ingresos_mes.value || 0),
      sub: `${ingresoVariacion >= 0 ? '↑ +' : '↓ '}${Math.abs(ingresoVariacion)}%`,
      subColor: ingresoVariacion >= 0 ? 'color-emerald' : 'color-red',
    },
    {
      label: 'Tasa de Retención',
      value: `${Math.round(kpis.tasa_retencion.value || 0)}%`,
      sub: 'últimos 90 días',
      valueColor: 'color-emerald',
    },
    {
      label: 'Por Vencer (7 días)',
      value: kpis.por_vencer_7dias.value || 0,
      sub: 'Requieren acción',
      bg: kpis.por_vencer_7dias.value > 0 ? 'bg-amber' : '',
      valueColor: kpis.por_vencer_7dias.value > 0 ? 'color-amber-value' : 'color-emerald',
      labelColor: kpis.por_vencer_7dias.value > 0 ? 'color-amber-label' : '',
    },
    {
      label: 'Servicios en Línea',
      value: `${kpis.servicios.activos || 0}/${kpis.servicios.total || 0}`,
      sub: (kpis.servicios.activos === kpis.servicios.total && kpis.servicios.total > 0) ? '● Todos operativos' : '● Requiere revisión',
      subColor: (kpis.servicios.activos === kpis.servicios.total && kpis.servicios.total > 0) ? 'color-emerald' : 'color-amber',
    },
  ];

  return (
    <div className="db-container">

      {/* Topbar Fijo */}
      <div className="db-topbar">
        <div>
          <p className="db-topbar-subtitle">Enfoque Platform</p>
          <h1 className="db-topbar-title">Vista General</h1>
        </div>
        <div className="db-topbar-actions">
          <span className="db-date">
            {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="db-divider"></div>

          {/* Selector de Contexto */}
          <div className="db-context-selector">
            <span className="db-context-dot"></span>
            <select
              className="db-context-select"
              value={activeContext}
              onChange={(e) => setActiveContext(e.target.value)}
            >
              <option>Administración Global</option>
              {chart_area.softwares.map((nombre) => (
                <option key={nombre}>{nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contenedor Principal con Scroll */}
      <div className="db-scroll-area">

        {error ? (
          <ErrorBanner message={error} onRetry={refetch} />
        ) : (
          <>
            {/* Fila 1: KPIs - Visión General */}
            <div className="db-section-group">

              <div className="db-kpi-bar">
                {kpiCards.map((kpi, i) => (
                  <div key={i} className="db-kpi-item">
                    <div className="db-kpi-content">
                      <span className={`db-kpi-label-compact ${kpi.labelColor || ''}`}>{kpi.label}</span>
                      <span className={`db-kpi-value-compact ${kpi.valueColor || ''}`}>{loading ? '—' : kpi.value}</span>
                    </div>
                    <span className={`db-kpi-sub-compact ${kpi.subColor || ''}`}>{loading ? '' : kpi.sub}</span>
                  </div>
                ))}
              </div>


            </div>

            {/* Fila 2: Gráficos */}
            <div className="db-charts-row">

              {/* Tarjeta de Gráficos */}
              <div className="db-charts-card">
                {/* Health Score vs Revenue Scatter */}
                <div className="db-chart-section">
                  <div style={{ marginBottom: '1rem' }}>
                    <p className="db-section-label">Análisis de Cartera</p>
                    <h3 className="db-section-title">Health Score vs Revenue</h3>
                    <p style={{ fontSize: '11px', color: '#7c7670', margin: '6px 0 0 0', fontFamily: 'JetBrains Mono' }}>
                      Identifica clientes críticos con altos ingresos (intervenir urgente)
                    </p>
                  </div>

                  <div style={{ height: 200, marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                        <XAxis
                          type="number"
                          dataKey="score"
                          name="Health Score"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: '#7c7670', fontFamily: 'JetBrains Mono' }}
                          label={{ value: 'Health Score', position: 'insideBottomRight', offset: -5, fontSize: 9, fill: '#7c7670' }}
                        />
                        <YAxis
                          type="number"
                          dataKey="revenue"
                          name="Revenue ($k)"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: '#7c7670', fontFamily: 'JetBrains Mono' }}
                          label={{ value: 'Revenue', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#7c7670' }}
                        />
                        <RechartsTooltip
                          contentStyle={{ background: '#ffffff', border: '1px solid #d8d4cc', borderRadius: '4px', fontSize: '11px' }}
                          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                          formatter={(value, name) => {
                            if (name === 'revenue') return [`$${value}k`, 'Revenue'];
                            return [value, name];
                          }}
                        />
                        <Scatter
                          name="Crítico"
                          data={[{ score: 15, revenue: 112500, client: 'Digital Ventures' }]}
                          fill="#dc2626"
                          fillOpacity={0.7}
                        />
                        <Scatter
                          name="En Riesgo"
                          data={[
                            { score: 35, revenue: 166500, client: 'Global Inc' },
                            { score: 48, revenue: 85500, client: 'TechFlow' },
                          ]}
                          fill="#f59e0b"
                          fillOpacity={0.7}
                        />
                        <Scatter
                          name="Normal"
                          data={[
                            { score: 62, revenue: 130500, client: 'NextGen' },
                            { score: 75, revenue: 198000, client: 'TechSolutions' },
                            { score: 68, revenue: 94500, client: 'CloudBase' },
                          ]}
                          fill="#3b82f6"
                          fillOpacity={0.7}
                        />
                        <Scatter
                          name="Saludable"
                          data={[
                            { score: 88, revenue: 252000, client: 'Acme Corp' },
                            { score: 92, revenue: 220500, client: 'Enterprise Pro' },
                            { score: 85, revenue: 175500, client: 'AdvanceIT' },
                          ]}
                          fill="#10b981"
                          fillOpacity={0.7}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="db-vertical-divider"></div>

                {/* Gráfico 2: Barras Ingresos Mensuales */}
                <div className="db-chart-section-small">
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p className="db-section-label">Desempeño MRR</p>
                        <h3 className="db-section-title" style={{ marginBottom: '6px' }}>Ingresos por software</h3>
                        <p style={{ fontSize: '11px', color: '#7c7670', margin: '0', fontFamily: 'JetBrains Mono' }}>
                          Comparativa mensual por producto
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', color: ingresoVariacion >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
                        {ingresoVariacion >= 0 ? `↑ +${ingresoVariacion}%` : `↓ ${ingresoVariacion}%`}
                      </span>
                    </div>
                  </div>

                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart_bar.data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e2da" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7c7670', fontFamily: 'JetBrains Mono' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7c7670', fontFamily: 'JetBrains Mono' }} tickFormatter={(val) => `$${val}k`} />
                        <RechartsTooltip content={<CustomTooltip isCurrency />} cursor={{ fill: '#f4f3ef' }} />
                        {chart_bar.softwares.map((nombre, i) => (
                          <Bar key={nombre} dataKey={nombre} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Próximos Cobros - Bar Chart */}
              <div className="db-collections-card">
                <div style={{ marginBottom: '1rem' }}>
                  <p className="db-section-label">Pipeline de Cobranzas</p>
                  <h3 className="db-section-title">Próximos 14 días</h3>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <div style={{ fontSize: '11px' }}>
                      <span style={{ color: '#7c7670', fontFamily: 'JetBrains Mono' }}>Total esperado:</span>
                      <span style={{ fontWeight: 700, color: '#16a34a', marginLeft: '4px', fontFamily: 'JetBrains Mono' }}>$14.1M CLP</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: 160, marginTop: '0.5rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { date: 'Hoy', amount: 2250, status: 'pending' },
                        { date: 'Mañana', amount: 1620, status: 'pending' },
                        { date: '3d', amount: 2880, status: 'overdue' },
                        { date: '5d', amount: 1350, status: 'pending' },
                        { date: '7d', amount: 1890, status: 'pending' },
                        { date: '14d', amount: 1080, status: 'pending' },
                      ]}
                      margin={{ top: 5, right: 10, left: -5, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e2da" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#7c7670', fontFamily: 'JetBrains Mono' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#7c7670', fontFamily: 'JetBrains Mono' }} tickFormatter={(val) => `$${val}k`} />
                      <RechartsTooltip
                        contentStyle={{ background: '#ffffff', border: '1px solid #d8d4cc', borderRadius: '4px', fontSize: '11px' }}
                        formatter={(value) => `$${value}k`}
                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      />
                      <Bar dataKey="amount" fill="#2563eb" radius={[3, 3, 0, 0]}>
                        {[
                          { date: 'Hoy', amount: 2250, status: 'pending' },
                          { date: 'Mañana', amount: 1620, status: 'pending' },
                          { date: '3d', amount: 2880, status: 'overdue' },
                          { date: '5d', amount: 1350, status: 'pending' },
                          { date: '7d', amount: 1890, status: 'pending' },
                          { date: '14d', amount: 1080, status: 'pending' },
                        ].map((item, i) => (
                          <Bar
                            key={i}
                            dataKey="amount"
                            fill={item.status === 'overdue' ? '#dc2626' : '#16a34a'}
                            isAnimationActive={false}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
