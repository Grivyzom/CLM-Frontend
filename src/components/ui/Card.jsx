import React from 'react';
import './Card.css';

export default function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card glass-panel ${className}`}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}
