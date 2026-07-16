import { memo, useState, useRef, useEffect } from 'react';
import { Icon, StatusBadge } from './ui';

// ─── Plantilla Card ───────────────────────────────────────────────────────────
// memo: el grid puede tener decenas de cards; solo re-renderiza la que cambia.
function PlantillaCard({ p, setPreviewTemplate, handleOpenContextMenu, handleEditTemplate }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [p.name]);

  const offset = isOverflowing && containerRef.current && textRef.current
    ? textRef.current.scrollWidth - containerRef.current.clientWidth
    : 0;

  return (
    <div
      className="catalogo-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="catalogo-card-header">
        <div className="catalogo-card-abbr" style={{ background: p.bg }}>
          <span style={{ color: p.color }}>{p.abbr}</span>
        </div>
        <div className="catalogo-card-title" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div
            ref={containerRef}
            style={{
              overflow: 'hidden',
              maskImage: isOverflowing && !isHovered ? 'linear-gradient(to right, black 80%, transparent 100%)' : 'none',
              WebkitMaskImage: isOverflowing && !isHovered ? 'linear-gradient(to right, black 80%, transparent 100%)' : 'none',
            }}
          >
            <p
              ref={textRef}
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                display: 'inline-block',
                transform: isHovered && isOverflowing ? `translateX(-${offset}px)` : 'translateX(0)',
                transition: isHovered && isOverflowing ? `transform ${Math.max(1, offset * 0.02)}s linear 0.2s` : 'transform 0.3s ease-out'
              }}
            >
              {p.name}
            </p>
          </div>
          <p className="catalogo-card-meta">{p.cat} · {p.version}</p>
        </div>
      </div>

      <div className="catalogo-card-status">
        <StatusBadge status={p.status} />
        {p.vars !== null && (
          <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 2 }}>{p.vars} variables</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{p.uses} usos</span>
      </div>

      <div className="catalogo-card-footer">
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Act. {p.updated}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {p._raw?.software_nombre && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: 'var(--primary-bg)', color: 'var(--primary)', fontFamily: "'JetBrains Mono',monospace",
              maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginRight: 'auto'
            }} title={p._raw.software_nombre}>
              {p._raw.software_nombre}
            </span>
          )}
          
          <div className="catalogo-action-group" onClick={e => e.stopPropagation()}>
            <button
              title="Vista previa"
              className="catalogo-action-group-btn"
              onClick={e => { e.stopPropagation(); setPreviewTemplate(p); }}
            >
              <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={14} color="currentColor" />
            </button>
            <button
              title="Editar"
              className="catalogo-action-group-btn"
              onClick={e => { e.stopPropagation(); if(handleEditTemplate) handleEditTemplate(p); }}
            >
              <Icon d={['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']} w={14} color="currentColor" />
            </button>
            <button
              title="Más opciones"
              className="catalogo-action-group-btn"
              onClick={e => handleOpenContextMenu(e, p)}
            >
              <Icon d={['M12 5v.01','M12 12v.01','M12 19v.01','M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z']} w={14} color="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PlantillaCard);
