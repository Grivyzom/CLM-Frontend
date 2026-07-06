import React from 'react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, loading, isDangerous }) {
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
          zIndex: 998,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          border: '1px solid #d8d4cc',
          borderRadius: 8,
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          width: '90%',
          maxWidth: 380,
          padding: '24px',
          animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#3b3631' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#7c7670', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 5,
              border: '1px solid #d8d4cc',
              background: '#efede8',
              color: '#3b3631',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => !loading && (e.target.style.background = '#e5e2da')}
            onMouseLeave={e => !loading && (e.target.style.background = '#efede8')}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 5,
              border: 'none',
              background: isDangerous ? '#dc2626' : '#2563eb',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s, opacity 0.12s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => !loading && (e.target.style.background = isDangerous ? '#b91c1c' : '#1d4ed8')}
            onMouseLeave={e => !loading && (e.target.style.background = isDangerous ? '#dc2626' : '#2563eb')}
          >
            {loading ? 'Procesando...' : isDangerous ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </>
  );
}
