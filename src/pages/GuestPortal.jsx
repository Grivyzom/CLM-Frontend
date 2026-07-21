import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGetGuestContract, apiGuestComment, apiGuestSign } from '../api';
import './GuestPortal.css';

export default function GuestPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  
  const [guestName, setGuestName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [token]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const data = await apiGetGuestContract(token);
      setContract(data);
    } catch (err) {
      setError(err.message || 'El enlace es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setCommenting(true);
      const newComment = await apiGuestComment(token, {
        texto: commentText,
        guest_name: guestName || 'Invitado'
      });
      setContract(prev => ({
        ...prev,
        comentarios: [newComment, ...prev.comentarios]
      }));
      setCommentText('');
    } catch (err) {
      alert('Error al enviar comentario: ' + (err.message || 'Error desconocido'));
    } finally {
      setCommenting(false);
    }
  };

  const handleSign = async () => {
    if (!guestName.trim()) {
      alert('Por favor ingresa tu nombre antes de firmar.');
      return;
    }
    try {
      setSigning(true);
      await apiGuestSign(token, { guest_name: guestName });
      alert('Contrato firmado exitosamente.');
      setContract(prev => ({ ...prev, can_sign: false }));
    } catch (err) {
      alert('Error al firmar el contrato: ' + (err.message || 'Error desconocido'));
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="guest-portal-wrapper loading-state">
        <div className="spinner"></div>
        <p>Cargando información segura...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-portal-wrapper error-state">
        <div className="error-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2>Acceso Denegado</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-portal-wrapper">
      <header className="guest-header">
        <div className="guest-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="brand-icon">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>Portal Seguro | KyoCLM</span>
        </div>
        <div className="guest-info">
          <span>Contrato Privado</span>
        </div>
      </header>

      <main className="guest-main">
        <div className="guest-contract-panel">
          <div className="contract-header">
            <h1 className="contract-title">{contract.nombre || `Contrato #${contract.id}`}</h1>
            <div className="contract-meta">
              <span className="meta-item">
                <strong>Cliente:</strong> {contract.cliente}
              </span>
              <span className="meta-item">
                <strong>Software:</strong> {contract.software}
              </span>
              <span className="meta-item">
                <strong>Estado:</strong> <span className={`badge stage-${contract.etapa.toLowerCase()}`}>{contract.etapa}</span>
              </span>
            </div>
          </div>

          <div className="contract-body">
            {contract.clausulas_estructuradas ? (
              <div className="structured-content">
                {contract.clausulas_estructuradas.map((clause, idx) => (
                  <div key={idx} className="clause-block">
                    {clause.titulo && <h3>{clause.titulo}</h3>}
                    <div dangerouslySetInnerHTML={{ __html: clause.texto || clause.contenido }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-content">
                {contract.texto_adicional_clausulas ? (
                  <div dangerouslySetInnerHTML={{ __html: contract.texto_adicional_clausulas }} />
                ) : (
                  <p className="empty-contract">El documento no tiene contenido textual disponible para previsualizar.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="guest-sidebar-panel">
          <div className="guest-identity-card">
            <h3>Tu Identidad</h3>
            <p>Ingresa tu nombre para interactuar con este documento.</p>
            <input 
              type="text" 
              placeholder="Tu nombre completo" 
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="identity-input"
            />
          </div>

          {contract.can_sign && (
            <div className="guest-action-card sign-card">
              <h3>Firma Electrónica</h3>
              <p>Revisa el documento antes de firmar.</p>
              <button className="btn-primary btn-block" onClick={handleSign} disabled={signing}>
                {signing ? 'Firmando...' : 'Firmar Documento'}
              </button>
            </div>
          )}

          {contract.can_comment && (
            <div className="guest-action-card comments-card">
              <h3>Comentarios</h3>
              <form onSubmit={handleComment} className="comment-form">
                <textarea 
                  placeholder="Escribe tu observación..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={4}
                  required
                />
                <button type="submit" className="btn-secondary btn-block" disabled={commenting}>
                  {commenting ? 'Enviando...' : 'Agregar Comentario'}
                </button>
              </form>
              
              <div className="comments-list">
                {contract.comentarios.length === 0 ? (
                  <p className="no-comments">No hay comentarios aún.</p>
                ) : (
                  contract.comentarios.map(c => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-meta">
                        <span className="comment-author">{c.autor}</span>
                        <span className="comment-date">{new Date(c.fecha_creacion).toLocaleDateString()}</span>
                      </div>
                      <p className="comment-text">{c.texto}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
