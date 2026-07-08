import React from 'react';

export function getTipoBadgeStyle(tipo) {
  if (tipo === 'juridica') return { label: 'Empresa',          color: 'var(--violet-deep)', bg: 'var(--violet-tint)' };
  if (tipo === 'natural')  return { label: 'Persona Natural',  color: 'var(--success-deeper)', bg: 'var(--success-tint)' };
  return                          { label: tipo,               color: 'var(--text-secondary)', bg: 'var(--neutral-200)' };
}

export default function TipoBadge({ tipo }) {
  const s = getTipoBadgeStyle(tipo);
  return (
    <span className="cl-tipo-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
