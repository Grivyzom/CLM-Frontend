import React from 'react';
import Svg from './Svg';

export default function Toast({ message, type = 'info', onCancel }) {
  const CFG = {
    info:      { bg: 'var(--primary-bg)', border: 'var(--primary-border)', color: 'var(--primary-hover)' },
    success:   { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success-deep)' },
    error:     { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)' },
    cancelled: { bg: 'var(--bg-page)', border: 'var(--border)', color: 'var(--text-secondary)' },
  };
  const c = CFG[type] || CFG.info;
  const cancelable = type === 'info' && !!onCancel;
  return (
    <div
      role="status"
      onClick={cancelable ? onCancel : undefined}
      title={cancelable ? 'Clic para cancelar' : undefined}
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
        padding: '12px 16px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500,
        animation: 'dropIn 0.15s ease-out', minWidth: 220,
        cursor: cancelable ? 'pointer' : 'default',
      }}
    >
      {type === 'info' && <span className="cl-spinner" />}
      {type === 'success' && <Svg paths={['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3']} color={c.color} size={15} />}
      {type === 'error' && <Svg paths={['M12 9v4M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color={c.color} size={15} />}
      {type === 'cancelled' && <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color={c.color} size={15} />}
      <span style={{ flex: 1 }}>{message}</span>
      {cancelable && (
        <button
          onClick={e => { e.stopPropagation(); onCancel(); }}
          style={{
            background: 'none', border: '1px solid currentColor', color: c.color,
            borderRadius: 5, padding: '3px 10px', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
