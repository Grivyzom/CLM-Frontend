// Icono de trazo compartido por el workspace de cliente — misma firma que el
// Icon local de ContractDetail para mantener paridad visual entre workspaces.
export function Icon({ d, color = 'var(--text-muted)', w = 14 }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}
