import { useState, useRef, useEffect } from 'react';
import { Icon } from './ui';

// ─── Componentes del Menú Contextual y Dropdowns ────────────────────────────

export function ActionDropdown({ anchorRef, items, onClose }) {
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    const top = anchorRect.bottom + margin;
    const left = anchorRect.left;

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let adjLeft = left;
      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, anchorRect.right - rect.width);
      }
      setPos({ top, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
      <div
        ref={dropdownRef}
        role="menu"
        style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 999, padding: 4, minWidth: 220,
          animation: 'dropIn 0.15s ease-out'
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px',
              border: 'none', background: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--text-primary)', textAlign: 'left', fontFamily: 'inherit',
              borderRadius: 4, opacity: item.disabled ? 0.5 : 1, transition: 'background 0.12s'
            }}
            onMouseEnter={e => !item.disabled && (e.currentTarget.style.background = 'var(--bg-topbar)')}
            onMouseLeave={e => !item.disabled && (e.currentTarget.style.background = 'none')}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// `estado`: 'Borrador' (nunca confirmada — eliminable, no usable en contratos),
// 'Aprobado' (confirmada y activa) o 'Inactivo' (confirmada archivada — solo reactivable).
export function ContextMenu({ pos, onClose, onUse, onRegenerate, onDuplicate, onToggleActiva, onDelete, estado = 'Aprobado' }) {
  const [menuPos, setMenuPos] = useState({ top: pos.y, left: pos.x });
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = rect.width || 180;
    const menuHeight = rect.height || 150;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = pos.y;
    let left = pos.x;

    if (left + menuWidth + margin > viewportWidth) left = Math.max(margin, pos.x - menuWidth - margin);
    if (top + menuHeight + margin > viewportHeight) top = Math.max(margin, pos.y - menuHeight - margin);

    setMenuPos({ top, left });
  }, [pos]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const itemStyle = (danger = false) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '9px 12px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 12, color: danger ? 'var(--danger)' : 'var(--text-secondary)',
    textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s'
  });

  return (
    <>
      {/* z-index por encima de NewTemplateModal (1100) y PlantillaVersionsModal (1090):
          este menú puede abrirse desde una fila del modal de versiones. */}
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1199 }} />
      <div
        ref={menuRef}
        style={{
          position: 'fixed', top: menuPos.top, left: menuPos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1200, minWidth: 180,
          animation: 'dropIn 0.15s ease-out', overflow: 'hidden'
        }}
      >
        {/* Vista previa y Editar viven como botones directos en la card y en las
            filas del modal de versiones: acá solo van las acciones secundarias. */}
        {estado === 'Aprobado' && (
          <>
            <button
              style={itemStyle()}
              onClick={() => { onUse?.(); onClose(); }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Icon d="M5 12h14M12 5l7 7-7 7" w={14} />
              Usar plantilla
            </button>
            <div style={{ height: 1, background: 'var(--neutral-200)', margin: '2px 0' }} />
          </>
        )}
        <button
          style={itemStyle()}
          onClick={() => { onRegenerate?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M1 4v6h6', 'M23 20v-6h-6', 'M20.49 9A9 9 0 0 0 5.64 5.64L1 10', 'M3.51 15A9 9 0 0 0 18.36 18.36L23 14']} w={14} />
          Regenerar documento
        </button>
        <button
          style={itemStyle()}
          onClick={() => { onDuplicate?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" w={14} />
          Duplicar como nueva versión
        </button>
        <div style={{ height: 1, background: 'var(--neutral-200)', margin: '2px 0' }} />
        {/* Activar confirma el borrador (una sola vía); una confirmada solo
            alterna entre activa y archivada. */}
        <button
          style={itemStyle(estado === 'Aprobado')}
          onClick={() => { onToggleActiva?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = estado === 'Aprobado' ? 'var(--danger-tint)' : 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {estado === 'Aprobado'
            ? <Icon d={['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4']} color="var(--danger)" w={14} />
            : <Icon d={['M9 12l2 2 4-4', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z']} w={14} />}
          {estado === 'Aprobado' ? 'Archivar' : estado === 'Borrador' ? 'Confirmar y activar' : 'Activar'}
        </button>
        {/* Eliminar ahora existe para borradores y para plantillas inactivas.
            El backend además responde 409 si se intenta eliminar una plantilla que
            tiene documentos generados, independientemente de su estado. */}
        {(estado === 'Borrador' || estado === 'Inactivo') && (
          <button
            style={itemStyle(true)}
            onClick={() => { onDelete?.(); onClose(); }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-tint)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Icon d={['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6']} color="var(--danger)" w={14} />
            {estado === 'Borrador' ? 'Eliminar borrador' : 'Eliminar plantilla'}
          </button>
        )}
      </div>
    </>
  );
}

export function FilterDropdown({ onClose, filters, updateFilter, anchorRef }) {
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    let top = anchorRect.bottom + margin;
    let left = anchorRect.left;

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjLeft = left;
      let adjTop = top;

      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, viewportWidth - rect.width - margin);
      }
      if (adjTop + rect.height + margin > viewportHeight) {
        adjTop = Math.max(margin, anchorRect.top - rect.height - margin);
      }

      setPos({ top: adjTop, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
      <div
        ref={dropdownRef}
        role="dialog"
        style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 999, padding: 16, minWidth: 260,
          animation: 'dropIn 0.15s ease-out', display: 'flex', flexDirection: 'column', gap: 16
        }}
      >
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* Estados reales de plantilla: borrador (no confirmada), activa (Aprobado)
                o archivada (Inactivo) */}
            {['Todos', 'Borrador', 'Aprobado', 'Inactivo'].map(op => (
              <button
                key={op}
                onClick={() => updateFilter('estado', op)}
                style={{
                  padding: '4px 10px', borderRadius: 12, border: '1px solid',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  ...(filters.estado === op
                    ? { background: 'var(--primary)', color: 'var(--text-on-accent)', borderColor: 'var(--primary)' }
                    : { background: 'var(--surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' })
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoría</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* Derivadas de TIPO_CAT (helpers.js): las únicas categorías que existen */}
            {['Todos', 'Comercial', 'Legal', 'Operaciones'].map(op => (
              <button
                key={op}
                onClick={() => updateFilter('categoria', op)}
                style={{
                  padding: '4px 10px', borderRadius: 12, border: '1px solid',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  ...(filters.categoria === op
                    ? { background: 'var(--primary)', color: 'var(--text-on-accent)', borderColor: 'var(--primary)' }
                    : { background: 'var(--surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' })
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
