import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb, AlertTriangle, Calendar, FileWarning, ShieldAlert, RotateCcw, ClipboardCheck,
} from 'lucide-react';

const ICONO_POR_TIPO = {
  MORA: AlertTriangle,
  GRACIA: AlertTriangle,
  VENCE_PRONTO: Calendar,
  SIN_DOCUMENTO: FileWarning,
  RIESGO_CARTERA: ShieldAlert,
  COMPLIANCE_BAJO: ShieldAlert,
  REINCIDENCIA_PERDONAZO: RotateCcw,
  AUDITORIA_PENDIENTE: ClipboardCheck,
};

const SEVERIDAD_CLASE = {
  alta: 'db-reco-alta',
  media: 'db-reco-media',
  baja: 'db-reco-baja',
};

/**
 * Recomendaciones priorizadas server-side (score = severidad × urgencia ×
 * volumen, ver contratos/recomendaciones.py en el backend).
 */
export default function RecomendacionesPanel({ items, loading }) {
  const navigate = useNavigate();

  return (
    <div className="db-panel-card">
      <p className="db-section-label"><Lightbulb size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />Priorizado por el sistema</p>
      <h3 className="db-section-title">Recomendaciones</h3>

      {loading ? (
        <div className="db-inicio-skel">
          {[0, 1, 2].map((i) => <div key={i} className="db-inicio-skel-line" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="db-empty">
          <p>Todo en orden — no hay recomendaciones pendientes por ahora.</p>
        </div>
      ) : (
        <ul className="db-reco-list">
          {items.map((r) => {
            const Icono = ICONO_POR_TIPO[r.tipo] || Lightbulb;
            return (
              <li key={r.id} className={`db-reco-item ${SEVERIDAD_CLASE[r.severidad] || ''}`}>
                <Icono size={14} className="db-reco-icon" />
                <div className="db-reco-body">
                  <p className="db-reco-titulo">{r.titulo}</p>
                  <p className="db-reco-mensaje">{r.mensaje}</p>
                  {r.cta_link && (
                    <button className="db-link-btn" onClick={() => navigate(r.cta_link)}>
                      {r.cta_label || 'Ver detalle'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
