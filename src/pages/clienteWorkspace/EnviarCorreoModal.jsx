import { useState, useEffect, useRef } from 'react';
import { enviarCorreoCliente, getArchivosAdjuntables } from '../../api';

export default function EnviarCorreoModal({ clienteId, emailPrincipal, onClose, onSuccess }) {
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [destinatario, setDestinatario] = useState(emailPrincipal || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  
  const [archivosDisponibles, setArchivosDisponibles] = useState([]);
  const [loadingArchivos, setLoadingArchivos] = useState(true);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState([]);

  const firstFieldRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getArchivosAdjuntables(clienteId).then((res) => {
      if (mounted) {
        setArchivosDisponibles(res.results || []);
        setLoadingArchivos(false);
      }
    }).catch((err) => {
      if (mounted) {
        console.error("Error cargando archivos adjuntables:", err);
        setLoadingArchivos(false);
      }
    });

    firstFieldRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      mounted = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [clienteId, onClose]);

  const handleToggleArchivo = (archivo) => {
    setArchivosSeleccionados((prev) => {
      const exists = prev.find((a) => a.id === archivo.id);
      if (exists) return prev.filter((a) => a.id !== archivo.id);
      return [...prev, archivo];
    });
  };

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
        adjuntos: archivosSeleccionados.map(a => ({
          tipo_entidad: a.tipo_entidad,
          entidad_id: a.entidad_id,
          campo: a.campo
        }))
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

        {!loadingArchivos && archivosDisponibles.length > 0 && (
          <div className="cw-field" style={{ marginBottom: '1.5rem' }}>
            <label>Adjuntos (Opcional)</label>
            <div style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-subtle, #f8f9fa)'
            }}>
              {archivosDisponibles.map((a) => (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={archivosSeleccionados.some(sel => sel.id === a.id)}
                    onChange={() => handleToggleArchivo(a)}
                  />
                  <span>
                    <strong>{a.nombre}</strong> <span style={{ color: 'var(--text-muted)' }}>({a.origen})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

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
