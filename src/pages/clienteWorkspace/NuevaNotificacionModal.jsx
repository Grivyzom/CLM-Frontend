import { useState, useEffect, useRef } from 'react';
import { createNotificacion } from '../../api';

const TIPOS = [
  { value: 'INFO', label: 'Información' },
  { value: 'AVISO', label: 'Aviso' },
  { value: 'URGENTE', label: 'Urgente' },
];

export default function NuevaNotificacionModal({ clienteId, onClose, onSuccess }) {
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [tipo, setTipo] = useState('INFO');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !cuerpo.trim()) {
      setError('Título y mensaje son requeridos');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createNotificacion({
        cliente_id: Number(clienteId),
        titulo: titulo.trim(),
        cuerpo: cuerpo.trim(),
        tipo,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'No se pudo crear la notificación');
      setSending(false);
    }
  };

  return (
    <div className="cw-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="cw-modal" role="dialog" aria-modal="true" aria-label="Nueva notificación para el cliente" onSubmit={handleSubmit}>
        <h2 className="cw-modal-title">Nueva notificación</h2>

        <div className="cw-field">
          <label htmlFor="cw-notif-titulo">Título</label>
          <input
            id="cw-notif-titulo"
            ref={firstFieldRef}
            type="text"
            maxLength={150}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título de la notificación"
          />
        </div>

        <div className="cw-field">
          <label htmlFor="cw-notif-tipo">Tipo</label>
          <select id="cw-notif-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="cw-field">
          <label htmlFor="cw-notif-cuerpo">Mensaje</label>
          <textarea
            id="cw-notif-cuerpo"
            rows={5}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            placeholder="Mensaje que verá el cliente en su campana de notificaciones…"
          />
        </div>

        {error && <p className="cw-modal-error">{error}</p>}

        <div className="cw-modal-actions">
          <button type="button" className="cw-btn-secondary" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="submit" className="cw-btn-primary" disabled={sending}>
            {sending ? 'Creando…' : 'Crear notificación'}
          </button>
        </div>
      </form>
    </div>
  );
}
