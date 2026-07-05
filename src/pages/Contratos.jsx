import React, { useState } from 'react';
import './Contratos.css';

// ─── Paleta de estados ──────────────────────────────────────────────────────
const STATUS_CFG = {
  'Borrador':           { color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  'En Revisión':        { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', dot: '#7c3aed' },
  'Pendiente de Firma': { color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', dot: '#0369a1' },
  'Activo':             { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  'Por Renovar':        { color: '#be123c', bg: '#fff1f2', border: '#fecdd3', dot: '#e11d48' },
  'Terminado':          { color: '#7c7670', bg: '#efede8', border: '#d8d4cc', dot: '#b0aaa3' },
};

const SOFTWARE_COLORS = {
  'SoftTrack Pro v3':       { color: '#2563eb', bg: '#eff6ff' },
  'ContaLite v2.1':         { color: '#059669', bg: '#d1fae5' },
  'AnalyticsX Enterprise':  { color: '#7c3aed', bg: '#ede9fe' },
  'Soporte Premium 24×7':   { color: '#0891b2', bg: '#cffafe' },
};

// ─── Data mock ──────────────────────────────────────────────────────────────
const CONTRATOS = [
  {
    id: 'CTR-2026-0041',
    nombre: 'Contrato de Licenciamiento – Acme Corp',
    cliente: 'Acme Corp S.A.',
    software: 'SoftTrack Pro v3',
    plantilla: 'CLS',
    estado: 'Activo',
    mrr: 1200,
    arr: 14400,
    inicio: '2026-01-15',
    renovacion: '2027-01-15',
    facturacion: 'Anual',
    usuarios: 10,
    responsable: 'Laura Méndez',
    creado: '2026-01-10',
    documento: 'Contrato_Licenciamiento_AcmeCorp_v1.pdf',
    anexos: [
      { id: 'ANX-001', nombre: 'Adenda Módulo Analytics', fecha: '2026-04-20', estado: 'Activo' },
    ],
    timeline: [
      { fecha: '2026-01-10 09:14', actor: 'Laura Méndez', accion: 'Borrador creado desde plantilla CLS v4.1' },
      { fecha: '2026-01-12 11:30', actor: 'Jefe Legal', accion: 'Enviado para aprobación interna' },
      { fecha: '2026-01-13 14:55', actor: 'Jefe Legal', accion: 'Aprobado. Enviado a cliente para firma.' },
      { fecha: '2026-01-15 10:02', actor: 'Acme Corp', accion: 'Contrato abierto por el cliente (IP: 201.x.x.x)' },
      { fecha: '2026-01-15 10:17', actor: 'Acme Corp', accion: '✓ Firma electrónica registrada. Contrato activo.' },
    ],
    slas: [
      { obligacion: 'Tiempo de respuesta soporte crítico', valor: '< 1 hora', tipo: 'Soporte' },
      { obligacion: 'Tiempo de respuesta soporte medio', valor: '< 4 horas', tipo: 'Soporte' },
      { obligacion: 'Disponibilidad plataforma', valor: '99.9% mensual', tipo: 'Plataforma' },
      { obligacion: 'Entrega de reportes mensuales', valor: 'Día 5 de cada mes', tipo: 'Reporting' },
    ],
  },
  {
    id: 'CTR-2026-0038',
    nombre: 'Contrato de Servicios – Inversiones del Norte',
    cliente: 'Inversiones del Norte Ltda.',
    software: 'ContaLite v2.1',
    plantilla: 'CPS',
    estado: 'Por Renovar',
    mrr: 400,
    arr: 4800,
    inicio: '2025-07-01',
    renovacion: '2026-07-01',
    facturacion: 'Mensual',
    usuarios: 5,
    responsable: 'Carlos Ruiz',
    creado: '2025-06-22',
    documento: 'CPS_InversionesNorte_v2.pdf',
    anexos: [],
    timeline: [
      { fecha: '2025-06-22 08:30', actor: 'Carlos Ruiz', accion: 'Borrador creado' },
      { fecha: '2025-06-25 16:00', actor: 'Carlos Ruiz', accion: 'Enviado al cliente para revisión' },
      { fecha: '2025-07-01 09:45', actor: 'Inversiones del Norte', accion: '✓ Contrato firmado electrónicamente' },
    ],
    slas: [
      { obligacion: 'Soporte horario hábil', valor: '8×5', tipo: 'Soporte' },
      { obligacion: 'Actualizaciones de versión', valor: 'Incluidas en plan', tipo: 'Plataforma' },
    ],
  },
  {
    id: 'CTR-2026-0035',
    nombre: 'NDA + Licencia AnalyticsX – Grupo Meridian',
    cliente: 'Grupo Meridian S.A.',
    software: 'AnalyticsX Enterprise',
    plantilla: 'CLS',
    estado: 'Pendiente de Firma',
    mrr: 4500,
    arr: 54000,
    inicio: null,
    renovacion: null,
    facturacion: 'Anual',
    usuarios: null,
    responsable: 'Laura Méndez',
    creado: '2026-06-28',
    documento: 'CLS_GrupoMeridian_draft.pdf',
    anexos: [],
    timeline: [
      { fecha: '2026-06-28 14:00', actor: 'Laura Méndez', accion: 'Borrador generado con variables del cliente' },
      { fecha: '2026-06-30 10:20', actor: 'Jefe Legal', accion: 'Revisión completada. Listo para firma.' },
      { fecha: '2026-07-02 11:00', actor: 'Sistema', accion: 'Enviado al cliente. Esperando firma.' },
    ],
    slas: [
      { obligacion: 'Confidencialidad datos BI', valor: '5 años post-contrato', tipo: 'Legal' },
      { obligacion: 'SLA plataforma analytics', valor: '99.95% uptime', tipo: 'Plataforma' },
    ],
  },
  {
    id: 'CTR-2026-0029',
    nombre: 'Soporte Premium – TechSoluciones',
    cliente: 'TechSoluciones SpA',
    software: 'Soporte Premium 24×7',
    plantilla: 'SLA',
    estado: 'En Revisión',
    mrr: 300,
    arr: 3600,
    inicio: null,
    renovacion: null,
    facturacion: 'Mensual',
    usuarios: null,
    responsable: 'Ana Torres',
    creado: '2026-07-01',
    documento: 'SLA_TechSoluciones_borrador.pdf',
    anexos: [],
    timeline: [
      { fecha: '2026-07-01 13:00', actor: 'Ana Torres', accion: 'Borrador creado desde plantilla SLA v2.4' },
      { fecha: '2026-07-03 09:30', actor: 'Jefe Legal', accion: 'En revisión interna. Pendiente aprobación.' },
    ],
    slas: [
      { obligacion: 'Respuesta soporte 24×7', valor: '< 30 min crítico', tipo: 'Soporte' },
    ],
  },
  {
    id: 'CTR-2026-0021',
    nombre: 'Contrato SoftTrack – Constructora Andina',
    cliente: 'Constructora Andina',
    software: 'SoftTrack Pro v3',
    plantilla: 'CLS',
    estado: 'Borrador',
    mrr: 600,
    arr: 7200,
    inicio: null,
    renovacion: null,
    facturacion: 'Mensual',
    usuarios: 5,
    responsable: 'Laura Méndez',
    creado: '2026-07-04',
    documento: null,
    anexos: [],
    timeline: [
      { fecha: '2026-07-04 18:30', actor: 'Laura Méndez', accion: 'Borrador iniciado, pendiente de completar variables' },
    ],
    slas: [],
  },
];

const KANBAN_COLS = ['Borrador', 'En Revisión', 'Pendiente de Firma', 'Activo', 'Por Renovar'];

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtMRR(n) {
  if (!n) return '—';
  return `$${n.toLocaleString('es-CL')} USD`;
}
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

// ─── SVG Icon ────────────────────────────────────────────────────────────────
function Icon({ d, color = '#7c7670', w = 14 }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ estado, size = 'md' }) {
  const c = STATUS_CFG[estado] || STATUS_CFG['Terminado'];
  return (
    <span className={`ct-badge ct-badge-${size}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="ct-badge-dot" style={{ background: c.dot }} />
      {estado}
    </span>
  );
}

// ─── Software Tag ────────────────────────────────────────────────────────────
function SoftwareTag({ software }) {
  const c = SOFTWARE_COLORS[software] || { color: '#5c574f', bg: '#e5e2da' };
  return (
    <span className="ct-sw-tag" style={{ background: c.bg, color: c.color }}>
      {software}
    </span>
  );
}

// ─── Stats Strip ─────────────────────────────────────────────────────────────
function StatsStrip({ contratos }) {
  const activos = contratos.filter(c => c.estado === 'Activo').length;
  const mrr = contratos.filter(c => c.estado === 'Activo').reduce((a, c) => a + (c.mrr || 0), 0);
  const arr = contratos.filter(c => c.estado === 'Activo').reduce((a, c) => a + (c.arr || 0), 0);
  const porRenovar = contratos.filter(c => c.estado === 'Por Renovar').length;
  const pendientes = contratos.filter(c => ['En Revisión', 'Pendiente de Firma', 'Borrador'].includes(c.estado)).length;

  const stats = [
    { label: 'Contratos Activos', value: activos, icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#15803d', bg: '#f0fdf4' },
    { label: 'MRR Bajo Contrato', value: `$${mrr.toLocaleString('es-CL')}`, sub: 'USD/mes', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#2563eb', bg: '#eff6ff' },
    { label: 'ARR Total', value: `$${arr.toLocaleString('es-CL')}`, sub: 'USD/año', icon: ['M22 12h-4l-3 9L9 3l-3 9H2'], color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Por Renovar', value: porRenovar, icon: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15', color: '#be123c', bg: '#fff1f2' },
    { label: 'En Pipeline', value: pendientes, icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'], color: '#d97706', bg: '#fffbeb' },
  ];

  return (
    <div className="ct-stats-grid">
      {stats.map((s, i) => (
        <div key={i} className="ct-stat-card">
          <div className="ct-stat-icon" style={{ background: s.bg }}>
            <Icon d={s.icon} color={s.color} w={16} />
          </div>
          <div className="ct-stat-body">
            <p className="ct-stat-label">{s.label}</p>
            <p className="ct-stat-value">{s.value}</p>
            {s.sub && <p className="ct-stat-sub">{s.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Slide-Over Panel ─────────────────────────────────────────────────────────
function SlideOver({ contrato, onClose, onOpen }) {
  if (!contrato) return null;
  const c = STATUS_CFG[contrato.estado] || STATUS_CFG['Terminado'];
  const days = daysUntil(contrato.renovacion);

  return (
    <>
      <div className="ct-slideover-backdrop" onClick={onClose} />
      <div className="ct-slideover">
        <div className="ct-slideover-header">
          <div>
            <p className="ct-slideover-id">{contrato.id}</p>
            <h3 className="ct-slideover-title">{contrato.nombre}</h3>
          </div>
          <button className="ct-icon-btn" onClick={onClose} title="Cerrar">
            <Icon d="M18 6 6 18M6 6l12 12" color="#7c7670" w={16} />
          </button>
        </div>

        <div className="ct-slideover-body">
          <div className="ct-slideover-status-row">
            <StatusBadge estado={contrato.estado} />
            <SoftwareTag software={contrato.software} />
          </div>

          <div className="ct-slideover-section">
            <p className="ct-section-label">Cliente</p>
            <p className="ct-slideover-client">{contrato.cliente}</p>
          </div>

          <div className="ct-slideover-grid">
            <div className="ct-slideover-field">
              <p className="ct-field-label">MRR</p>
              <p className="ct-field-value ct-mono">{fmtMRR(contrato.mrr)}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">ARR</p>
              <p className="ct-field-value ct-mono">{fmtMRR(contrato.arr)}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Facturación</p>
              <p className="ct-field-value">{contrato.facturacion}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Responsable</p>
              <p className="ct-field-value">{contrato.responsable}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Inicio</p>
              <p className="ct-field-value ct-mono">{fmtDate(contrato.inicio)}</p>
            </div>
            <div className="ct-slideover-field">
              <p className="ct-field-label">Próxima Renovación</p>
              <p className="ct-field-value ct-mono" style={{ color: days !== null && days < 30 ? '#be123c' : 'inherit' }}>
                {fmtDate(contrato.renovacion)}
                {days !== null && days < 60 && (
                  <span className="ct-days-warning"> ({days < 0 ? 'Vencido' : `${days}d`})</span>
                )}
              </p>
            </div>
          </div>

          {contrato.anexos.length > 0 && (
            <div className="ct-slideover-section">
              <p className="ct-section-label">Anexos ({contrato.anexos.length})</p>
              {contrato.anexos.map(a => (
                <div key={a.id} className="ct-slideover-annexe">
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" color="#7c7670" w={13} />
                  <span>{a.nombre}</span>
                  <StatusBadge estado={a.estado} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ct-slideover-footer">
          <button className="ct-btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="ct-btn-primary" onClick={() => onOpen(contrato)}>
            Abrir Workspace
            <Icon d="M5 12h14M12 5l7 7-7 7" color="#fff" w={13} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ contrato, onClick }) {
  const sw = SOFTWARE_COLORS[contrato.software] || { color: '#5c574f', bg: '#e5e2da' };
  const days = daysUntil(contrato.renovacion);

  return (
    <div className="ct-kanban-card" onClick={onClick}>
      <div className="ct-kc-top">
        <span className="ct-kc-id">{contrato.id}</span>
        <span className="ct-kc-sw" style={{ background: sw.bg, color: sw.color }}>
          {contrato.software.split(' ')[0]}
        </span>
      </div>
      <p className="ct-kc-name">{contrato.nombre}</p>
      <p className="ct-kc-client">{contrato.cliente}</p>
      <div className="ct-kc-footer">
        <span className="ct-kc-mrr">{fmtMRR(contrato.mrr)}<span className="ct-kc-mrr-sub">/mes</span></span>
        {days !== null && days < 60 && (
          <span className="ct-kc-alert" style={{ color: days < 0 ? '#be123c' : '#d97706' }}>
            <Icon d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              color={days < 0 ? '#be123c' : '#d97706'} w={11} />
            {days < 0 ? 'Vencido' : `${days}d`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Contract Workspace (Detail) ──────────────────────────────────────────────
function ContractWorkspace({ contrato, onBack }) {
  const [activeTab, setActiveTab] = useState('resumen');

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: 'M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8' },
    { id: 'documento', label: 'Documento', icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h4'] },
    { id: 'historial', label: 'Historial', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
    { id: 'sla', label: 'Obligaciones / SLA', icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'] },
  ];

  const estado = contrato.estado;
  const c = STATUS_CFG[estado] || STATUS_CFG['Terminado'];
  const days = daysUntil(contrato.renovacion);

  // Acciones dinámicas según estado
  function ActionButtons() {
    if (estado === 'Borrador') return (
      <>
        <button className="ct-btn-secondary">
          <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={13} />
          Generar Documento
        </button>
        <button className="ct-btn-primary">
          <Icon d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" color="#fff" w={13} />
          Enviar para Aprobación
        </button>
      </>
    );
    if (estado === 'En Revisión') return (
      <>
        <button className="ct-btn-secondary">
          <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" color="#7c7670" w={13} />
          Editar Borrador
        </button>
        <button className="ct-btn-primary" style={{ background: '#7c3aed' }}>
          <Icon d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" color="#fff" w={13} />
          Aprobar y Enviar
        </button>
      </>
    );
    if (estado === 'Pendiente de Firma') return (
      <>
        <button className="ct-btn-secondary">
          <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" color="#7c7670" w={13} />
          Reenviar Recordatorio
        </button>
        <button className="ct-btn-primary" style={{ background: '#0284c7' }}>
          <Icon d={['M20 6L9 17l-5-5']} color="#fff" w={13} />
          Registrar Firma Manual
        </button>
      </>
    );
    if (estado === 'Activo') return (
      <>
        <button className="ct-btn-secondary">
          <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={13} />
          Crear Anexo
        </button>
        <button className="ct-btn-secondary">
          <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" color="#7c7670" w={13} />
          Renovar
        </button>
        <button className="ct-btn-danger">
          <Icon d="M18 6 6 18M6 6l12 12" color="#fff" w={13} />
          Terminar
        </button>
      </>
    );
    if (estado === 'Por Renovar') return (
      <>
        <button className="ct-btn-primary">
          <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" color="#fff" w={13} />
          Iniciar Renovación
        </button>
        <button className="ct-btn-secondary">
          <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={13} />
          Crear Anexo
        </button>
      </>
    );
    return null;
  }

  return (
    <div className="ct-workspace">
      {/* Workspace Header */}
      <div className="ct-workspace-header">
        <div className="ct-workspace-breadcrumb">
          <button className="ct-breadcrumb-btn" onClick={onBack}>
            <Icon d="M15 18l-6-6 6-6" color="#7c7670" w={14} />
            Contratos
          </button>
          <Icon d="M9 18l6-6-6-6" color="#d8d4cc" w={12} />
          <span className="ct-breadcrumb-current">{contrato.id}</span>
        </div>
        <div className="ct-workspace-actions">
          <ActionButtons />
          <button className="ct-icon-btn" title="Más opciones">
            <Icon d="M12 5h.01M12 12h.01M12 19h.01" color="#7c7670" w={16} />
          </button>
        </div>
      </div>

      {/* Workspace Title Bar */}
      <div className="ct-workspace-titlebar">
        <div className="ct-workspace-title-left">
          <div>
            <div className="ct-workspace-id-row">
              <span className="ct-workspace-id">{contrato.id}</span>
              <StatusBadge estado={contrato.estado} />
              {days !== null && days < 60 && (
                <span className="ct-days-chip" style={{ background: days < 0 ? '#fff1f2' : '#fffbeb', color: days < 0 ? '#be123c' : '#d97706', border: `1px solid ${days < 0 ? '#fecdd3' : '#fde68a'}` }}>
                  <Icon d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    color={days < 0 ? '#be123c' : '#d97706'} w={11} />
                  {days < 0 ? 'Vencido' : `Renueva en ${days}d`}
                </span>
              )}
            </div>
            <h2 className="ct-workspace-name">{contrato.nombre}</h2>
            <p className="ct-workspace-client">{contrato.cliente} · <SoftwareTag software={contrato.software} /></p>
          </div>
        </div>
        <div className="ct-workspace-kpis">
          <div className="ct-kpi">
            <p className="ct-kpi-label">MRR</p>
            <p className="ct-kpi-value">{fmtMRR(contrato.mrr)}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">ARR</p>
            <p className="ct-kpi-value">{fmtMRR(contrato.arr)}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">Facturación</p>
            <p className="ct-kpi-value">{contrato.facturacion}</p>
          </div>
        </div>
      </div>

      {/* Docked Tab Navigation */}
      <div className="ct-workspace-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`ct-workspace-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <Icon d={t.icon} color={activeTab === t.id ? '#2563eb' : '#b0aaa3'} w={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ct-workspace-content">

        {/* TAB 1: Resumen */}
        {activeTab === 'resumen' && (
          <div className="ct-tab-resumen">
            <div className="ct-resumen-grid">
              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" color="#2563eb" w={14} />
                  Producto Licenciado
                </p>
                <p className="ct-resumen-software">{contrato.software}</p>
                {contrato.usuarios && <p className="ct-resumen-detail">{contrato.usuarios} usuarios licenciados</p>}
                <p className="ct-resumen-detail">Plantilla: <strong>{contrato.plantilla}</strong></p>
                <p className="ct-resumen-detail">Responsable: <strong>{contrato.responsable}</strong></p>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="#059669" w={14} />
                  Valor del Contrato
                </p>
                <div className="ct-resumen-value-row">
                  <div>
                    <p className="ct-resumen-value-label">MRR</p>
                    <p className="ct-resumen-value-num">{fmtMRR(contrato.mrr)}</p>
                  </div>
                  <div>
                    <p className="ct-resumen-value-label">ARR</p>
                    <p className="ct-resumen-value-num">{fmtMRR(contrato.arr)}</p>
                  </div>
                </div>
                <div className="ct-resumen-billing-badge">
                  <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" color="#7c7670" w={12} />
                  Facturación {contrato.facturacion}
                </div>
              </div>

              <div className="ct-resumen-card">
                <p className="ct-resumen-card-title">
                  <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" color="#d97706" w={14} />
                  Fechas Críticas
                </p>
                <div className="ct-resumen-dates">
                  <div className="ct-date-row">
                    <span className="ct-date-label">Inicio del contrato</span>
                    <span className="ct-date-value">{fmtDate(contrato.inicio)}</span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Próxima renovación</span>
                    <span className="ct-date-value" style={{ color: days !== null && days < 30 ? '#be123c' : '#3b3631', fontWeight: days !== null && days < 30 ? 700 : 600 }}>
                      {fmtDate(contrato.renovacion)}
                    </span>
                  </div>
                  <div className="ct-date-row">
                    <span className="ct-date-label">Creado</span>
                    <span className="ct-date-value">{fmtDate(contrato.creado)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Documento */}
        {activeTab === 'documento' && (
          <div className="ct-tab-documento">
            <div className="ct-doc-viewer">
              {contrato.documento ? (
                <>
                  <div className="ct-doc-header">
                    <div className="ct-doc-info">
                      <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="#2563eb" w={20} />
                      <div>
                        <p className="ct-doc-name">{contrato.documento}</p>
                        <p className="ct-doc-meta">Documento base · Generado automáticamente</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ct-btn-secondary">
                        <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="#7c7670" w={13} />
                        Descargar
                      </button>
                      <button className="ct-btn-secondary">
                        <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" color="#7c7670" w={13} />
                        Editar
                      </button>
                    </div>
                  </div>
                  <div className="ct-doc-preview">
                    <div className="ct-doc-paper">
                      <div className="ct-doc-watermark">DOCUMENTO ACTIVO</div>
                      <div className="ct-doc-content">
                        <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#3b3631', marginBottom: 8 }}>
                          CONTRATO DE LICENCIAMIENTO DE SOFTWARE
                        </p>
                        <p style={{ fontSize: 9, color: '#7c7670', textAlign: 'center', marginBottom: 16 }}>
                          Entre <strong>{contrato.cliente}</strong> y Enfoque Platform SPA
                        </p>
                        <div className="ct-doc-section">
                          <p className="ct-doc-section-title">CLÁUSULA 1 – OBJETO DEL CONTRATO</p>
                          <p className="ct-doc-text">El presente contrato tiene por objeto el otorgamiento de una licencia de uso no exclusiva e intransferible del software denominado <strong>{contrato.software}</strong>, para ser utilizado por el Cliente en el desarrollo de sus actividades comerciales...</p>
                        </div>
                        <div className="ct-doc-section">
                          <p className="ct-doc-section-title">CLÁUSULA 2 – VALOR Y FORMA DE PAGO</p>
                          <p className="ct-doc-text">El Cliente pagará la suma de <strong>{fmtMRR(contrato.mrr)}</strong> con una frecuencia <strong>{contrato.facturacion?.toLowerCase()}</strong>, pagadera dentro de los primeros 5 días de cada período...</p>
                        </div>
                        <div className="ct-doc-section">
                          <p className="ct-doc-section-title">CLÁUSULA 3 – VIGENCIA</p>
                          <p className="ct-doc-text">El presente contrato tendrá vigencia desde el <strong>{fmtDate(contrato.inicio)}</strong> hasta el <strong>{fmtDate(contrato.renovacion)}</strong>, renovándose automáticamente salvo aviso de término con 30 días de anticipación...</p>
                        </div>
                        <div className="ct-doc-blur-overlay" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="ct-doc-empty">
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 12v6', 'M9 15l3 3 3-3']} color="#d8d4cc" w={40} />
                  <p>El documento aún no ha sido generado</p>
                  <p className="ct-doc-empty-sub">Completa las variables del contrato y genera el documento base.</p>
                  <button className="ct-btn-primary">
                    <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                    Generar Documento
                  </button>
                </div>
              )}
            </div>

            {/* Anexos */}
            <div className="ct-anexos-panel">
              <div className="ct-anexos-header">
                <p className="ct-section-label">Anexos y Adendas</p>
                <button className="ct-btn-secondary" style={{ fontSize: 11 }}>
                  <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={12} />
                  Crear Anexo
                </button>
              </div>
              {contrato.anexos.length === 0 ? (
                <p className="ct-anexos-empty">Sin anexos. Los anexos aparecerán aquí cuando se creen upgrades, downgrades o modificaciones.</p>
              ) : (
                <div className="ct-anexos-list">
                  {contrato.anexos.map(a => (
                    <div key={a.id} className="ct-anexo-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="#7c7670" w={14} />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#3b3631' }}>{a.nombre}</p>
                          <p style={{ fontSize: 10, color: '#b0aaa3' }}>{a.id} · {fmtDate(a.fecha)}</p>
                        </div>
                      </div>
                      <StatusBadge estado={a.estado} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Historial */}
        {activeTab === 'historial' && (
          <div className="ct-tab-historial">
            <div className="ct-timeline">
              {contrato.timeline.map((ev, i) => {
                const isLast = i === contrato.timeline.length - 1;
                const isFirma = ev.accion.includes('✓') || ev.accion.includes('firma') || ev.accion.includes('Firma');
                return (
                  <div key={i} className="ct-timeline-item">
                    <div className="ct-timeline-track">
                      <div className={`ct-timeline-dot ${isFirma ? 'signed' : ''}`}
                        style={{ background: isFirma ? '#15803d' : '#d8d4cc', border: `2px solid ${isFirma ? '#bbf7d0' : '#e5e2da'}` }} />
                      {!isLast && <div className="ct-timeline-line" />}
                    </div>
                    <div className="ct-timeline-content">
                      <p className="ct-timeline-time">{ev.fecha}</p>
                      <p className="ct-timeline-actor">{ev.actor}</p>
                      <p className="ct-timeline-action" style={{ color: isFirma ? '#15803d' : '#3b3631' }}>{ev.accion}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ct-audit-note">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="#7c3aed" w={14} />
              <p>El historial de auditoría es inmutable. Registra automáticamente cada acción sobre el contrato con marca de tiempo y actor responsable.</p>
            </div>
          </div>
        )}

        {/* TAB 4: SLA / Obligaciones */}
        {activeTab === 'sla' && (
          <div className="ct-tab-sla">
            <div className="ct-sla-toolbar">
              <p className="ct-section-label" style={{ margin: 0 }}>Obligaciones contractuales y métricas de SLA</p>
              <button className="ct-btn-secondary" style={{ fontSize: 11 }}>
                <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={12} />
                Agregar Obligación
              </button>
            </div>
            {contrato.slas.length === 0 ? (
              <div className="ct-sla-empty">
                <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="#d8d4cc" w={36} />
                <p>Sin obligaciones registradas</p>
                <p className="ct-doc-empty-sub">Agrega las "promesas" del contrato para conectar el documento legal con la operación.</p>
              </div>
            ) : (
              <div className="ct-sla-list">
                {contrato.slas.map((s, i) => {
                  const typeColors = {
                    'Soporte':    { color: '#2563eb', bg: '#eff6ff' },
                    'Plataforma': { color: '#059669', bg: '#d1fae5' },
                    'Reporting':  { color: '#7c3aed', bg: '#f5f3ff' },
                    'Legal':      { color: '#d97706', bg: '#fffbeb' },
                  };
                  const tc = typeColors[s.tipo] || { color: '#7c7670', bg: '#efede8' };
                  return (
                    <div key={i} className="ct-sla-item">
                      <div className="ct-sla-item-left">
                        <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color={tc.color} w={16} />
                        <div>
                          <p className="ct-sla-obligation">{s.obligacion}</p>
                          <span className="ct-sla-type" style={{ background: tc.bg, color: tc.color }}>{s.tipo}</span>
                        </div>
                      </div>
                      <div className="ct-sla-value">{s.valor}</div>
                      <button className="ct-icon-btn-sm">
                        <Icon d="M12 5h.01M12 12h.01M12 19h.01" color="#b0aaa3" w={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Contratos() {
  const [view, setView] = useState('table'); // 'table' | 'kanban'
  const [selectedContrato, setSelectedContrato] = useState(null); // para slide-over
  const [openContrato, setOpenContrato] = useState(null);         // para workspace
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterSoftware, setFilterSoftware] = useState('Todos');

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const filtered = CONTRATOS.filter(c => {
    const matchSearch = !search ||
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'Todos' || c.estado === filterEstado;
    const matchSw = filterSoftware === 'Todos' || c.software === filterSoftware;
    return matchSearch && matchEstado && matchSw;
  });

  // Si hay workspace abierto, renderizarlo
  if (openContrato) {
    return <ContractWorkspace contrato={openContrato} onBack={() => setOpenContrato(null)} />;
  }

  return (
    <div className="ct-container">
      {/* Header */}
      <div className="ct-header">
        <div>
          <p className="ct-header-label">Enfoque Platform</p>
          <h1 className="ct-header-title">Contratos</h1>
        </div>
        <div className="ct-header-right">
          <span className="ct-header-date">{today}</span>
          <div className="ct-header-divider" />
          <div className="ct-ctx-badge">
            <span className="ct-ctx-dot" />
            Administración Global
            <Icon d="M6 9l6 6 6-6" color="#2563eb" w={10} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="ct-body">

        {/* Stats */}
        <StatsStrip contratos={CONTRATOS} />

        {/* Toolbar */}
        <div className="ct-toolbar">
          <div className="ct-search">
            <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
            <input
              type="text"
              placeholder="Buscar por nombre, cliente o ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="ct-select"
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            {Object.keys(STATUS_CFG).map(s => <option key={s}>{s}</option>)}
          </select>

          <select
            className="ct-select"
            value={filterSoftware}
            onChange={e => setFilterSoftware(e.target.value)}
          >
            <option value="Todos">Todos los productos</option>
            {Object.keys(SOFTWARE_COLORS).map(s => <option key={s}>{s}</option>)}
          </select>

          <div className="ct-view-toggle">
            <button
              className={`ct-view-btn ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
              title="Vista tabla"
            >
              <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} color={view === 'table' ? '#2563eb' : '#7c7670'} w={14} />
            </button>
            <button
              className={`ct-view-btn ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
              title="Vista Kanban"
            >
              <Icon d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" color={view === 'kanban' ? '#2563eb' : '#7c7670'} w={14} />
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button className="ct-btn-secondary">
            <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} color="#7c7670" w={13} />
            Exportar
          </button>
          <button className="ct-btn-primary">
            <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
            Nuevo Contrato
          </button>
        </div>

        {/* ── TABLE VIEW ── */}
        {view === 'table' && (
          <div className="ct-table-wrap">
            <div className="ct-table-header">
              <span>ID</span>
              <span>Contrato / Cliente</span>
              <span>Software</span>
              <span>Estado</span>
              <span>MRR</span>
              <span>Facturación</span>
              <span>Próxima Renovación</span>
              <span>Responsable</span>
              <span></span>
            </div>

            {filtered.length === 0 && (
              <div className="ct-table-empty">
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#d8d4cc" w={28} />
                <p>No se encontraron contratos con esos filtros</p>
              </div>
            )}

            {filtered.map(c => {
              const days = daysUntil(c.renovacion);
              const isExpiring = days !== null && days < 60;
              return (
                <div
                  key={c.id}
                  className={`ct-table-row ${selectedContrato?.id === c.id ? 'selected' : ''}`}
                  onClick={() => setSelectedContrato(selectedContrato?.id === c.id ? null : c)}
                >
                  <span className="ct-mono ct-id-cell">{c.id}</span>
                  <div className="ct-name-cell">
                    <span className="ct-row-name">{c.nombre}</span>
                    <span className="ct-row-client">{c.cliente}</span>
                  </div>
                  <SoftwareTag software={c.software} />
                  <StatusBadge estado={c.estado} />
                  <span className="ct-mono ct-mrr-cell">{fmtMRR(c.mrr)}</span>
                  <span className="ct-bill-cell">{c.facturacion}</span>
                  <span className="ct-date-cell" style={{ color: isExpiring ? (days < 0 ? '#be123c' : '#d97706') : undefined, fontWeight: isExpiring ? 700 : undefined }}>
                    {fmtDate(c.renovacion)}
                    {isExpiring && <span className="ct-expiring-tag">{days < 0 ? '⚠ Vencido' : `⚠ ${days}d`}</span>}
                  </span>
                  <span className="ct-resp-cell">{c.responsable}</span>
                  <div className="ct-row-actions">
                    <button className="ct-row-open-btn" onClick={(e) => { e.stopPropagation(); setOpenContrato(c); }}>
                      Abrir →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === 'kanban' && (
          <div className="ct-kanban">
            {KANBAN_COLS.map(col => {
              const colContratos = filtered.filter(c => c.estado === col);
              const colMRR = colContratos.reduce((a, c) => a + (c.mrr || 0), 0);
              const sc = STATUS_CFG[col];
              return (
                <div key={col} className="ct-kanban-col">
                  <div className="ct-kanban-col-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ct-kanban-col-dot" style={{ background: sc.dot }} />
                      <span className="ct-kanban-col-name">{col}</span>
                      <span className="ct-kanban-col-count">{colContratos.length}</span>
                    </div>
                    {colMRR > 0 && <span className="ct-kanban-col-mrr">${colMRR.toLocaleString()}</span>}
                  </div>
                  <div className="ct-kanban-cards">
                    {colContratos.map(c => (
                      <KanbanCard
                        key={c.id}
                        contrato={c}
                        onClick={() => setSelectedContrato(c)}
                      />
                    ))}
                    {colContratos.length === 0 && (
                      <div className="ct-kanban-empty">Sin contratos</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Slide-Over Panel */}
      <SlideOver
        contrato={selectedContrato}
        onClose={() => setSelectedContrato(null)}
        onOpen={(c) => { setSelectedContrato(null); setOpenContrato(c); }}
      />
    </div>
  );
}
