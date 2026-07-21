import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { tiempoRelativo } from '../../utils/formatters';

/**
 * "Lo último que hiciste" — actividad del usuario logueado (no de toda la
 * plataforma), combinando transiciones de etapa y cambios de obligaciones SLA.
 */
export default function MiActividadFeed({ items, loading }) {
  return (
    <div className="db-panel-card">
      <p className="db-section-label"><History size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />Trazabilidad personal</p>
      <h3 className="db-section-title">Lo último que hiciste</h3>

      {loading ? (
        <div className="db-inicio-skel">
          {[0, 1, 2].map((i) => <div key={i} className="db-inicio-skel-line" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="db-empty">
          <p>Todavía no registras actividad propia. Los cambios que hagas en contratos y obligaciones SLA aparecerán aquí.</p>
        </div>
      ) : (
        <MiActividadList items={items} />
      )}
    </div>
  );
}

function MiActividadList({ items }) {
  const navigate = useNavigate();
  return (
    <ul className="db-activity-list">
      {items.map((a) => (
        <li
          key={a.id}
          className="db-activity-item"
          tabIndex={0}
          onClick={() => navigate(`/contratos/${a.contrato_id}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/contratos/${a.contrato_id}`);
            }
          }}
        >
          <div className="db-activity-main">
            <span className="db-activity-client">{a.cliente}</span>
            <span className="db-activity-transition">{a.descripcion}</span>
          </div>
          <div className="db-activity-meta">
            <span>{a.software || `Contrato #${a.contrato_id}`}</span>
            <span>{tiempoRelativo(a.fecha)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
