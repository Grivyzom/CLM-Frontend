import React from 'react';

const STATUS_CFG = {
  'Activo':      { color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)', dot: 'var(--success)' },
  'En revisión': { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', dot: 'var(--warning-bright)' },
  'Inactivo':    { color: 'var(--text-faint)', bg: 'var(--bg-topbar)', border: 'var(--border)', dot: 'var(--border-strong)' },
};

export default function StatusBadge({ estado, config, label }) {
  const cfg = config || STATUS_CFG;
  const c = cfg[estado] || cfg['Inactivo'] || STATUS_CFG['Inactivo'];
  return (
    <span className="cl-status-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="cl-status-dot" style={{ background: c.dot }} />
      {label || estado}
    </span>
  );
}
