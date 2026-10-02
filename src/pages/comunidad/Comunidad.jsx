import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Video, FileDown, LayoutGrid, Plus } from 'lucide-react';
import TopbarActions from '../../components/layout/TopbarActions';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  getPublicacionesComunidad,
  deletePublicacionComunidad,
} from '../../api';
import TabGuias from './TabGuias';
import TabVideos from './TabVideos';
import TabArchivos from './TabArchivos';
import TabEspacios from './TabEspacios';
import PublicacionModal from './PublicacionModal';
import './Comunidad.css';

const TABS = [
  { tipo: 'GUIA', label: 'Guías', icon: BookOpen },
  { tipo: 'VIDEO', label: 'Videos', icon: Video },
  { tipo: 'ARCHIVO', label: 'Archivos', icon: FileDown },
  { tipo: 'ESPACIO', label: 'Espacios', icon: LayoutGrid },
];

export default function Comunidad() {
  const { isPlatformStaff } = useAuth();
  const { confirm, alert: alertModal } = useConfirm();
  const [activeTab, setActiveTab] = useState('GUIA');
  const [itemsByTipo, setItemsByTipo] = useState({ GUIA: [], VIDEO: [], ARCHIVO: [], ESPACIO: [] });
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState(null); // { tipo, publicacion? }

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const resultados = await Promise.all(TABS.map(t => getPublicacionesComunidad({ tipo: t.tipo })));
      setItemsByTipo({
        GUIA: resultados[0],
        VIDEO: resultados[1],
        ARCHIVO: resultados[2],
        ESPACIO: resultados[3],
      });
    } catch (err) {
      alertModal({ title: 'Error al cargar Comunidad', message: err.message || 'No se pudo cargar el contenido.', isDangerous: true });
    } finally {
      setLoading(false);
    }
  }, [alertModal]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const handleCreated = (publicacion) => {
    setItemsByTipo(prev => ({ ...prev, [publicacion.tipo]: [...prev[publicacion.tipo], publicacion] }));
    setModalState(null);
  };

  const handleUpdated = (publicacion) => {
    setItemsByTipo(prev => ({
      ...prev,
      [publicacion.tipo]: prev[publicacion.tipo].map(p => p.id === publicacion.id ? publicacion : p),
    }));
    setModalState(null);
  };

  const handleDelete = async (publicacion) => {
    try {
      await confirm({
        title: 'Eliminar publicación',
        message: `¿Eliminar "${publicacion.titulo}"? Esta acción no se puede deshacer.`,
        isDangerous: true,
        action: async () => {
          await deletePublicacionComunidad(publicacion.id);
          setItemsByTipo(prev => ({
            ...prev,
            [publicacion.tipo]: prev[publicacion.tipo].filter(p => p.id !== publicacion.id),
          }));
        },
      });
    } catch (err) {
      if (err) alertModal({ title: 'Error al eliminar', message: err.message || 'No se pudo eliminar la publicación.', isDangerous: true });
    }
  };

  const handleReorder = (nuevosItems) => {
    setItemsByTipo(prev => ({ ...prev, ESPACIO: nuevosItems }));
  };

  const activeTabDef = TABS.find(t => t.tipo === activeTab);

  return (
    <div className="cm-container">
      <div className="cm-topbar">
        <div>
          <p className="cm-topbar-subtitle">Espacio compartido</p>
          <h1 className="cm-topbar-title">Comunidad</h1>
        </div>
        <div className="cm-topbar-actions">
          {isPlatformStaff && (
            <button className="cm-btn-primary" onClick={() => setModalState({ tipo: activeTab })}>
              <Plus size={16} /> Nueva publicación
            </button>
          )}
          <div className="cm-divider"></div>
          <TopbarActions />
        </div>
      </div>

      <div className="cm-content">
        <div className="cm-tabs">
          {TABS.map(t => (
            <button
              key={t.tipo}
              className={`cm-tab ${activeTab === t.tipo ? 'active' : ''}`}
              onClick={() => setActiveTab(t.tipo)}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="cm-loading">Cargando…</div>
        ) : (
          <>
            {activeTab === 'GUIA' && (
              <TabGuias
                items={itemsByTipo.GUIA}
                isPlatformStaff={isPlatformStaff}
                onEdit={(p) => setModalState({ tipo: 'GUIA', publicacion: p })}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'VIDEO' && (
              <TabVideos
                items={itemsByTipo.VIDEO}
                isPlatformStaff={isPlatformStaff}
                onEdit={(p) => setModalState({ tipo: 'VIDEO', publicacion: p })}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'ARCHIVO' && (
              <TabArchivos
                items={itemsByTipo.ARCHIVO}
                isPlatformStaff={isPlatformStaff}
                onEdit={(p) => setModalState({ tipo: 'ARCHIVO', publicacion: p })}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'ESPACIO' && (
              <TabEspacios
                items={itemsByTipo.ESPACIO}
                isPlatformStaff={isPlatformStaff}
                onEdit={(p) => setModalState({ tipo: 'ESPACIO', publicacion: p })}
                onDelete={handleDelete}
                onReorder={handleReorder}
              />
            )}
          </>
        )}

        {!loading && itemsByTipo[activeTab].length === 0 && (
          <div className="cm-empty">
            Todavía no hay {activeTabDef?.label.toLowerCase()} publicadas.
            {isPlatformStaff && ' Usa "Nueva publicación" para crear la primera.'}
          </div>
        )}
      </div>

      {modalState && (
        <PublicacionModal
          tipo={modalState.tipo}
          publicacion={modalState.publicacion}
          onClose={() => setModalState(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
