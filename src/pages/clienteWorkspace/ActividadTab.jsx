import { fmtDateTime } from '../../utils/formatters';
import { Icon } from './ui';

const TIPO_META = {
  REGISTRO: { label: 'Registro', pill: 'ok' },
  MODIFICACION: { label: 'Modificación', pill: '' },
  CORREO: { label: 'Correo', pill: '' },
  NOTIFICACION: { label: 'Notificación', pill: 'warn' },
  ETAPA_CONTRATO: { label: 'Contrato', pill: '' },
  INCIDENCIA: { label: 'Incidencia', pill: 'danger' },
};

export default function ActividadTab({ actividad }) {
  return (
    <div className="ct-tab-resumen">
      <div className="ct-resumen-card">
        <p className="ct-resumen-card-title">
          <Icon d="M22 12h-4l-3 9L9 3l-3 9H2" color="var(--primary)" w={14} />
          Actividad Reciente
        </p>
        {(!actividad || actividad.length === 0) ? (
          <p className="cw-empty">Sin actividad registrada</p>
        ) : actividad.map((a, i) => {
          const meta = TIPO_META[a.tipo] || { label: a.tipo, pill: '' };
          return (
            <div className="cw-com-item" key={i}>
              <div className="cw-com-head">
                <span className={`cw-pill ${meta.pill}`}>{meta.label}</span>
                <span className="cw-com-asunto">{a.detalle}</span>
                <span className="cw-com-meta">{fmtDateTime(a.fecha)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
