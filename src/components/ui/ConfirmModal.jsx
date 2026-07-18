import React, { useState, useEffect, useRef } from 'react';

export default function ConfirmModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  loading, 
  isDangerous,
  bypassKey,
  bypassDurationMinutes = 30,
  isAlert = false
}) {
  const [bypassChecked, setBypassChecked] = useState(false);
  const [autoConfirmed, setAutoConfirmed] = useState(false);
  const hasAutoConfirmed = useRef(false);

  useEffect(() => {
    if (bypassKey && !hasAutoConfirmed.current) {
      const expiration = localStorage.getItem(`bypass_${bypassKey}`);
      if (expiration && Date.now() < parseInt(expiration, 10)) {
        hasAutoConfirmed.current = true;
        setAutoConfirmed(true);
        // Execute on next tick to avoid React warnings if parent state changes synchronously
        setTimeout(() => {
          if (onConfirm) onConfirm();
        }, 0);
      }
    }
  }, [bypassKey, onConfirm]);

  if (autoConfirmed) return null;

  const handleConfirm = () => {
    if (bypassKey && bypassChecked) {
      const expiration = Date.now() + bypassDurationMinutes * 60 * 1000;
      localStorage.setItem(`bypass_${bypassKey}`, expiration.toString());
    }
    if (onConfirm) onConfirm();
  };

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 9998,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          width: '90%',
          maxWidth: 380,
          padding: '24px',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p style={{ margin: bypassKey ? '0 0 16px' : '0 0 20px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {message}
        </p>

        {bypassKey && (
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: 20, 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontSize: 12, 
            color: 'var(--text-primary)',
            background: 'var(--bg-faint)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--neutral-200)'
          }}>
            <input 
              type="checkbox" 
              checked={bypassChecked} 
              onChange={e => setBypassChecked(e.target.checked)} 
              disabled={loading}
              style={{ cursor: loading ? 'not-allowed' : 'pointer', width: 14, height: 14, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontWeight: 500, lineHeight: 1.3 }}>
              Sé lo que hago, no volver a preguntar durante {bypassDurationMinutes} minutos.
            </span>
          </label>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {!isAlert && (
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: 5,
                border: '1px solid var(--border)',
                background: 'var(--bg-topbar)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={e => !loading && (e.target.style.background = 'var(--neutral-200)')}
              onMouseLeave={e => !loading && (e.target.style.background = 'var(--bg-topbar)')}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 5,
              border: 'none',
              background: isDangerous ? 'var(--danger)' : 'var(--primary)',
              color: 'var(--text-on-accent)',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s, opacity 0.12s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => !loading && (e.target.style.background = isDangerous ? 'var(--danger-deep)' : 'var(--primary-hover)')}
            onMouseLeave={e => !loading && (e.target.style.background = isDangerous ? 'var(--danger)' : 'var(--primary)')}
          >
            {loading ? 'Procesando...' : isAlert ? 'Entendido' : isDangerous ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </>
  );
}
