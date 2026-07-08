// Componentes visuales compartidos por las vistas del Catálogo.

export const Icon = ({ d, color = 'var(--text-muted)', w = 14, className = '' }) => (
  <svg className={`clm-svg ${className}`} width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export function StatusBadge({ status }) {
  const cfg = {
    'Aprobado': { color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    'Borrador': { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
    'En revisión': { color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-border)' },
  };
  const c = cfg[status] || cfg['Aprobado'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
      {status}
    </span>
  );
}

export function RiskBadge({ risk }) {
  const cfg = { 'Alto': { color: 'var(--rose)', bg: 'var(--rose-bg)' }, 'Medio': { color: 'var(--warning)', bg: 'var(--warning-bg)' }, 'Bajo': { color: 'var(--success-deep)', bg: 'var(--success-bg)' } };
  const c = cfg[risk] || cfg['Bajo'];
  return <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: c.color, background: c.bg, borderRadius: 4, padding: '1px 6px' }}>{risk}</span>;
}
