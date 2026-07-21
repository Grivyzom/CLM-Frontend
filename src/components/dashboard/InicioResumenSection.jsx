import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useResumenInicio } from '../../hooks/useResumenInicio';
import { useAuth } from '../../contexts/AuthContext';
import { getNotificaciones } from '../../api';
import { tiempoRelativo } from '../../utils/formatters';
import MiActividadFeed from './MiActividadFeed';
import RecomendacionesPanel from './RecomendacionesPanel';
import ResumenSemanalCard from './ResumenSemanalCard';

/**
 * Panorama de inicio: sección fija arriba del Dashboard con lo último que
 * hizo el usuario, recomendaciones priorizadas server-side, resumen semanal
 * y notificaciones recientes no leídas — todo lo necesario para orientarse
 * al entrar, sin tener que revisar Dashboard/Analytics/Auditoría por separado.
 */
export default function InicioResumenSection() {
  const { mi_actividad, recomendaciones, resumen_semanal, loading } = useResumenInicio();

  return (
    <div className="db-panel-row-inicio">
      <MiActividadFeed items={mi_actividad} loading={loading} />
      <RecomendacionesPanel items={recomendaciones} loading={loading} />
      <ResumenSemanalCard resumen={resumen_semanal} loading={loading} />
      <NotificacionesRecientes />
    </div>
  );
}

function NotificacionesRecientes() {
  const { isClienteExterno } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => {
    getNotificaciones({ limit: 5, solo_no_leidas: true, para_staff: !isClienteExterno })
      .then((res) => setItems(res.results || []))
      .catch(() => setItems([]));
  }, [isClienteExterno]);

  return (
    <div className="db-panel-card">
      <p className="db-section-label"><Bell size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />Info útil</p>
      <h3 className="db-section-title">Notificaciones sin leer</h3>

      {items === null ? (
        <div className="db-inicio-skel">
          {[0, 1, 2].map((i) => <div key={i} className="db-inicio-skel-line" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="db-empty">
          <p>No tienes notificaciones sin leer.</p>
        </div>
      ) : (
        <ul className="db-activity-list">
          {items.map((n) => (
            <li
              key={n.id}
              className="db-activity-item"
              tabIndex={0}
              style={{ cursor: n.enlace ? 'pointer' : 'default' }}
              onClick={() => n.enlace && navigate(n.enlace)}
              onKeyDown={(e) => {
                if (n.enlace && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  navigate(n.enlace);
                }
              }}
            >
              <div className="db-activity-main">
                <span className="db-activity-client">{n.titulo}</span>
              </div>
              <div className="db-activity-meta">
                <span>{n.cuerpo}</span>
                <span>{tiempoRelativo(n.fecha_creacion)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
