import React from 'react';
import './Badge.css';

export default function Badge({ children, status = 'default', className = '' }) {
  return (
    <span className={`badge-ui badge-${status} ${className}`}>
      {children}
    </span>
  );
}
