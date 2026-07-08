import React, { useState, useEffect, useRef } from 'react';
import Svg from './Svg';

export default function ContextMenu({ clientId, pos, onClose, onEdit, onDelete, onChangeStatus, clientEstado }) {
  const [menuPos, setMenuPos] = useState({ top: pos.y, left: pos.x });
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = rect.width || 200;
    const menuHeight = rect.height || 120;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = pos.y;
    let left = pos.x;

    // Ajustar horizontalmente
    if (left + menuWidth + margin > viewportWidth) {
      left = Math.max(margin, pos.x - menuWidth - margin);
    } else {
      left = pos.x;
    }

    // Ajustar verticalmente
    if (top + menuHeight + margin > viewportHeight) {
      top = Math.max(margin, pos.y - menuHeight - margin);
    } else {
      top = pos.y;
    }

    setMenuPos({ top, left });
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 998,
        }}
      />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: menuPos.top,
          left: menuPos.left,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 999,
          minWidth: 180,
          animation: 'dropIn 0.15s ease-out',
        }}
      >
        <button
          onClick={() => { onEdit(clientId); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--text-secondary)',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderBottom: '1px solid var(--neutral-200)',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Svg paths={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} color="var(--text-muted)" size={14} />
          Editar
        </button>
        <button
          onClick={() => { onChangeStatus(clientId); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--text-secondary)',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderBottom: '1px solid var(--neutral-200)',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Svg paths={['M9 12l2 2 4-4m7 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z']} color="var(--text-muted)" size={14} />
          {clientEstado === 'Activo' ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={() => { onDelete(clientId); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--danger)',
            textAlign: 'left',
            fontFamily: 'inherit',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-tint)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Svg paths={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} color="var(--danger)" size={14} />
          Eliminar
        </button>
      </div>
    </>
  );
}
