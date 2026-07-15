import { useState, useEffect, useCallback, useRef } from 'react';
import { getCorreosCliente, getNotificaciones } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { fmtDateTime } from '../../utils/formatters';
import { Icon } from './ui';
import EnviarCorreoModal from './EnviarCorreoModal';
import NuevaNotificacionModal from './NuevaNotificacionModal';

const TIPO_NOTIF_PILL = { INFO: '', AVISO: 'warn', URGENTE: 'danger' };

export default function ComunicacionesTab({ clienteId, emailPrincipal, onActividad }) {
  const { canWrite } = useAuth();

  const [correos, setCorreos] = useState(null);
  const [notifs, setNotifs] = useState(null);
  const [error, setError] = useState(null);
  const [correoModalOpen, setCorreoModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const requestSeqRef = useRef(0);

  const fetchData = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setError(null);
    Promise.all([
      getCorreosCliente(clienteId),
      getNotificaciones({ cliente: clienteId }),
    ])
      .then(([correosRes, notifsRes]) => {
        if (seq !== requestSeqRef.current) return;
        setCorreos(correosRes.results || []);
        setNotifs(notifsRes.results || []);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.message || 'Error al cargar comunicaciones');
      });
  }, [clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEnviado = () => {
    setCorreoModalOpen(false);
    fetchData();
    onActividad?.();
  };

  const handleNotificado = () => {
    setNotifModalOpen(false);
    fetchData();
    onActividad?.();
  };

  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (correos === null || notifs === null) {
    return <div className="ct-table-empty" role="status">Cargando comunicaciones…</div>;
  }

  return (
    <div className="ct-tab-resumen">
      <div className="ct-resumen-card">
        <div className="cw-card-head">
          <p className="ct-resumen-card-title">
            <Icon d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6']} color="var(--primary)" w={14} />
            Correos Enviados ({correos.length})
          </p>
          {canWrite && (
            <button className="ct-btn-primary" onClick={() => setCorreoModalOpen(true)}>
              <Icon d={['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z']} color="var(--text-on-accent)" w={13} />
              Enviar correo
            </button>
          )}
        </div>
        {correos.length === 0 ? (
          <p className="cw-empty">Aún no se han enviado correos a este cliente</p>
        ) : correos.map((c) => (
          <div className="cw-com-item" key={c.id}>
            <div className="cw-com-head">
              <span className="cw-com-asunto">{c.asunto}</span>
              <span className={`cw-pill ${c.estado === 'ENVIADO' ? 'ok' : 'danger'}`}>{c.estado}</span>
              <span className="cw-com-meta">
                {fmtDateTime(c.fecha_envio)} · {c.destinatario}{c.enviado_por ? ` · por ${c.enviado_por}` : ''}
              </span>
            </div>
            <p className="cw-com-cuerpo">{c.estado === 'FALLIDO' && c.error ? `Error: ${c.error}` : c.cuerpo}</p>
          </div>
        ))}
      </div>

      <div className="ct-resumen-card">
        <div className="cw-card-head">
          <p className="ct-resumen-card-title">
            <Icon d={['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']} color="var(--warning-bright)" w={14} />
            Notificaciones In-App ({notifs.length})
          </p>
          {canWrite && (
            <button className="ct-btn-primary" onClick={() => setNotifModalOpen(true)}>
              <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
              Nueva notificación
            </button>
          )}
        </div>
        {notifs.length === 0 ? (
          <p className="cw-empty">Sin notificaciones para este cliente</p>
        ) : notifs.map((n) => (
          <div className="cw-com-item" key={n.id}>
            <div className="cw-com-head">
              <span className="cw-com-asunto">{n.titulo}</span>
              <span className={`cw-pill ${TIPO_NOTIF_PILL[n.tipo] || ''}`}>{n.tipo}</span>
              <span className={`cw-pill ${n.leida ? 'ok' : ''}`}>{n.leida ? 'Leída' : 'No leída'}</span>
              <span className="cw-com-meta">
                {fmtDateTime(n.fecha_creacion)}{n.creado_por ? ` · por ${n.creado_por}` : ''}
              </span>
            </div>
            <p className="cw-com-cuerpo">{n.cuerpo}</p>
          </div>
        ))}
      </div>

      {correoModalOpen && (
        <EnviarCorreoModal
          clienteId={clienteId}
          emailPrincipal={emailPrincipal}
          onClose={() => setCorreoModalOpen(false)}
          onSuccess={handleEnviado}
        />
      )}
      {notifModalOpen && (
        <NuevaNotificacionModal
          clienteId={clienteId}
          onClose={() => setNotifModalOpen(false)}
          onSuccess={handleNotificado}
        />
      )}
    </div>
  );
}
