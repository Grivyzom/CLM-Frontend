import React from 'react';

export default function SkeletonRow() {
  return (
    <div className="cl-row cl-skeleton-row" style={{ pointerEvents: 'none' }}>
      {[180, 120, 90, 130, 70, 80, 40, 60].map((w, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 6,
          background: 'linear-gradient(90deg, var(--neutral-200) 25%, var(--border) 50%, var(--neutral-200) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          width: w, maxWidth: '100%',
        }} />
      ))}
    </div>
  );
}
