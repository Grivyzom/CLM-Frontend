import React from 'react';
import DOMPurify from 'dompurify';
import { Icon } from './shared';
import { fmtDateTime } from '../../utils/formatters';
import ClausulaBloqueRichText from '../../components/ui/ClausulaBloqueRichText';

export default function TabComentarios({
  busy, comentarios, comentariosLoading,
  nuevoComentario, setNuevoComentario, nuevoComentarioTipo, setNuevoComentarioTipo,
  handleAddComentario, handleDeleteComentario,
}) {
  return (
    <div className="ct-tab-asistente-ia">
      <form onSubmit={handleAddComentario} className="ct-ai-clause-card ct-comentario-card-override ct-comentario-form">
        <div className="ct-campo-richtext ct-comentario-editor">
          <ClausulaBloqueRichText
            texto={nuevoComentario}
            onUpdate={({ texto }) => setNuevoComentario(texto)}
          />
        </div>
        <div className="ct-comentario-form-footer">
          <select
            value={nuevoComentarioTipo}
            onChange={(e) => setNuevoComentarioTipo(e.target.value)}
            className="ctm-control ct-comentario-tipo"
            disabled={busy}
          >
            <option value="SUGERENCIA">Sugerencia</option>
            <option value="IMPORTANTE">Importante</option>
            <option value="URGENTE">Urgente</option>
          </select>
          <button type="submit" className="ct-btn-primary" disabled={busy || !nuevoComentario?.replace(/<[^>]*>?/gm, '').trim()}>
            {busy ? 'Guardando...' : 'Publicar Comentario'}
          </button>
        </div>
      </form>

      {comentariosLoading ? (
        <div className="ct-ai-loading-container">
          <div className="ct-ai-loading-spinner" />
          <p>Cargando comentarios...</p>
        </div>
      ) : comentarios.length === 0 ? (
        <div className="ct-ai-deviations-empty ct-ai-empty-solid">
          <Icon d={['M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z']} color="var(--text-faint)" w={48} />
          <h3>Aún no hay comentarios</h3>
          <p className="ct-ai-empty-sub">
            Sé el primero en dejar una sugerencia o nota importante sobre este contrato.
          </p>
        </div>
      ) : (
        <div className="ct-ai-clause-list">
          {comentarios.map(c => (
            <div key={c.id} className="ct-ai-clause-card ct-comentario-card-override">
              <div className="ct-ai-clause-header">
                <div className="ct-ai-clause-title-col">
                  <span className="ct-ai-clause-cat">{fmtDateTime(c.fecha_creacion)}</span>
                  <h4 className="ct-ai-clause-title ct-comentario-autor">
                    {c.usuario}
                    {c.tipo && (
                      <span className={`ct-ai-risk-badge ${c.tipo === 'URGENTE' ? 'ALTO' : c.tipo === 'IMPORTANTE' ? 'MEDIO' : 'BAJO'}`}>
                        {c.tipo === 'SUGERENCIA' ? 'Sugerencia' : c.tipo === 'IMPORTANTE' ? 'Importante' : 'Urgente'}
                      </span>
                    )}
                  </h4>
                </div>
                <div className="ct-ai-clause-meta">
                  <button
                    className="ct-comentario-delete"
                    onClick={() => handleDeleteComentario(c.id)}
                    title="Eliminar comentario"
                    disabled={busy}
                  >
                    <Icon d={['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']} color="currentColor" w={14} />
                  </button>
                </div>
              </div>
              <div className="ct-ai-clause-body ct-comentario-body">
                <div
                  className="ct-comentario-texto"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.texto) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
