import React from 'react';

export default function SkeletonRow() {
  return (
    <div className="cl-row" style={{ pointerEvents: 'none' }}>
      {[180, 120, 90, 130, 70, 80, 40, 60].map((w, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 6,
          background: 'linear-gradient(90deg, #e5e2da 25%, #d8d4cc 50%, #e5e2da 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          width: w, maxWidth: '100%',
        }} />
      ))}
    </div>
  );
}
