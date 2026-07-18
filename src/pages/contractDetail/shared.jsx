import React from 'react';

// ─── Paleta de etapas (workflow legal real: EtapaContrato) ────────────────────
export const ETAPA_CFG = {
  BORRADOR:         { label: 'Borrador',           color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', dot: 'var(--warning-bright)' },
  REVISION:         { label: 'En Revisión',        color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-border)', dot: 'var(--violet-bright)' },
  APROBADO:         { label: 'Aprobado',            color: 'var(--cyan-deep)', bg: 'var(--cyan-bg)', border: 'var(--cyan-border)', dot: 'var(--cyan)' },
  PENDIENTE_FIRMA:  { label: 'Pendiente de Firma',  color: 'var(--sky)', bg: 'var(--sky-bg)', border: 'var(--sky-border)', dot: 'var(--sky-deep)' },
  ACTIVO:           { label: 'Activo',              color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)', dot: 'var(--success)' },
  ENMENDADO:        { label: 'Enmendado',           color: 'var(--indigo)', bg: 'var(--indigo-bg)', border: 'var(--indigo-border)', dot: 'var(--indigo-bright)' },
  TERMINADO:        { label: 'Terminado',           color: 'var(--text-muted)', bg: 'var(--bg-topbar)', border: 'var(--border)', dot: 'var(--text-faint)' },
};

// ─── Estado operativo (EstadoContrato) ──
export const STATUS_OP_CFG = {
  MORA:       { label: 'Mora',        color: 'var(--rose)', bg: 'var(--rose-bg)' },
  GRACIA:     { label: 'En gracia',   color: 'var(--warning-bright)', bg: 'var(--warning-bg)' },
  SUSPENDIDO: { label: 'Suspendido',  color: 'var(--text-primary)', bg: 'var(--neutral-200)' },
  VENCIDO:    { label: 'Vencido',     color: 'var(--text-muted)', bg: 'var(--bg-topbar)' },
};

// ─── Colores de software determinísticos ───────────────
const SW_PALETTE = [
  { color: 'var(--primary)', bg: 'var(--primary-bg)' }, { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
  { color: 'var(--violet-bright)', bg: 'var(--violet-tint)' }, { color: 'var(--cyan)', bg: 'var(--cyan-tint)' },
  { color: 'var(--warning-bright)', bg: 'var(--warning-bg)' }, { color: 'var(--danger)', bg: 'var(--danger-tint)' },
  { color: 'var(--lime)', bg: 'var(--lime-tint)' }, { color: 'var(--pink)', bg: 'var(--pink-tint)' },
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function swColor(nombre) {
  if (!nombre) return { color: 'var(--text-secondary)', bg: 'var(--neutral-200)' };
  return SW_PALETTE[hashStr(nombre) % SW_PALETTE.length];
}

// ─── SVG Icon ────────────────────────────────────────────────────────────────
export function Icon({ d, color = 'var(--text-muted)', w = 14 }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────
export function EtapaBadge({ etapa, label, size = 'md' }) {
  const c = ETAPA_CFG[etapa] || ETAPA_CFG['TERMINADO'];
  const text = label || c.label;
  return (
    <span className={`ct-badge ct-badge-${size}`} title={text}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="ct-badge-dot" style={{ background: c.dot }} />
      <span className="ct-badge-text">{text}</span>
    </span>
  );
}

export function StatusOpBadge({ status, size = 'sm' }) {
  const cfg = STATUS_OP_CFG[status];
  if (!cfg) return null; // ACTIVO es el estado esperado; no se resalta
  return (
    <span className={`ct-badge ct-badge-${size}`} style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
      {cfg.label}
    </span>
  );
}

export function SoftwareTag({ software }) {
  const c = swColor(software);
  return <span className="ct-sw-tag" title={software} style={{ background: c.bg, color: c.color }}>{software}</span>;
}

// ─── transiciones permitidas ──────────────────────────────────────────────────
export const ETAPA_SIGUIENTE = {
  BORRADOR: [{ etapa: 'REVISION', label: 'Enviar a Revisión', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' }],
  REVISION: [{ etapa: 'APROBADO', label: 'Aprobar', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' }],
  APROBADO: [{ etapa: 'PENDIENTE_FIRMA', label: 'Enviar a Firma', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' }],
  PENDIENTE_FIRMA: [{ etapa: 'ACTIVO', label: 'Registrar Firma', icon: 'M20 6L9 17l-5-5', primary: true, color: 'var(--sky)' }],
  ACTIVO: [
    { etapa: 'ENMENDADO', label: 'Crear Enmienda', icon: ['M12 5v14', 'M5 12h14'] },
    { etapa: 'TERMINADO', label: 'Terminar', icon: 'M18 6 6 18M6 6l12 12', danger: true, confirm: '¿Terminar este contrato? Esta acción marca el contrato como Terminado / Expirado.' },
  ],
  ENMENDADO: [
    { etapa: 'ACTIVO', label: 'Reactivar', icon: ['M20 6L9 17l-5-5'] },
    { etapa: 'TERMINADO', label: 'Terminar', icon: 'M18 6 6 18M6 6l12 12', danger: true, confirm: '¿Terminar este contrato?' },
  ],
  TERMINADO: [],
};
