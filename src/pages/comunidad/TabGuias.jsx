import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MoreVertical } from 'lucide-react';

function GuiaCard({ item, isPlatformStaff, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="cm-card-wrapper">
      <div className="cm-card" onClick={() => navigate(`/comunidad/guias/${item.id}`)}>
        <div className="cm-card-inner">
          <div className="cm-card-header">
            <div className="cm-icon-box" style={{ background: 'var(--primary)' }}>
              <BookOpen size={18} color="#fff" />
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
            {!item.publicado && <p className="cm-card-desc" style={{ color: 'var(--warning-deep)' }}>Borrador</p>}
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

export default function TabGuias({ items, isPlatformStaff, onEdit, onDelete }) {
  return (
    <div className="cm-grid">
      {items.map(item => (
        <GuiaCard key={item.id} item={item} isPlatformStaff={isPlatformStaff} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
