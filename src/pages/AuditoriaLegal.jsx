import React, { useState, useEffect } from 'react';
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
import './AuditoriaLegal.css';

// Mock Data
const INITIAL_KPIS = {
  complianceScore: 92,
  highRiskContracts: 4,
  nonStandardClauses: 15,
  pendingAudits: 7
};

const RISK_DISTRIBUTION = [
  { name: 'Riesgo Bajo', value: 145, color: '#10b981' },
  { name: 'Riesgo Medio', value: 34, color: '#f59e0b' },
  { name: 'Riesgo Alto', value: 4, color: '#ef4444' }
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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [copied, setCopied] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  const showToast = (type, text) => {
    setModalMessage({ type, text });
    setTimeout(() => setModalMessage(null), 3000);
  };

  const filteredLogs = AUDIT_LOGS.filter(log => 
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

  useEffect(() => {
    const interval = setInterval(() => {
      setKpis(prev => ({
        complianceScore: Math.min(100, Math.max(85, prev.complianceScore + Math.floor(Math.random() * 3) - 1)),
        highRiskContracts: Math.max(0, prev.highRiskContracts + Math.floor(Math.random() * 3) - 1),
        nonStandardClauses: Math.max(5, prev.nonStandardClauses + Math.floor(Math.random() * 3) - 1),
        pendingAudits: Math.max(0, prev.pendingAudits + Math.floor(Math.random() * 3) - 1)
      }));
    }, 4500); // Actualización simulada cada 4.5s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'high': return <AlertOctagon size={16} className="au-badge-high" style={{ padding: 0, background: 'none' }} />;
      case 'medium': return <AlertTriangle size={16} className="au-badge-medium" style={{ padding: 0, background: 'none' }} />;
      case 'low': return <CheckCircle2 size={16} className="au-badge-low" style={{ padding: 0, background: 'none' }} />;
      default: return <Activity size={16} />;
    }
  };

  const getRiskClass = (risk) => {
    switch (risk) {
      case 'high': return 'au-badge-high';
      case 'medium': return 'au-badge-medium';
      case 'low': return 'au-badge-low';
      default: return 'au-badge-info';
    }
  };

  return (
    <div className="au-container">
      {/* Header */}
      <div className="au-topbar">
        <div>
          <p className="au-topbar-subtitle">Compliance & Riesgos</p>
          <h1 className="au-topbar-title">Auditoría Legal</h1>
        </div>
        <div className="au-topbar-actions">
          <span className="au-date">
            {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="au-divider"></div>
          <button className="au-icon-btn" onClick={handleRefresh} title="Actualizar datos">
            <RefreshCw size={14} className={loading ? 'db-spin' : ''} />
          </button>
          <button className="au-icon-btn" title="Exportar reporte de auditoría">
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="au-scroll-area">
        {/* KPIs Premium Strip */}
        <div className="au-metrics-strip">
          <div className="au-metric-item">
            <div className="au-metric-label">
              <div className="au-status-dot au-dot-emerald"></div> Score Compliance
            </div>
            <div className="au-metric-val">{kpis.complianceScore}%</div>
            <div className="au-metric-sub">Contratos alineados a políticas</div>
          </div>
          
          <div className="au-metric-divider"></div>
          
          <div className="au-metric-item">
            <div className="au-metric-label">
              <div className="au-status-dot au-dot-red"></div> Riesgo Crítico
            </div>
            <div className="au-metric-val">{kpis.highRiskContracts}</div>
            <div className="au-metric-sub">Requieren atención inmediata</div>
          </div>

          <div className="au-metric-divider"></div>

          <div className="au-metric-item">
            <div className="au-metric-label">
              <div className="au-status-dot au-dot-amber"></div> No Estándar
            </div>
            <div className="au-metric-val">{kpis.nonStandardClauses}</div>
            <div className="au-metric-sub">Desviaciones aprobadas</div>
          </div>

          <div className="au-metric-divider"></div>

          <div className="au-metric-item">
            <div className="au-metric-label">
              <div className="au-status-dot au-dot-blue"></div> Aud. Pendientes
            </div>
            <div className="au-metric-val">{kpis.pendingAudits}</div>
            <div className="au-metric-sub">Revisiones programadas</div>
          </div>
        </div>

        <div className="au-main-grid">
          {/* Columna Principal: Contratos Críticos y Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="au-panel-card-compact">
              <div className="au-section-header-compact">
                <div>
                  <p className="au-section-label">Alertas Activas</p>
                  <h3 className="au-section-title">Contratos con Desviación Crítica</h3>
                </div>
              </div>
              <div className="au-table-wrapper">
                <table className="au-table">
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
                    {CRITICAL_CONTRACTS.map(c => (
                      <tr key={c.id}>
                        <td className="au-td-mono">{c.id}</td>
                        <td className="au-td-bold">{c.client}</td>
                        <td>{c.type}</td>
                        <td style={{ color: '#dc2626', fontWeight: 500 }}>{c.issue}</td>
                        <td>
                          <span className="au-badge au-badge-high">{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="au-panel-card-compact">
              <div className="au-section-header-compact">
                <div>
                  <p className="au-section-label">Trazabilidad Total</p>
                  <h3 className="au-section-title">Audit Trail</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#a8a29e' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar evento..." 
                      style={{ padding: '6px 12px 6px 30px', borderRadius: '6px', border: '1px solid #eceae4', fontSize: '13px', width: '200px' }}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="au-icon-btn"><Filter size={14} /></button>
                </div>
              </div>
              <ul className="au-activity-list">
                {AUDIT_LOGS.map(log => (
                  <li 
                    key={log.id} 
                    className="au-activity-item" 
                    onClick={() => setSelectedEvent(log)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="au-activity-icon">
                      {getRiskIcon(log.risk)}
                    </div>
                    <div className="au-activity-content">
                      <div className="au-activity-text">
                        <strong>{log.user}</strong> {log.action} en <strong>{log.target}</strong>
                      </div>
                      <div className="au-activity-meta">
                        <span>{new Date(log.date).toLocaleString('es-CL')}</span>
                        <span className={`au-badge ${getRiskClass(log.risk)}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                          {log.risk.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Columna Lateral: Gráficos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="au-panel-card-compact">
              <div className="au-section-header-compact">
                <div>
                  <p className="au-section-label">Distribución</p>
                  <h3 className="au-section-title">Nivel de Riesgo General</h3>
                </div>
              </div>
              <div className="au-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={RISK_DISTRIBUTION}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {RISK_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {RISK_DISTRIBUTION.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#57534e' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></div>
                    {item.name} ({item.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="au-panel-card-compact" style={{ flex: 1 }}>
              <div className="au-section-header-compact">
                <div>
                  <p className="au-section-label">Recomendaciones</p>
                  <h3 className="au-section-title">Acciones Sugeridas</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <strong style={{ color: '#dc2626', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Estandarizar Límite Responsabilidad</strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d' }}>4 contratos recientes superan el cap del 100%. Revisa la plantilla base.</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                  <strong style={{ color: '#d97706', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Actualizar Política SLA</strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>La cláusula 4.2 está siendo modificada en el 80% de los nuevos acuerdos.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Detalles del Evento */}
      {selectedEvent && (
        <div className="au-modal-overlay" onClick={() => { setSelectedEvent(null); setModalMessage(null); setCopied(false); }}>
          <div className="au-modal-content" onClick={e => e.stopPropagation()}>
            <div className="au-modal-header">
              <div>
                <p className="au-modal-title">Detalle del Evento</p>
                <p className="au-modal-subtitle">Información extendida del registro de auditoría</p>
              </div>
              <button type="button" className="au-modal-close-icon" onClick={() => { setSelectedEvent(null); setModalMessage(null); setCopied(false); }}>
                ×
              </button>
            </div>
            
            {modalMessage && (
              <div className={`au-modal-toast au-toast-${modalMessage.type}`}>
                {modalMessage.type === 'success' && <CheckCircle size={16} />}
                {modalMessage.type === 'error' && <AlertTriangle size={16} />}
                {modalMessage.type === 'info' && <Info size={16} />}
                {modalMessage.text}
              </div>
            )}

            <div className="au-modal-body">
              <div className="au-modal-event-summary">
                <div className="au-modal-event-icon-wrap" style={{ background: selectedEvent.risk === 'high' ? '#fef2f2' : selectedEvent.risk === 'medium' ? '#fffbeb' : '#ecfdf5' }}>
                  {getRiskIcon(selectedEvent.risk)}
                </div>
                <div className="au-modal-event-text">
                  <h4>{selectedEvent.action}</h4>
                  <p>{selectedEvent.target}</p>
                </div>
              </div>

              <div className="au-modal-details-grid">
                <div className="au-modal-row">
                  <span className="au-modal-label">Usuario / Actor</span>
                  <span className="au-modal-value">{selectedEvent.user}</span>
                </div>
                <div className="au-modal-row">
                  <span className="au-modal-label">Fecha y Hora</span>
                  <span className="au-modal-value">{new Date(selectedEvent.date).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="au-modal-row">
                  <span className="au-modal-label">Dirección IP</span>
                  <span className="au-modal-value-mono">{selectedEvent.ip || 'N/A'}</span>
                </div>
                <div className="au-modal-row">
                  <span className="au-modal-label">Sesión / Origen</span>
                  <span className="au-modal-value">{selectedEvent.session || 'N/A'}</span>
                </div>
              </div>

              <div className="au-modal-row">
                <span className="au-modal-label" style={{ marginBottom: '4px' }}>Detalles Técnicos Adicionales</span>
                <div className="au-modal-extra">
                  {selectedEvent.details || 'El sistema no registró anotaciones adicionales para este evento.'}
                </div>
              </div>
            </div>

            <div className="au-modal-footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="au-btn-secondary" onClick={handleCopyInfo}>
                  {copied ? 'Copiado ✓' : 'Copiar info'}
                </button>
                <button className="au-btn-secondary" onClick={handleGoToDetail}>
                  Ver Detalle Técnico
                </button>
              </div>
              <button className="au-btn-primary" onClick={() => { setSelectedEvent(null); setModalMessage(null); setCopied(false); }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
