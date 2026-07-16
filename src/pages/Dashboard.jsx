import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Cell,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Download, RefreshCw,
  CheckCircle2, AlertTriangle, FileWarning, ArrowRight,
  DollarSign, FileText, Users, Calendar, FileQuestion, X,
  ShieldAlert, Layers, TrendingUp
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import TopbarActions from '../components/layout/TopbarActions';
import './Dashboard.css';
import './Analytics.css';

// Paleta categórica fija (validada CVD): una serie = un color, orden estable.
const SERIES_COLORS = ['var(--primary)', 'var(--success)', 'var(--warning-bright)', 'var(--violet-bright)', 'var(--rose)', 'var(--cyan)'];

// Ramp ordinal (validado): etapas del pipeline, claro → oscuro.
const PIPELINE_COLORS = ['var(--chart-pipeline-1)', 'var(--chart-pipeline-2)', 'var(--primary)', 'var(--chart-pipeline-4)', 'var(--chart-pipeline-5)'];

// Estado de cobranza (status del contrato, no etapa) → color de riesgo.
// Mismo mapa que Analytics.jsx (duplicado intencional, igual que MRR_EXPR en el backend).
const ESTADO_COLOR = {
  ACTIVO: 'var(--success)',
  GRACIA: 'var(--warning)',
  MORA: 'var(--danger)',
  SUSPENDIDO: 'var(--danger-deep)',
};

// Etiquetas cortas para etapas (los display names del backend son largos).
const ETAPA_CORTA = {
  'Borrador (Draft)': 'Borrador',
  'En Revisión / Negociación': 'Revisión',
  'Aprobado internamente': 'Aprobado',
  'Pendiente de Firma': 'P. firma',
  'Activo / Ejecutado': 'Activo',
  'Enmendado (Amended)': 'Enmendado',
  'Terminado / Expirado': 'Terminado',
};

function etapaCorta(label) {
  return ETAPA_CORTA[label] || label;
}

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

// ── Tooltips para los charts de estado / valor negociado ────────────────────

function EstadoTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{p.label}</p>
      <div className="db-tooltip-items">
        <div className="db-tooltip-item">
          <span className="db-tooltip-name">Contratos</span>
          <span className="db-tooltip-value">{p.count}</span>
        </div>
        <div className="db-tooltip-item">
          <span className="db-tooltip-name">Monto</span>
          <span className="db-tooltip-value">{fmtCLP(p.monto)}</span>
        </div>
      </div>
    </div>
  );
}

function ValorNegociadoTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      <div className="db-tooltip-items">
        <div className="db-tooltip-item">
          <span className="db-tooltip-name">Monto negociado</span>
          <span className="db-tooltip-value">{fmtCLP(payload[0].value * 1000)}</span>
        </div>
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
    cartera_estado, valor_negociado,
    loading, error, refetch,
  } = useDashboard();

  const dashboardRef = useRef(null);
  const [dismissedDocWarning, setDismissedDocWarning] = useState(false);

  // La entrada corre en dos fases para que la vista aparezca al instante del click:
  // fase 1 anima la estructura (existe desde el mount, con placeholders '—') sin
  // esperar el fetch; fase 2 anima solo el contenido dependiente de datos.
  const structureAnimatedRef = useRef(false);

  useGSAP(() => {
    if (sessionStorage.getItem('dashboard_animated') === 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = dashboardRef.current;
    if (!root) return;

    if (!structureAnimatedRef.current) {
      structureAnimatedRef.current = true;

      const topbar = root.querySelector('.db-topbar');
      const kpiItems = root.querySelectorAll('.db-kpi-item');
      const panelCards = root.querySelectorAll('.db-table-card, .db-panel-card');
      const sectionLabels = root.querySelectorAll('.db-section-label');
      const sectionTitles = root.querySelectorAll('.db-table-title, .db-section-title');

      const tl = gsap.timeline();

      if (topbar) {
        tl.fromTo(topbar, { y: -14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
      if (kpiItems.length > 0) {
        tl.fromTo(kpiItems, { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.32, stagger: 0.03, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.22');
      }
      if (panelCards.length > 0) {
        tl.fromTo(panelCards, { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.25');
      }
      if (sectionLabels.length > 0) {
        tl.fromTo(sectionLabels, { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.3');
      }
      if (sectionTitles.length > 0) {
        tl.fromTo(sectionTitles, { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.28');
      }

      // Auto-draw de iconos SVG: se leen todos los getTotalLength() antes de
      // escribir estilos para no alternar lectura/escritura de layout.
      const paths = root.querySelectorAll(
        'svg.lucide path, svg.lucide line, svg.lucide polyline, svg.lucide circle, svg.lucide rect'
      );
      const measured = [];
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) measured.push([path, length]);
        } catch (e) {}
      });
      measured.forEach(([path, length]) => {
        gsap.fromTo(path,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }
        );
      });
    }

    if (!loading) {
      const kpiValues = root.querySelectorAll('.db-kpi-value-compact');
      const docWarning = root.querySelector('.db-doc-warning');
      const tableRows = root.querySelectorAll('tr.db-row-link');
      const hbarRows = root.querySelectorAll('.db-hbar-row');
      const activityItems = root.querySelectorAll('.db-activity-item');

      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem('dashboard_animated', 'true');
        }
      });

      if (kpiValues.length > 0) {
        tl.addLabel('kpiIn');
        tl.fromTo(kpiValues, { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power3.out', clearProps: 'transform,opacity' }, 'kpiIn');

        // Contador numérico: proxy object animado de 0 → valor real, formateado
        // en cada frame vía onUpdate (evita re-render de React por frame).
        const kpiCounters = [
          { raw: kpis.mrr.value, format: fmtCompact },
          { raw: kpis.contratos_activos.value, format: (v) => Math.round(v).toLocaleString('es-CL') },
          { raw: kpis.clientes_activos.value, format: (v) => Math.round(v).toLocaleString('es-CL') },
          { raw: kpis.renovaciones_30d.value, format: (v) => Math.round(v).toLocaleString('es-CL') },
          { raw: kpis.requieren_accion.value, format: (v) => Math.round(v).toLocaleString('es-CL') },
          { raw: kpis.sin_documento.value, format: (v) => Math.round(v).toLocaleString('es-CL') },
        ];
        kpiValues.forEach((el, i) => {
          const counter = kpiCounters[i];
          if (!counter || typeof counter.raw !== 'number') return;
          const proxy = { val: 0 };
          tl.to(proxy, {
            val: counter.raw,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = counter.format(proxy.val); },
          }, `kpiIn+=${i * 0.03}`);
        });
      }
      if (docWarning) {
        tl.fromTo(docWarning, { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.22');
      }
      if (tableRows.length > 0) {
        tl.fromTo(tableRows, { x: -8, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.2');
      }
      if (hbarRows.length > 0) {
        tl.fromTo(hbarRows, { x: 10, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.24');
      }
      if (activityItems.length > 0) {
        tl.fromTo(activityItems, { x: -10, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.24');
      }
    }
  }, { dependencies: [loading], scope: dashboardRef });

  // Draw SVG icons on hover of interactive elements
  useGSAP(() => {
    const handleMouseEnter = (e) => {
      const paths = e.currentTarget.querySelectorAll(
        'svg.lucide path, svg.lucide line, svg.lucide polyline, svg.lucide circle, svg.lucide rect'
      );
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) {
            gsap.fromTo(path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.8,
                ease: 'power2.out',
                clearProps: 'strokeDasharray,strokeDashoffset'
              }
            );
          }
        } catch (e) {}
      });
    };

    const interactiveElements = dashboardRef.current?.querySelectorAll(
      '.db-icon-btn, .db-row-link, .db-activity-item, .db-link-btn, .db-kpi-item'
    );

    if (interactiveElements) {
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter, { once: true });
      });
    }

    return () => {
      if (interactiveElements) {
        interactiveElements.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter);
        });
      }
    };
  }, { dependencies: [loading], scope: dashboardRef });

  const [sortConfig, setSortConfig] = useState({ key: 'date_value', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(sortedContracts.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const paginatedContracts = sortedContracts.slice(offset, offset + PAGE_SIZE);

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
      icon: <DollarSign size={14} className="lucide" style={{ opacity: 0.7, color: 'var(--text-muted)' }} />
    },
    {
      label: 'Contratos Activos',
      value: kpis.contratos_activos.value,
      sub: `+${kpis.contratos_activos.nuevos_mes} este mes`,
      subColor: 'color-emerald',
      icon: <FileText size={14} className="lucide" style={{ opacity: 0.7, color: 'var(--text-muted)' }} />
    },
    {
      label: 'Clientes Activos',
      value: kpis.clientes_activos.value,
      sub: `+${kpis.clientes_activos.nuevos_mes} nuevos`,
      subColor: 'color-emerald',
      icon: <Users size={14} className="lucide" style={{ opacity: 0.7, color: 'var(--text-muted)' }} />
    },
    {
      label: 'Renovaciones 30d',
      value: kpis.renovaciones_30d.value,
      sub: `${fmtCompact(kpis.renovaciones_30d.monto)} en juego`,
      subColor: kpis.renovaciones_30d.value > 0 ? 'color-amber' : '',
      icon: <Calendar size={14} className="lucide" style={{ opacity: 0.7, color: 'var(--text-muted)' }} />
    },
    {
      label: 'Requieren Acción',
      value: kpis.requieren_accion.value,
      sub: 'mora · gracia · vencen ≤7d',
      bg: kpis.requieren_accion.value > 0 ? 'bg-amber' : '',
      valueColor: kpis.requieren_accion.value > 0 ? 'color-amber-value' : 'color-emerald',
      icon: <AlertTriangle size={14} className="lucide" style={{ opacity: 0.7, color: kpis.requieren_accion.value > 0 ? 'var(--warning-bright)' : 'var(--success)' }} />
    },
    {
      label: 'Sin Documento',
      value: kpis.sin_documento.value,
      sub: 'activos sin PDF generado',
      valueColor: kpis.sin_documento.value > 0 ? 'color-amber-value' : 'color-emerald',
      icon: <FileQuestion size={14} className="lucide" style={{ opacity: 0.7, color: kpis.sin_documento.value > 0 ? 'var(--warning-bright)' : 'var(--success)' }} />
    },
  ];

  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));
  const maxRenovacion = Math.max(1, ...renovaciones.map((r) => r.monto));
  const totalRenovaciones = renovaciones.reduce((acc, r) => acc + r.monto, 0);
  const hayMrr = mrr_series.data.some((punto) =>
    mrr_series.softwares.some((sw) => (punto[sw] || 0) > 0)
  );
  const hayCarteraEstado = cartera_estado.por_estado.some((e) => e.count > 0);
  const hayValorNegociado = valor_negociado.data.some((p) => p.monto_k > 0);
  const montoTotalEstado = cartera_estado.por_estado.reduce((s, e) => s + e.monto, 0);

  return (
    <div className="db-container" ref={dashboardRef}>

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
          <TopbarActions />
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                    <span className={`db-kpi-label-compact ${kpi.labelColor || ''}`}>{kpi.label}</span>
                    {kpi.icon}
                  </div>
                  <span className={`db-kpi-value-compact ${kpi.valueColor || ''}`}>{loading ? '—' : kpi.value}</span>
                  <span className={`db-kpi-sub-compact ${kpi.subColor || ''}`}>{loading ? ' ' : kpi.sub}</span>
                </div>
              ))}
            </div>

            {kpis.sin_documento.value > 0 && !dismissedDocWarning && (
              <div className="db-doc-warning">
                <FileWarning size={13} />
                <span>
                  {kpis.sin_documento.value} contrato(s) activo(s) sin documento PDF de respaldo.
                  Genera el documento desde la ficha del contrato para mantener la trazabilidad legal.
                </span>
                <button className="db-doc-warning-close" onClick={() => setDismissedDocWarning(true)} title="Cerrar aviso">
                  <X size={13} />
                </button>
              </div>
            )}

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
                  <>
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
                          {paginatedContracts.map((c) => (
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
                    {sortedContracts.length > PAGE_SIZE && (
                      <div className="db-pagination">
                        <span className="db-pagination-info">{offset + 1}–{Math.min(offset + PAGE_SIZE, sortedContracts.length)} de {sortedContracts.length}</span>
                        <div className="db-pagination-controls">
                          <button
                            className="db-pagination-btn"
                            onClick={() => setCurrentPage(Math.max(page - 1, 1))}
                            disabled={page === 1}
                            title="Página anterior"
                          >
                            ← Anterior
                          </button>
                          <span className="db-pagination-counter">{page} / {totalPages}</span>
                          <button
                            className="db-pagination-btn"
                            onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
                            disabled={page === totalPages}
                            title="Página siguiente"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Columna lateral: pipeline + renovaciones */}
              <div className="db-side-col">

                <div className="db-panel-card">
                  <p className="db-section-label">Ciclo de Vida</p>
                  <h3 className="db-section-title">Pipeline por etapa</h3>
                  <div className="db-hbar-list">
                    {pipeline.map((p, i) => (
                      <div key={p.etapa} className="db-hbar-row" title={`${p.label}: ${p.count} contrato(s) · ${fmtCLP(p.monto)}`}>
                        <span className="db-hbar-label">{etapaCorta(p.label)}</span>
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
                            style={{ width: `${(r.monto / maxRenovacion) * 100}%`, backgroundColor: 'var(--primary)' }}
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
                        <CartesianGrid vertical={false} stroke="var(--bg-inset)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}k`} />
                        <RechartsTooltip content={<MrrTooltip />} cursor={{ fill: 'var(--bg-page)' }} />
                        {mrr_series.softwares.length > 1 && (
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        )}
                        {mrr_series.softwares.map((nombre, i) => (
                          <Bar
                            key={nombre}
                            dataKey={nombre}
                            stackId="mrr"
                            fill={nombre === 'Otros' ? 'var(--text-faint)' : SERIES_COLORS[i % SERIES_COLORS.length]}
                            stroke="var(--surface)"
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
                      <li
                        key={a.id}
                        className="db-activity-item"
                        tabIndex={0}
                        onClick={() => navigate(`/contratos/${a.contrato_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/contratos/${a.contrato_id}`);
                          }
                        }}
                      >
                        <div className="db-activity-main">
                          <span className="db-activity-client">{a.cliente}</span>
                          <span className="db-activity-transition">
                            {a.etapa_anterior && <>{etapaCorta(a.etapa_anterior)} <ArrowRight size={9} /></>}
                            {etapaCorta(a.etapa_nueva)}
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

            <div className="db-panel-row-3">

              {/* Volumen de contratos activos */}
              <div className="db-panel-card">
                <p className="db-section-label"><Layers size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />Volumen</p>
                <h3 className="db-section-title">Contratos por estado</h3>
                {!hayCarteraEstado ? (
                  <div className="db-empty">
                    <p>Sin contratos registrados todavía.</p>
                  </div>
                ) : (
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cartera_estado.por_estado} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--bg-inset)" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} dy={8} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} />
                        <RechartsTooltip content={<EstadoTooltip />} cursor={{ fill: 'var(--bg-page)' }} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {cartera_estado.por_estado.map((e) => (
                            <Cell key={e.estado} fill={ESTADO_COLOR[e.estado]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Riesgo de cartera */}
              <div className="db-panel-card">
                <p className="db-section-label"><ShieldAlert size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />Riesgo</p>
                <h3 className="db-section-title">Riesgo de cartera</h3>
                <span className={`db-kpi-value-compact ${cartera_estado.pct_riesgo >= 15 ? 'color-red' : cartera_estado.pct_riesgo > 0 ? 'color-amber' : 'color-emerald'}`} style={{ display: 'block', marginBottom: 10 }}>
                  {cartera_estado.pct_riesgo}% en riesgo
                </span>
                {!hayCarteraEstado ? (
                  <div className="db-empty">
                    <p>Sin contratos registrados todavía.</p>
                  </div>
                ) : (
                  <>
                    {montoTotalEstado > 0 && (
                      <div className="an-estado-bar" title={cartera_estado.por_estado.map((e) => `${e.label}: ${e.count}`).join(' · ')}>
                        {cartera_estado.por_estado.filter((e) => e.monto > 0).map((e) => (
                          <div
                            key={e.estado}
                            className="an-estado-seg"
                            style={{ width: `${(e.monto / montoTotalEstado) * 100}%`, backgroundColor: ESTADO_COLOR[e.estado] }}
                          ></div>
                        ))}
                      </div>
                    )}
                    <div className="an-estado-legend">
                      {cartera_estado.por_estado.map((e) => (
                        <span key={e.estado} className="an-estado-legend-item">
                          <span className="an-estado-dot" style={{ backgroundColor: ESTADO_COLOR[e.estado] }}></span>
                          {e.label} · {e.count}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Valor total negociado */}
              <div className="db-panel-card">
                <p className="db-section-label"><TrendingUp size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />Cartera</p>
                <div className="db-panel-head-row">
                  <h3 className="db-section-title">Valor total negociado</h3>
                  <span className="db-trend color-emerald">{fmtCompact(valor_negociado.total_vigente)}</span>
                </div>
                {!hayValorNegociado ? (
                  <div className="db-empty">
                    <p>Sin contratos firmados en los últimos 6 meses.</p>
                  </div>
                ) : (
                  <div style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={valor_negociado.data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--bg-inset)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}k`} />
                        <RechartsTooltip content={<ValorNegociadoTooltip />} cursor={{ fill: 'var(--bg-page)' }} />
                        <Bar dataKey="monto_k" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
