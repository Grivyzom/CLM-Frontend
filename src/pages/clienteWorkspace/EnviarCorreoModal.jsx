import { useState, useEffect, useRef } from 'react';
import { enviarCorreoCliente } from '../../api';

export default function EnviarCorreoModal({ clienteId, emailPrincipal, onClose, onSuccess }) {
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [destinatario, setDestinatario] = useState(emailPrincipal || '');
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
    if (!asunto.trim() || !cuerpo.trim()) {
      setError('Asunto y mensaje son requeridos');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await enviarCorreoCliente(clienteId, {
        asunto: asunto.trim(),
        cuerpo: cuerpo.trim(),
        destinatario: destinatario.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'No se pudo enviar el correo');
      setSending(false);
    }
  };

  return (
    <div className="cw-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="cw-modal" role="dialog" aria-modal="true" aria-label="Enviar correo al cliente" onSubmit={handleSubmit}>
        <h2 className="cw-modal-title">Enviar correo</h2>

        <div className="cw-field">
          <label htmlFor="cw-correo-dest">Destinatario</label>
          <input
            id="cw-correo-dest"
            type="email"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="correo@cliente.cl"
          />
        </div>

        <div className="cw-field">
          <label htmlFor="cw-correo-asunto">Asunto</label>
          <input
            id="cw-correo-asunto"
            ref={firstFieldRef}
            type="text"
            maxLength={200}
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Asunto del correo"
          />
        </div>

        <div className="cw-field">
          <label htmlFor="cw-correo-cuerpo">Mensaje</label>
          <textarea
            id="cw-correo-cuerpo"
            rows={7}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            placeholder="Escribe el mensaje que recibirá el cliente…"
          />
        </div>

        {error && <p className="cw-modal-error">{error}</p>}

        <div className="cw-modal-actions">
          <button type="button" className="cw-btn-secondary" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="submit" className="cw-btn-primary" disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar correo'}
          </button>
        </div>
      </form>
    </div>
  );
}
