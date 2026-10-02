import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LayoutGrid, MoreVertical, X } from 'lucide-react';
import { reordenarPublicacionesComunidad } from '../../api';

function EspacioCardInner({ item, isPlatformStaff, onOpenMenu, menuOpen, onEdit, onDelete, onView }) {
  return (
    <div className="cm-card" onClick={() => onView(item)}>
      <div className="cm-card-inner">
        <div className="cm-card-header">
          <div className="cm-icon-box" style={{ background: item.color || 'var(--primary)' }}>
            <LayoutGrid size={18} color="#fff" />
          </div>
          {isPlatformStaff && (
            <button
              className="cm-card-menu-btn"
              aria-label="Opciones"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
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
      {menuOpen && (
        <div className="cm-card-menu" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => onEdit(item)}>Editar</button>
          <button className="danger" onClick={() => onDelete(item)}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

function SortableItem({ id, item, isPlatformStaff, onEdit, onDelete, onView }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [menuOpen, setMenuOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`cm-card-wrapper ${isDragging ? 'is-dragging' : ''}`} {...attributes} {...listeners}>
      <EspacioCardInner
        item={item}
        isPlatformStaff={isPlatformStaff}
        menuOpen={menuOpen}
        onOpenMenu={() => setMenuOpen(o => !o)}
        onEdit={(i) => { setMenuOpen(false); onEdit(i); }}
        onDelete={(i) => { setMenuOpen(false); onDelete(i); }}
        onView={onView}
      />
    </div>
  );
}

function EspacioOverlayCard({ item }) {
  return (
    <div className="cm-card-wrapper overlay-active">
      <div className="cm-card">
        <div className="cm-card-inner">
          <div className="cm-card-header">
            <div className="cm-icon-box" style={{ background: item.color || 'var(--primary)' }}>
              <LayoutGrid size={18} color="#fff" />
            </div>
          </div>
          <div className="cm-card-body">
            <h3 className="cm-card-title">{item.titulo}</h3>
            {item.descripcion && <p className="cm-card-desc">{item.descripcion}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TabEspacios({ items, isPlatformStaff, onEdit, onDelete, onReorder }) {
  const [activeId, setActiveId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    document.body.classList.add('is-dragging');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    document.body.classList.remove('is-dragging');

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const nuevosItems = arrayMove(items, oldIndex, newIndex);
      onReorder(nuevosItems);
      reordenarPublicacionesComunidad(nuevosItems.map(i => i.id)).catch(() => {
        // El reorden es una conveniencia visual; si falla, el próximo fetch
        // vuelve a traer el orden persistido real.
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    document.body.classList.remove('is-dragging');
  };

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
  };

  return (
    <>
      <DndContext
        sensors={isPlatformStaff ? sensors : []}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="cm-grid">
          <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
            {items.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                isPlatformStaff={isPlatformStaff}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={setViewing}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeItem ? <EspacioOverlayCard item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>

      {viewing && (
        <div className="cm-player-backdrop" onClick={() => setViewing(null)}>
          <div className="cm-player-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="cm-player-header">
              <h3>{viewing.titulo}</h3>
              <button className="cm-player-close" onClick={() => setViewing(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {viewing.descripcion || 'Sin descripción.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
