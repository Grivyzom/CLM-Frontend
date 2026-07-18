import React from 'react';
import { Icon } from './shared';
import { fmtDateTime } from '../../utils/formatters';

export default function TabHistorial({ contrato }) {
  return (
    <div className="ct-tab-historial">
      <div className="ct-timeline">
        {contrato.historial.length === 0 && (
          <p className="ct-timeline-empty">Sin eventos registrados.</p>
        )}
        {contrato.historial.map((ev, i) => {
          const isLast = i === contrato.historial.length - 1;
          const isActivado = ev.etapa_nueva === 'ACTIVO';
          return (
            <div key={i} className="ct-timeline-item">
              <div className="ct-timeline-track">
                <div className={`ct-timeline-dot ${isActivado ? 'signed' : ''}`}
                  style={{ background: isActivado ? 'var(--success-deep)' : 'var(--border)', border: `2px solid ${isActivado ? 'var(--success-border)' : 'var(--neutral-200)'}` }} />
                {!isLast && <div className="ct-timeline-line" />}
              </div>
              <div className="ct-timeline-content">
                <p className="ct-timeline-time">{fmtDateTime(ev.fecha)}</p>
                <p className="ct-timeline-actor">{ev.actor}</p>
                <p className="ct-timeline-action" style={{ color: isActivado ? 'var(--success-deep)' : 'var(--text-primary)' }}>
                  → {ev.etapa_nueva_display}{ev.notas ? ` — ${ev.notas}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ct-audit-note">
        <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="var(--violet-bright)" w={14} />
        <p>El historial de auditoría es inmutable. Registra automáticamente cada transición de etapa con marca de tiempo y actor responsable.</p>
      </div>
    </div>
  );
}
