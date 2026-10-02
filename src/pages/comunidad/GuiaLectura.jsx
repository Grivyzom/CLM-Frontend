import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft } from 'lucide-react';
import { getPublicacionComunidad } from '../../api';
import './GuiaLectura.css';

export default function GuiaLectura() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guia, setGuia] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    getPublicacionComunidad(id)
      .then((data) => { if (activo) setGuia(data); })
      .catch((err) => { if (activo) setError(err.message || 'No se pudo cargar la guía.'); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [id]);

  return (
    <div className="gl-container">
      <div className="gl-topbar">
        <Link to="/comunidad" className="gl-back" onClick={(e) => { e.preventDefault(); navigate('/comunidad'); }}>
          <ArrowLeft size={16} /> Volver a Comunidad
        </Link>
      </div>

      <div className="gl-content">
        {loading && <p className="gl-status">Cargando…</p>}
        {error && <p className="gl-status gl-error">{error}</p>}
        {guia && (
          <article className="gl-article">
            <h1 className="gl-title">{guia.titulo}</h1>
            {guia.descripcion && <p className="gl-subtitle">{guia.descripcion}</p>}
            <div
              className="gl-body"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(guia.contenido_html || '') }}
            />
          </article>
        )}
      </div>
    </div>
  );
}
