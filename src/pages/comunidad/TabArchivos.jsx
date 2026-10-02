import React from 'react';
import { FileText, Download, Pencil, Trash2 } from 'lucide-react';

export default function TabArchivos({ items, isPlatformStaff, onEdit, onDelete }) {
  return (
    <div className="cm-list">
      {items.map(item => (
        <div key={item.id} className="cm-list-row">
          <div className="cm-icon-box" style={{ background: 'var(--success)' }}>
            <FileText size={18} color="#fff" />
          </div>
          <div className="cm-list-row-body">
            <p className="cm-list-row-title">{item.titulo}</p>
            <p className="cm-list-row-desc">
              {item.nombre_archivo_original}
              {item.descripcion ? ` · ${item.descripcion}` : ''}
            </p>
          </div>
          <div className="cm-list-actions">
            {item.archivo && (
              <a className="cm-btn-secondary" href={item.archivo} download target="_blank" rel="noopener noreferrer">
                <Download size={14} /> Descargar
              </a>
            )}
            {isPlatformStaff && (
              <>
                <button className="cm-btn-secondary" onClick={() => onEdit(item)}>
                  <Pencil size={14} /> Editar
                </button>
                <button className="cm-btn-secondary" onClick={() => onDelete(item)} style={{ color: 'var(--danger)' }}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
