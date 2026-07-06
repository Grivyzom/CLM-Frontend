import React from 'react';

const STATUS_CFG = {
  'Activo':      { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  'En revisión': { color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  'Inactivo':    { color: '#b0aaa3', bg: '#efede8', border: '#d8d4cc', dot: '#c9c4bc' },
};

export default function StatusBadge({ estado }) {
  const c = STATUS_CFG[estado] || STATUS_CFG['Inactivo'];
  return (
    <span className="cl-status-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span className="cl-status-dot" style={{ background: c.dot }} />
      {estado}
    </span>
  );
}
