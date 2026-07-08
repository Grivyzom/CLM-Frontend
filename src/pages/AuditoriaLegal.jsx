import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Search, Filter, ShieldCheck, ShieldAlert, 
  FileWarning, Activity, ChevronRight, X,
  CheckCircle, AlertTriangle, Info, Download, RefreshCw,
  AlertOctagon, ArrowRight, CheckCircle2
} from 'lucide-react';
import TopbarActions from '../components/layout/TopbarActions';
import Svg from '../components/ui/Svg';
import { getAuditoria } from '../api';
import './AuditoriaLegal.css';

// Mock Data
const INITIAL_KPIS = {
  complianceScore: 92,
  highRiskContracts: 4,
  nonStandardClauses: 15,
  pendingAudits: 7
};

const RISK_DISTRIBUTION = [
  { name: 'Riesgo Bajo', value: 145, color: 'var(--success-alt)' },
  { name: 'Riesgo Medio', value: 34, color: 'var(--warning-vivid)' },
  { name: 'Riesgo Alto', value: 4, color: 'var(--danger-bright)' }
];

const AUDIT_LOGS = [
  { id: 1, user: 'Ana Martínez', action: 'Modificó cláusula de Confidencialidad', target: 'Contrato ACME Corp', date: '2026-07-06T10:30:00', risk: 'medium', details: 'Se agregó el párrafo 4.3 eximiendo responsabilidad cruzada.', ip: '190.22.45.12', session: 'WEB_CHROME' },
  { id: 2, user: 'Sistema', action: 'Alerta: Vencimiento próximo (7 días)', target: 'Licencia SoftTrack Pro', date: '2026-07-06T09:15:00', risk: 'high', details: 'El contrato expira sin renovación automática habilitada. Se notificó a Legal.', ip: '127.0.0.1', session: 'SYSTEM_JOB' },
  { id: 3, user: 'Carlos Ruiz', action: 'Firmó digitalmente', target: 'NDA GlobalTech', date: '2026-07-05T16:45:00', risk: 'low', details: 'Firma completada vía integración con DocuSign.', ip: '201.55.10.88', session: 'APP_IOS' },
  { id: 4, user: 'Elena Gómez', action: 'Creó nueva versión (v2)', target: 'Acuerdo Servicios Zeta', date: '2026-07-05T11:20:00', risk: 'medium', details: 'Nueva versión generada a partir de plantilla estándar modificada.', ip: '190.22.45.14', session: 'WEB_SAFARI' },
  { id: 5, user: 'Sistema', action: 'Validación de compliance exitosa', target: 'Renovación Omega', date: '2026-07-04T14:10:00', risk: 'low', details: 'El análisis automatizado no encontró desviaciones en las cláusulas obligatorias.', ip: '127.0.0.1', session: 'SYSTEM_JOB' }
];

const CRITICAL_CONTRACTS = [
  { id: 'C-892', client: 'TechNova Inc.', issue: 'Límite de responsabilidad excede política (>20%)', type: 'SaaS Agreement', status: 'En revisión' },
  { id: 'C-901', client: 'Global Logistics', issue: 'Falta cláusula de rescisión por incumplimiento', type: 'SLA', status: 'Pendiente' },
  { id: 'C-915', client: 'FinCorp', issue: 'Jurisdicción no estándar (Islas Caimán)', type: 'NDA', status: 'Escalado' },
  { id: 'C-920', client: 'MegaRetail', issue: 'Renovación automática sin preaviso', type: 'Distribución', status: 'Urgente' }
];

export default function AuditoriaLegal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [riskDistribution, setRiskDistribution] = useState(RISK_DISTRIBUTION);
  const [criticalContracts, setCriticalContracts] = useState(CRITICAL_CONTRACTS);
  const [auditLogs, setAuditLogs] = useState(AUDIT_LOGS);
  const [copied, setCopied] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  const showToast = (type, text) => {
    setModalMessage({ type, text });
    setTimeout(() => setModalMessage(null), 3000);
  };

  const filteredLogs = auditLogs.filter(log => 
    log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyInfo = () => {
    if (!selectedEvent) return;
    const info = `Responsable: ${selectedEvent.user}\nFecha: ${new Date(selectedEvent.date).toLocaleString('es-CL')}\nCambio emitido: ${selectedEvent.action} - ${selectedEvent.target}`;
    navigator.clipboard.writeText(info).then(() => {
      setCopied(true);
      showToast('success', 'Información del evento copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGoToDetail = () => {
    if (!selectedEvent?.technicalDetailId) {
      showToast('error', 'No existe detalle técnico para este evento');
      return;
    }
    showToast('info', `Redirigiendo al detalle técnico (ID: ${selectedEvent.technicalDetailId})...`);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAuditoria();
      setKpis(data.kpis);
      setRiskDistribution(data.riskDistribution);
      setCriticalContracts(data.criticalContracts);
      setAuditLogs(data.auditLogs);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos de auditoría legal');
      showToast('error', 'No se pudieron sincronizar los datos del servidor');
    } finally {
      setLoading(false);
    }
  };

  const pageRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

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

  // Hover Outline Drawings
  useGSAP(() => {
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
      interactiveElements.forEach(el => el.addEventListener('mouseenter', handleMouseEnter));
    }

    return () => {
      if (interactiveElements) {
        interactiveElements.forEach(el => el.removeEventListener('mouseenter', handleMouseEnter));
      }
    };
  }, { dependencies: [loading, auditLogs, criticalContracts, searchTerm], scope: pageRef });

  const handleRefresh = () => {
    fetchData();
  };

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

  return (
    <div className="auditoria-page" ref={pageRef}>
      {/* ── Topbar ── */}
      <div className="al-topbar">
        <div className="al-topbar-left">
          <p>Compliance & Riesgos</p>
          <h1>Auditoría Legal</h1>
        </div>
        <div className="al-topbar-right">
          <span className="al-topbar-date">
            {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="al-topbar-divider"></div>
          <button className="al-icon-btn" onClick={handleRefresh} title="Actualizar datos">
            <RefreshCw size={14} className={loading ? 'al-spin' : ''} />
          </button>
          <button className="al-icon-btn" title="Exportar reporte de auditoría">
            <Download size={14} />
          </button>
          <TopbarActions />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="al-body">
        {/* Stats Grid */}
        <div className="al-stats-grid">
          <div className="al-stat-card">
            <div className="al-stat-icon blue">
              <ShieldCheck size={18} color="var(--primary)" />
            </div>
            <div>
              <p className="al-stat-label">Score Compliance</p>
              <p className="al-stat-value blue">{kpis.complianceScore}%</p>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon red">
              <ShieldAlert size={18} color="var(--danger)" />
            </div>
            <div>
              <p className="al-stat-label">Riesgo Crítico</p>
              <p className="al-stat-value red">{kpis.highRiskContracts}</p>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon amber">
              <AlertTriangle size={18} color="var(--warning)" />
            </div>
            <div>
              <p className="al-stat-label">No Estándar</p>
              <p className="al-stat-value amber">{kpis.nonStandardClauses}</p>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon gray">
              <FileWarning size={18} color="var(--text-faint)" />
            </div>
            <div>
              <p className="al-stat-label">Aud. Pendientes</p>
              <p className="al-stat-value gray">{kpis.pendingAudits}</p>
            </div>
          </div>
        </div>

        <div className="al-main-grid">
          {/* Columna Principal: Contratos Críticos y Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div className="al-panel-card">
              <div className="al-section-header">
                <div>
                  <p className="al-section-label">Alertas Activas</p>
                  <h3 className="al-section-title">Contratos con Desviación Crítica</h3>
                </div>
              </div>
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
                        <td style={{ color: 'var(--danger)', fontWeight: 500 }}>{c.issue}</td>
                        <td>
                          <span className="al-badge al-badge-high">{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="al-panel-card">
              <div className="al-section-header">
                <div>
                  <h3 className="al-section-title">Trazabilidad Total</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="al-btn-primary" onClick={() => showToast('info', 'Redirigiendo al historial completo del software...')}>
                    Historial del Sistema
                  </button>
                  <div className="al-search-wrapper">
                    <div className="al-search-icon">
                      <Search size={12} color="var(--text-faint)" />
                    </div>
                    <input 
                      type="text" 
                      className="al-search-input"
                      placeholder="Buscar evento..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="al-icon-btn"><Filter size={12} /></button>
                </div>
              </div>
              <ul className="al-activity-list">
                {filteredLogs.map(log => (
                  <li 
                    key={log.id} 
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
                          {log.risk.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
                {filteredLogs.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No se encontraron eventos para "{searchTerm}"
                  </div>
                )}
              </ul>
            </div>

          </div>

          {/* Columna Lateral: Gráficos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="al-panel-card">
              <div className="al-section-header">
                <div>
                  <p className="al-section-label">Distribución</p>
                  <h3 className="al-section-title">Nivel de Riesgo General</h3>
                </div>
              </div>
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
                      contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {riskDistribution.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></div>
                    {item.name} ({item.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="al-panel-card" style={{ flex: 1 }}>
              <div className="al-section-header">
                <div>
                  <p className="al-section-label">Recomendaciones</p>
                  <h3 className="al-section-title">Acciones Sugeridas</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--danger-bg)', borderRadius: '6px', border: '1px solid var(--danger-soft)' }}>
                  <strong style={{ color: 'var(--danger)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Estandarizar Límite Responsabilidad</strong>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--danger-deep)' }}>4 contratos recientes superan el cap del 100%. Revisa la plantilla base.</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--warning-bg)', borderRadius: '6px', border: '1px solid var(--warning-soft)' }}>
                  <strong style={{ color: 'var(--warning-bright)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Actualizar Política SLA</strong>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--warning-deep)' }}>La cláusula 4.2 está siendo modificada en el 80% de los nuevos acuerdos.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Detalles del Evento */}
      {selectedEvent && (
        <div className="al-modal-overlay" onClick={() => { setSelectedEvent(null); setModalMessage(null); setCopied(false); }}>
          <div className="al-modal-content" onClick={e => e.stopPropagation()}>
            <div className="al-modal-header">
              <div>
                <p className="al-modal-title">Detalle del Evento</p>
                <p className="al-modal-subtitle">Información extendida del registro de auditoría</p>
              </div>
              <button type="button" className="al-modal-close-icon" onClick={() => { setSelectedEvent(null); setModalMessage(null); setCopied(false); }}>
                ×
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
                <span className="al-modal-label" style={{ marginBottom: '4px' }}>Detalles Técnicos Adicionales</span>
                <div className="al-modal-extra">
                  {selectedEvent.details || 'El sistema no registró anotaciones adicionales para este evento.'}
                </div>
              </div>
            </div>

            <div className="al-modal-footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="al-btn-secondary" onClick={handleCopyInfo}>
                  {copied ? 'Copiado ✓' : 'Copiar info'}
                </button>
                <button className="al-btn-secondary" onClick={handleGoToDetail}>
                  Ver Detalle Técnico
                </button>
              </div>
              <button className="al-btn-primary" onClick={() => { setSelectedEvent(null); setModalMessage(null); setCopied(false); }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
