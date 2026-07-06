import React from 'react';

export function getTipoBadgeStyle(tipo) {
  if (tipo === 'juridica') return { label: 'Empresa',          color: '#5b21b6', bg: '#ede9fe' };
  if (tipo === 'natural')  return { label: 'Persona Natural',  color: '#065f46', bg: '#d1fae5' };
  return                          { label: tipo,               color: '#5c574f', bg: '#e5e2da' };
}

export default function TipoBadge({ tipo }) {
  const s = getTipoBadgeStyle(tipo);
  return (
    <span className="cl-tipo-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
