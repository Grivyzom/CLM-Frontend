import React, { useState } from 'react';
import { Video, MoreVertical, X } from 'lucide-react';

function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

function VideoCard({ item, isPlatformStaff, onEdit, onDelete, onPlay }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="cm-card-wrapper">
      <div className="cm-card" onClick={() => onPlay(item)}>
        <div className="cm-card-inner">
          <div className="cm-card-header">
            <div className="cm-icon-box" style={{ background: 'var(--danger)' }}>
              <Video size={18} color="#fff" />
            </div>
            {isPlatformStaff && (
              <button
                className="cm-card-menu-btn"
                aria-label="Opciones"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
              >
                <MoreVertical size={16} />
              </button>
            )}
          </div>
          <div className="cm-card-body">
            <h3 className="cm-card-title">{item.titulo}</h3>
            {item.descripcion && <p className="cm-card-desc">{item.descripcion}</p>}
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="cm-card-menu" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setMenuOpen(false); onEdit(item); }}>Editar</button>
          <button className="danger" onClick={() => { setMenuOpen(false); onDelete(item); }}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

export default function TabVideos({ items, isPlatformStaff, onEdit, onDelete }) {
  const [playing, setPlaying] = useState(null);

  return (
    <>
      <div className="cm-grid">
        {items.map(item => (
          <VideoCard key={item.id} item={item} isPlatformStaff={isPlatformStaff} onEdit={onEdit} onDelete={onDelete} onPlay={setPlaying} />
        ))}
      </div>

      {playing && (
        <div className="cm-player-backdrop" onClick={() => setPlaying(null)}>
          <div className="cm-player-box" onClick={(e) => e.stopPropagation()}>
            <div className="cm-player-header">
              <h3>{playing.titulo}</h3>
              <button className="cm-player-close" onClick={() => setPlaying(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="cm-player-media">
              {playing.archivo_video ? (
                <video src={playing.archivo_video} controls autoPlay />
              ) : (
                <iframe
                  src={toEmbedUrl(playing.url_externa)}
                  title={playing.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
