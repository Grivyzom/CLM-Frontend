import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  Search, ShieldCheck, ShieldAlert,
  FileWarning, Activity, X,
  CheckCircle, AlertTriangle, Info, Download, RefreshCw,
  AlertOctagon, CheckCircle2, History, Inbox
} from 'lucide-react';
import TopbarActions from '../components/layout/TopbarActions';
import { useAuth } from '../contexts/AuthContext';
import { getAuditoria } from '../api';
import './AuditoriaLegal.css';

const RISK_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'high', label: 'Alto' },
  { id: 'medium', label: 'Medio' },
  { id: 'low', label: 'Bajo' },
];

const RISK_LABELS = { high: 'ALTO', medium: 'MEDIO', low: 'BAJO' };

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AuditoriaLegal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [riskDistribution, setRiskDistribution] = useState([]);
  const [criticalContracts, setCriticalContracts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  const navigate = useNavigate();
  const { user, isModerador, isClienteExterno } = useAuth();
  const canVerHistorial = isClienteExterno || !!user?.isSuperadmin || isModerador;

  const requestSeq = useRef(0);

  const showToast = (type, text) => {
    setModalMessage({ type, text });
    setTimeout(() => setModalMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await getAuditoria();
      if (seq !== requestSeq.current) return;
      setKpis(data.kpis);
      setRiskDistribution(data.riskDistribution || []);
      setCriticalContracts(data.criticalContracts || []);
      setAuditLogs(data.auditLogs || []);
      setError(null);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      setError('No se pudieron cargar los datos de auditoría legal.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const closeModal = useCallback(() => {
    setSelectedEvent(null);
    setModalMessage(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedEvent, closeModal]);

  const term = searchTerm.trim().toLowerCase();
  const filteredLogs = useMemo(() => auditLogs.filter(log => {
    if (riskFilter !== 'all' && log.risk !== riskFilter) return false;
    if (!term) return true;
    return (log.target || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.user || '').toLowerCase().includes(term);
  }), [auditLogs, riskFilter, term]);

  const totalRiskContracts = riskDistribution.reduce((acc, item) => acc + (item.value || 0), 0);

  const handleCopyInfo = () => {
    if (!selectedEvent) return;
    const info = `Responsable: ${selectedEvent.user}\nFecha: ${new Date(selectedEvent.date).toLocaleString('es-CL')}\nCambio emitido: ${selectedEvent.action} - ${selectedEvent.target}`;
    navigator.clipboard.writeText(info).then(() => {
      setCopied(true);
      showToast('success', 'Información del evento copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const header = ['Fecha', 'Usuario', 'Acción', 'Objetivo', 'Riesgo', 'IP', 'Origen', 'Detalles'];
    const rows = filteredLogs.map(log => [
      new Date(log.date).toLocaleString('es-CL'),
      log.user, log.action, log.target,
      RISK_LABELS[log.risk] || log.risk,
      log.ip, log.session, log.details,
    ].map(csvEscape).join(';'));
    const csv = '\ufeff' + [header.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageRef = useRef(null);

  // Entrada en dos fases: la estructura (topbar, stat cards, paneles) existe
  // desde el mount, así que se anima de inmediato sin esperar el fetch; los
  // valores y la actividad se animan aparte cuando llegan los datos.
  const structureAnimatedRef = useRef(false);

  useGSAP(() => {
    if (sessionStorage.getItem('auditoria_animated') === 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = pageRef.current;
    if (!root) return;

    if (!structureAnimatedRef.current) {
      structureAnimatedRef.current = true;

      const topbar = root.querySelector('.al-topbar');
      const statCards = root.querySelectorAll('.al-stat-card');
      const panels = root.querySelectorAll('.al-panel-card');

      const tl = gsap.timeline();

      if (topbar) {
        tl.fromTo(topbar, { y: -14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
      if (statCards.length > 0) {
        tl.fromTo(statCards, { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.32, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.22');
      }
      if (panels.length > 0) {
        tl.fromTo(panels, { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.25');
      }

      // Auto-draw de iconos SVG: todas las lecturas de getTotalLength() antes
      // de escribir estilos, para evitar layout thrashing en la entrada.
      const paths = root.querySelectorAll(
        'svg.lucide path, svg.lucide polyline, svg.lucide line, svg.lucide circle, svg.lucide rect'
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
      const kpiValues = root.querySelectorAll('.al-stat-value');
      const activityItems = root.querySelectorAll('.al-activity-item');

      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem('auditoria_animated', 'true');
        }
      });

      if (kpiValues.length > 0) {
        tl.fromTo(kpiValues, { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' });
      }
      if (activityItems.length > 0) {
        tl.fromTo(activityItems, { x: -10, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.22');
      }
    }
  }, { dependencies: [loading], scope: pageRef });

  // Redibujado del trazo de iconos al hacer hover sobre elementos interactivos
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handleMouseEnter = (e) => {
      const paths = e.currentTarget.querySelectorAll(
        'svg.lucide path, svg.lucide polyline, svg.lucide line, svg.lucide circle, svg.lucide rect'
      );
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) {
            gsap.fromTo(path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.6,
                ease: 'power2.out',
                clearProps: 'strokeDasharray,strokeDashoffset'
              }
            );
          }
        } catch (e) {}
      });
    };

    const interactiveElements = pageRef.current?.querySelectorAll(
      '.al-stat-card, .al-activity-item, .al-btn-primary, .al-icon-btn, .al-btn-secondary, tr'
    );

    if (interactiveElements) {
      interactiveElements.forEach(el => el.addEventListener('mouseenter', handleMouseEnter, { once: true }));
    }

    return () => {
      if (interactiveElements) {
        interactiveElements.forEach(el => el.removeEventListener('mouseenter', handleMouseEnter));
      }
    };
  }, { dependencies: [loading, auditLogs, criticalContracts, searchTerm, riskFilter], scope: pageRef });

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'high': return <AlertOctagon size={14} />;
      case 'medium': return <AlertTriangle size={14} />;
      case 'low': return <CheckCircle2 size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getRiskClass = (risk) => {
    switch (risk) {
      case 'high': return 'al-badge-high';
      case 'medium': return 'al-badge-medium';
      case 'low': return 'al-badge-low';
      default: return 'al-badge-info';
    }
  };

  const getRiskIconClass = (risk) => {
    switch (risk) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'info';
    }
  };

  const kpiValue = (v, suffix = '') => (loading || v === null || v === undefined) ? '—' : `${v}${suffix}`;

  return (
    <div className="auditoria-page" ref={pageRef}>
      {/* ── Topbar ── */}
      <div className="al-topbar">
        <div className="al-topbar-left">
          <p>Compliance &amp; Riesgos</p>
          <h1>Auditoría Legal</h1>
        </div>
        <div className="al-topbar-right">
          <span className="al-topbar-date">
            {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="al-topbar-divider"></div>
          <button className="al-icon-btn" onClick={fetchData} title="Actualizar datos" aria-label="Actualizar datos">
            <RefreshCw size={14} className={loading ? 'al-spin' : ''} />
          </button>
          <button
            className="al-icon-btn"
            title="Exportar registro de auditoría (CSV)"
            aria-label="Exportar registro de auditoría"
            onClick={handleExport}
            disabled={loading || filteredLogs.length === 0}
          >
            <Download size={14} />
          </button>
          <TopbarActions />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="al-body">
        {error && (
          <div className="al-error-banner" role="alert">
            <AlertTriangle size={14} />
            <span>{error}</span>
            <button className="al-btn-secondary" onClick={fetchData}>Reintentar</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="al-stats-grid">
          <div className="al-stat-card">
            <div className="al-stat-icon blue">
              <ShieldCheck size={18} color="var(--primary)" />
            </div>
            <div>
              <p className="al-stat-label">Score Compliance</p>
              <p className="al-stat-value blue">{kpiValue(kpis?.complianceScore, '%')}</p>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon red">
              <ShieldAlert size={18} color="var(--danger)" />
            </div>
            <div>
              <p className="al-stat-label">Riesgo Crítico</p>
              <p className="al-stat-value red">{kpiValue(kpis?.highRiskContracts)}</p>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon amber">
              <AlertTriangle size={18} color="var(--warning)" />
            </div>
            <div>
              <p className="al-stat-label">No Estándar</p>
              <p className="al-stat-value amber">{kpiValue(kpis?.nonStandardClauses)}</p>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon gray">
              <FileWarning size={18} color="var(--text-faint)" />
            </div>
            <div>
              <p className="al-stat-label">Aud. Pendientes</p>
              <p className="al-stat-value gray">{kpiValue(kpis?.pendingAudits)}</p>
            </div>
          </div>
        </div>

        <div className="al-main-grid">
          {/* Columna Principal: Contratos Críticos y Log */}
          <div className="al-col">

            <div className="al-panel-card">
              <div className="al-section-header">
                <div>
                  <p className="al-section-label">Alertas Activas</p>
                  <h3 className="al-section-title">Contratos con Desviación Crítica</h3>
                </div>
              </div>
              {criticalContracts.length > 0 ? (
                <div className="al-table-wrapper">
                  <table className="al-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente / Contraparte</th>
                        <th>Tipo</th>
                        <th>Hallazgo Legal</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criticalContracts.map(c => (
                        <tr key={c.id}>
                          <td className="al-td-mono">{c.id}</td>
                          <td className="al-td-bold">{c.client}</td>
                          <td>{c.type}</td>
                          <td className="al-td-issue">{c.issue}</td>
                          <td>
                            <span className="al-badge al-badge-high">{c.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="al-empty-state">
                  <CheckCircle size={18} />
                  <p>{loading ? 'Cargando desviaciones…' : 'Sin desviaciones críticas detectadas.'}</p>
                </div>
              )}
            </div>

            <div className="al-panel-card">
              <div className="al-section-header al-section-header-wrap">
                <div>
                  <p className="al-section-label">Registro de Eventos</p>
                  <h3 className="al-section-title">Trazabilidad Total</h3>
                </div>
                <div className="al-toolbar">
                  {canVerHistorial && (
                    <button className="al-btn-primary" onClick={() => navigate('/historial')}>
                      <History size={12} />
                      Historial del Sistema
                    </button>
                  )}
                  <div className="al-search-wrapper">
                    <div className="al-search-icon">
                      <Search size={12} color="var(--text-faint)" />
                    </div>
                    <input
                      type="text"
                      className="al-search-input"
                      placeholder="Buscar evento…"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="al-filter-pills" role="group" aria-label="Filtrar por nivel de riesgo">
                {RISK_FILTERS.map(f => (
                  <button
                    key={f.id}
                    className={`al-filter-pill ${riskFilter === f.id ? 'active' : ''}`}
                    aria-pressed={riskFilter === f.id}
                    onClick={() => setRiskFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <ul className="al-activity-list">
                {filteredLogs.map(log => (
                  <li key={log.id}>
                    <button
                      type="button"
                      className="al-activity-item"
                      onClick={() => setSelectedEvent(log)}
                    >
                      <div className={`al-activity-icon ${getRiskIconClass(log.risk)}`}>
                        {getRiskIcon(log.risk)}
                      </div>
                      <div className="al-activity-content">
                        <div className="al-activity-text">
                          <strong>{log.user}</strong> {log.action} en <strong>{log.target}</strong>
                        </div>
                        <div className="al-activity-meta">
                          <span>{new Date(log.date).toLocaleString('es-CL')}</span>
                          <span className={`al-badge ${getRiskClass(log.risk)}`}>
                            {RISK_LABELS[log.risk] || log.risk}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
                {filteredLogs.length === 0 && (
                  <li className="al-empty-state">
                    <Inbox size={18} />
                    <p>
                      {loading
                        ? 'Cargando eventos…'
                        : (auditLogs.length === 0
                          ? 'Aún no hay eventos de auditoría registrados.'
                          : `No se encontraron eventos${term ? ` para "${searchTerm}"` : ' con este filtro'}.`)}
                    </p>
                  </li>
                )}
              </ul>
            </div>

          </div>

          {/* Columna Lateral: Gráficos */}
          <div className="al-col">
            <div className="al-panel-card">
              <div className="al-section-header">
                <div>
                  <p className="al-section-label">Distribución</p>
                  <h3 className="al-section-title">Nivel de Riesgo General</h3>
                </div>
              </div>
              {totalRiskContracts > 0 ? (
                <>
                  <div className="al-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            fontSize: '12px',
                            boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="al-chart-legend">
                    {riskDistribution.map((item, idx) => (
                      <div key={idx} className="al-chart-legend-item">
                        <span className="al-chart-legend-dot" style={{ backgroundColor: item.color }}></span>
                        {item.name} ({item.value})
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="al-empty-state al-empty-chart">
                  <Activity size={18} />
                  <p>{loading ? 'Cargando distribución…' : 'Sin contratos para clasificar por riesgo.'}</p>
                </div>
              )}
            </div>

            <div className="al-panel-card al-panel-grow">
              <div className="al-section-header">
                <div>
                  <p className="al-section-label">Resumen</p>
                  <h3 className="al-section-title">Estado de Cumplimiento</h3>
                </div>
              </div>
              <div className="al-reco-list">
                {!loading && kpis?.highRiskContracts > 0 && (
                  <div className="al-reco al-reco-danger">
                    <strong>Revisar contratos en riesgo</strong>
                    <p>{kpis.highRiskContracts} contrato{kpis.highRiskContracts === 1 ? '' : 's'} en mora o suspendido{kpis.highRiskContracts === 1 ? '' : 's'} requieren gestión de cobranza o regularización.</p>
                  </div>
                )}
                {!loading && kpis?.pendingAudits > 0 && (
                  <div className="al-reco al-reco-warning">
                    <strong>Auditorías pendientes</strong>
                    <p>{kpis.pendingAudits} contrato{kpis.pendingAudits === 1 ? '' : 's'} en revisión o aprobación esperan validación legal.</p>
                  </div>
                )}
                {!loading && kpis?.nonStandardClauses > 0 && (
                  <div className="al-reco al-reco-warning">
                    <strong>Cláusulas no estándar</strong>
                    <p>Se registraron {kpis.nonStandardClauses} modificaciones sobre obligaciones SLA. Verifica que sigan la plantilla base.</p>
                  </div>
                )}
                {!loading && kpis && !kpis.highRiskContracts && !kpis.pendingAudits && !kpis.nonStandardClauses && (
                  <div className="al-reco al-reco-success">
                    <strong>Todo en orden</strong>
                    <p>No hay desviaciones de compliance que requieran acción inmediata.</p>
                  </div>
                )}
                {loading && (
                  <div className="al-empty-state">
                    <RefreshCw size={16} className="al-spin" />
                    <p>Evaluando estado de cumplimiento…</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Detalles del Evento */}
      {selectedEvent && (
        <div className="al-modal-overlay" onClick={closeModal}>
          <div
            className="al-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle del evento de auditoría"
            onClick={e => e.stopPropagation()}
          >
            <div className="al-modal-header">
              <div>
                <p className="al-modal-title">Detalle del Evento</p>
                <p className="al-modal-subtitle">Información extendida del registro de auditoría</p>
              </div>
              <button type="button" className="al-modal-close-icon" aria-label="Cerrar" onClick={closeModal}>
                <X size={16} />
              </button>
            </div>

            {modalMessage && (
              <div className={`al-modal-toast al-toast-${modalMessage.type}`}>
                {modalMessage.type === 'success' && <CheckCircle size={16} />}
                {modalMessage.type === 'error' && <AlertTriangle size={16} />}
                {modalMessage.type === 'info' && <Info size={16} />}
                {modalMessage.text}
              </div>
            )}

            <div className="al-modal-body">
              <div className="al-modal-event-summary">
                <div className={`al-modal-event-icon-wrap ${getRiskIconClass(selectedEvent.risk)}`}>
                  {getRiskIcon(selectedEvent.risk)}
                </div>
                <div className="al-modal-event-text">
                  <h4>{selectedEvent.action}</h4>
                  <p>{selectedEvent.target}</p>
                </div>
              </div>

              <div className="al-modal-details-grid">
                <div className="al-modal-row">
                  <span className="al-modal-label">Usuario / Actor</span>
                  <span className="al-modal-value">{selectedEvent.user}</span>
                </div>
                <div className="al-modal-row">
                  <span className="al-modal-label">Fecha y Hora</span>
                  <span className="al-modal-value">{new Date(selectedEvent.date).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="al-modal-row">
                  <span className="al-modal-label">Dirección IP</span>
                  <span className="al-modal-value-mono">{selectedEvent.ip || 'N/A'}</span>
                </div>
                <div className="al-modal-row">
                  <span className="al-modal-label">Sesión / Origen</span>
                  <span className="al-modal-value">{selectedEvent.session || 'N/A'}</span>
                </div>
              </div>

              <div className="al-modal-row">
                <span className="al-modal-label">Detalles Técnicos Adicionales</span>
                <div className="al-modal-extra">
                  {selectedEvent.details || 'El sistema no registró anotaciones adicionales para este evento.'}
                </div>
              </div>
            </div>

            <div className="al-modal-footer">
              <button className="al-btn-secondary" onClick={handleCopyInfo}>
                {copied ? 'Copiado ✓' : 'Copiar info'}
              </button>
              <button className="al-btn-primary" onClick={closeModal}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
