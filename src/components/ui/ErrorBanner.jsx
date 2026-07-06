import React from 'react';
import Svg from './Svg';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
        <Svg paths={['M12 9v4M12 17h.01','M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="#dc2626" size={16} />
        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{message}</span>
      </div>
      <br />
      <button className="cl-btn" onClick={onRetry} style={{ margin: '0 auto' }}>
        <Svg paths={['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15']} color="#7c7670" size={13} />
        Reintentar
      </button>
    </div>
  );
}
