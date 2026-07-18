import { useState, useRef, useMemo, useCallback } from 'react';
import { Icon } from './ui';
import { ActionDropdown, FilterDropdown, ContextMenu } from './dropdowns';
import PlantillaCard from './PlantillaCard';
import { groupPlantillasByFamilia, TEMPLATE_VACIO } from './helpers';
import { deletePlantilla, togglePlantillaActiva, regenerarPreviewPlantilla } from '../../api';
import { useConfirm } from '../../contexts/ConfirmContext';

import PreviewModal from './PreviewModal';
import UseTemplateModal from './UseTemplateModal';
import NewTemplateModal from './NewTemplateModal';
import PlantillaVersionsModal from './PlantillaVersionsModal';
import PlantillaContratosSheet from './PlantillaContratosSheet';

// ─── Tab: Plantillas ─────────────────────────────────────────────────────────
export default function PlantillasTab({
  plantillas, loading, error, onRetry, apiProductos, fetchPlantillasData, onPlantillaDeleted, onPlantillaPatched
}) {
  const { confirm, alert: alertModal } = useConfirm();
  
  const [filters, setFilters] = useState({ estado: 'Todos', categoria: 'Todos', search: '' });
  const [templateFormCache, setTemplateFormCache] = useState(TEMPLATE_VACIO);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [contextMenuTarget, setContextMenuTarget] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [useTemplate, setUseTemplate] = useState(null);
  const [openFamilyKey, setOpenFamilyKey] = useState(null);
  const [contratosVersion, setContratosVersion] = useState(null);
  const [contratosFamilia, setContratosFamilia] = useState(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  // Familia cuya card está saliendo con animación tras borrar su última versión.
  const [removingFamilia, setRemovingFamilia] = useState(null);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const activeFilterCount = [
    filters.estado !== 'Todos',
    filters.categoria !== 'Todos'
  ].filter(Boolean).length;

  const handleOpenContextMenu = useCallback((e, item) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenuTarget(item);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleEditTemplate = useCallback((template) => {
    setEditingTemplate(template);
    setTemplateFormCache({
       nombre: template.name,
       tipo_contrato: template.tipo_contrato,
       version_codigo: template.version,
       software_id: template.software_id || '',
       modo_origen: template.modo_origen,
       archivo_docx: null,
       ruta_plantilla_html: template.ruta_plantilla_html || '',
       codigo_prefijo: template._raw?.codigo_prefijo || '',
       requiere_sla_facturacion: template.requiere_sla_facturacion !== false
    });
    setIsNewTemplateModalOpen(true);
  }, []);

  const handleCreateTemplateFromScratch = useCallback(() => {
    setTemplateFormCache(TEMPLATE_VACIO);
    setEditingTemplate(null);
    setIsNewTemplateModalOpen(true);
  }, []);

  const familiaAbierta = useMemo(() => {
    if (!openFamilyKey) return null;
    return groupPlantillasByFamilia(plantillas).find(f => f.prefijo === openFamilyKey) || null;
  }, [plantillas, openFamilyKey]);

  const handleCreateNewVersion = useCallback((familia) => {
    const rep = familia.representante;
    setTemplateFormCache({
      ...TEMPLATE_VACIO,
      nombre: rep.name,
      tipo_contrato: rep.tipo_contrato,
      software_id: rep.software_id || '',
      modo_origen: rep.modo_origen,
      codigo_prefijo: familia.prefijo,
      requiere_sla_facturacion: rep.requiere_sla_facturacion !== false,
    });
    setEditingTemplate(null);
    setOpenFamilyKey(null);
    setIsNewTemplateModalOpen(true);
  }, []);

  const handleDuplicateTemplate = useCallback((template) => {
    setTemplateFormCache({
      ...TEMPLATE_VACIO,
      nombre: template.name,
      tipo_contrato: template.tipo_contrato,
      software_id: template.software_id || '',
      modo_origen: template.modo_origen,
      ruta_plantilla_html: template.ruta_plantilla_html || '',
      codigo_prefijo: template._raw?.codigo_prefijo || '',
      clausulas_seleccionadas: template._raw?.clausulas_seleccionadas || [],
      requiere_sla_facturacion: template.requiere_sla_facturacion !== false,
    });
    setEditingTemplate(null);
    setIsNewTemplateModalOpen(true);
  }, []);

  const handleToggleActivaVersion = useCallback(async (version, confirmar = false) => {
    const activar = version.status !== 'Aprobado';
    try {
      // El PATCH devuelve la plantilla actualizada: se parcha solo esa en el
      // estado local (y su contraparte archivada, si la hubo) sin refetch.
      const actualizada = await togglePlantillaActiva(version.id, activar, confirmar);
      onPlantillaPatched(actualizada);
    } catch (err) {
      if (!confirmar && err.status === 409 && /confirma/i.test(err.message)) {
        const ok = await confirm({ title: activar ? 'Activar versión' : 'Archivar versión', message: err.message, isDangerous: true });
        if (ok) return handleToggleActivaVersion(version, true);
        return;
      }
      alertModal({ title: 'Error', message: err.message, isDangerous: true });
    }
  }, [onPlantillaPatched, confirm, alertModal]);

  const handleDeleteTemplate = useCallback(async (template) => {
    const isBorrador = template.status === 'Borrador';
    const ok = await confirm({
      title: isBorrador ? 'Eliminar borrador' : 'Eliminar plantilla',
      message: `¿Eliminar ${isBorrador ? 'el borrador' : 'la plantilla'} "${template.name}" (${template.version})? Esta acción no se puede deshacer.`,
      isDangerous: true,
    });
    if (!ok) return;
    try {
      await deletePlantilla(template.id);
      // Sin refetch: se quita solo la plantilla borrada del estado local. Si era
      // la última versión de su familia, la card sale con una animación breve.
      const claveFamilia = template._raw?.codigo_prefijo || template.name;
      const eraUltimaVersion = plantillas.filter(p => (p._raw?.codigo_prefijo || p.name) === claveFamilia).length <= 1;
      if (eraUltimaVersion) {
        setRemovingFamilia(claveFamilia);
        setTimeout(() => {
          onPlantillaDeleted(template.id);
          setRemovingFamilia(null);
        }, 220);
      } else {
        onPlantillaDeleted(template.id);
      }
    } catch (err) {
      let message = err.message;
      if (err.data && err.data.documentos_afectados) {
        message = (
          <span style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
            {err.data.error || err.message}
            {'\n\nDocumentos afectados:\n'}
            {err.data.documentos_afectados.map((doc, i) => (
              <span key={doc.id}>
                • <a href={`/contratos/${doc.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{doc.nombre}</a>
                {'\n'}
              </span>
            ))}
            {err.data.total_docs > 3 && `• ...y ${err.data.total_docs - 3} documento(s) más`}
          </span>
        );
      }
      alertModal({ title: 'No se pudo eliminar', message, isDangerous: true });
    }
  }, [confirm, alertModal, plantillas, onPlantillaDeleted]);

  const handleRegeneratePreview = useCallback(async (template) => {
    try {
      await regenerarPreviewPlantilla(template.id);
      alertModal({ title: 'Éxito', message: 'Se ha forzado la regeneración del documento/vista previa correctamente.' });
    } catch (err) {
      alertModal({ title: 'Error', message: 'Error al regenerar: ' + err.message, isDangerous: true });
    }
  }, [alertModal]);

  const importBtnRef = useRef(null);
  const newTemplateBtnRef = useRef(null);
  const filterBtnRef = useRef(null);

  const visiblePlantillas = useMemo(() => plantillas.filter(p => {
    if (filters.estado !== 'Todos' && p.status !== filters.estado) return false;
    if (filters.categoria !== 'Todos' && p.cat !== filters.categoria) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const familia = (p._raw?.codigo_prefijo || '').toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.abbr.toLowerCase().includes(q) && !familia.includes(q)) return false;
    }
    return true;
  }), [plantillas, filters]);

  const clearFilters = () => {
    updateFilter('estado', 'Todos');
    updateFilter('categoria', 'Todos');
    updateFilter('search', '');
  };

  // Una card por familia de documento (ej. NDA): agrupa todas sus versiones que
  // pasan el filtro actual y muestra la más representativa (activa, o la última).
  const familiasVisibles = useMemo(() => groupPlantillasByFamilia(visiblePlantillas), [visiblePlantillas]);

  return (
    <div className="catalogo-plantillas">
      <div className="catalogo-toolbar">
        <div className="catalogo-search">
          <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
          <input
            type="text"
            placeholder="Buscar por nombre o familia (NDA, MSA…)"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <button
            ref={filterBtnRef}
            className="catalogo-btn-secondary"
            onClick={() => setFilterOpen(!filterOpen)}
            style={{ color: filterOpen ? 'var(--primary)' : undefined, borderColor: filterOpen ? 'var(--primary-border)' : undefined, background: filterOpen ? 'var(--primary-bg)' : undefined }}
          >
            <Icon d="M4 6h16M7 12h10M10 18h4" color={filterOpen ? 'var(--primary)' : 'var(--text-muted)'} w={13} />
            Filtrar
            {activeFilterCount > 0 && (
              <span style={{ background: 'var(--primary)', color: 'var(--text-on-accent)', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <FilterDropdown
              onClose={() => setFilterOpen(false)}
              filters={filters}
              updateFilter={updateFilter}
              anchorRef={filterBtnRef}
            />
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            ref={importBtnRef}
            className="catalogo-btn-secondary"
            onClick={() => setImportOpen(o => !o)}
          >
            <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} color="var(--text-muted)" w={13} />
            Importar
          </button>
          {importOpen && (
            <ActionDropdown
              anchorRef={importBtnRef}
              onClose={() => setImportOpen(false)}
              items={[
                {
                  label: 'Importar desde Word/PDF (próximamente)',
                  icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--text-muted)" w={14} />,
                  onClick: () => {},
                  disabled: true,
                },
                {
                  label: 'Importar desde Excel (próximamente)',
                  icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--success-deep)" w={14} />,
                  onClick: () => {},
                  disabled: true,
                }
              ]}
            />
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            ref={newTemplateBtnRef}
            className="catalogo-btn-primary"
            onClick={() => setNewTemplateOpen(o => !o)}
          >
            <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
            Nueva Plantilla
          </button>
          {newTemplateOpen && (
            <ActionDropdown
              anchorRef={newTemplateBtnRef}
              onClose={() => setNewTemplateOpen(false)}
              items={[
                {
                  label: 'Crear desde cero',
                  icon: <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-muted)" w={14} />,
                  onClick: () => {
                    setNewTemplateOpen(false);
                    handleCreateTemplateFromScratch();
                  },
                },
                {
                  label: 'Generar con IA (próximamente)',
                  icon: <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" color="var(--violet-bright)" w={14} />,
                  onClick: () => {},
                  disabled: true,
                },
                {
                  label: 'Importar documento (próximamente)',
                  icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--text-muted)" w={14} />,
                  onClick: () => {},
                  disabled: true,
                },
              ]}
            />
          )}
        </div>
      </div>

      <div className="catalogo-grid">
        {/* Estado de carga: skeleton con la silueta real de las cards — portada
            con hoja A4, título + meta, fila de estado y footer (evita salto de layout) */}
        {loading && [...Array(6)].map((_, i) => (
          <div key={i} className="catalogo-skeleton-card" aria-hidden="true">
            <div className="catalogo-skeleton-cover">
              <div className="catalogo-skeleton-line catalogo-skeleton-sheet" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="catalogo-skeleton-line" style={{ height: 12, width: '75%' }} />
              <div className="catalogo-skeleton-line" style={{ height: 9, width: '40%' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="catalogo-skeleton-line" style={{ height: 16, width: 64, borderRadius: 10 }} />
              <div className="catalogo-skeleton-line" style={{ height: 10, width: 42 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--bg-topbar)', paddingTop: 10, marginTop: 2 }}>
              <div className="catalogo-skeleton-line" style={{ height: 10, width: 72 }} />
              <div className="catalogo-skeleton-line" style={{ height: 24, width: 104, borderRadius: 8 }} />
            </div>
          </div>
        ))}

        {/* Estado de error */}
        {!loading && error && (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: 'var(--danger)' }}>
            <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={28} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar las plantillas</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error}</span>
            <button className="catalogo-btn-secondary" onClick={onRetry} style={{ marginTop: 4 }}>Reintentar</button>
          </div>
        )}

        {/* Estado vacío: catálogo sin plantillas */}
        {!loading && !error && plantillas.length === 0 && (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
            <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} w={40} color="var(--border)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay plantillas en el catálogo</span>
            <span style={{ fontSize: 11 }}>Crea tu primera plantilla con el botón «Nueva Plantilla».</span>
          </div>
        )}

        {/* Estado vacío: hay plantillas pero los filtros no dejan pasar ninguna */}
        {!loading && !error && plantillas.length > 0 && familiasVisibles.length === 0 && (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
            <Icon d={['M21 21l-4.35-4.35', 'M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z', 'M9 11h4']} w={36} color="var(--border)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Sin resultados para los filtros actuales</span>
            <button className="catalogo-btn-secondary" onClick={clearFilters} style={{ marginTop: 4 }}>Limpiar filtros</button>
          </div>
        )}

        {/* Grid de cards — una por familia de documento (ej. NDA), agrupando versiones */}
        {!loading && !error && familiasVisibles.map(f => (
          <PlantillaCard
            key={f.prefijo}
            p={f.representante}
            removing={removingFamilia === f.prefijo}
            versionCount={f.totalVersiones}
            totalUsos={f.totalUsos}
            onOpenVersions={() => setOpenFamilyKey(f.prefijo)}
            setPreviewTemplate={setPreviewTemplate}
            handleOpenContextMenu={handleOpenContextMenu}
            handleEditTemplate={handleEditTemplate}
            onOpenFamilyContratos={() => setContratosFamilia(f)}
            onToggleActiva={handleToggleActivaVersion}
          />
        ))}
      </div>

      {contextMenuTarget && (
        <ContextMenu
          pos={contextMenuPos}
          onClose={() => setContextMenuTarget(null)}
          onUse={() => { setUseTemplate(contextMenuTarget); setContextMenuTarget(null); }}
          onRegenerate={() => { handleRegeneratePreview(contextMenuTarget); setContextMenuTarget(null); }}
          onDelete={() => {
            handleDeleteTemplate(contextMenuTarget);
            setContextMenuTarget(null);
          }}
          onDuplicate={() => {
            handleDuplicateTemplate(contextMenuTarget);
            setContextMenuTarget(null);
          }}
          onToggleActiva={() => {
            handleToggleActivaVersion(contextMenuTarget);
            setContextMenuTarget(null);
          }}
          estado={contextMenuTarget.status}
        />
      )}

      {familiaAbierta && (
        <PlantillaVersionsModal
          familia={familiaAbierta}
          onClose={() => { setOpenFamilyKey(null); setContratosVersion(null); }}
          setPreviewTemplate={setPreviewTemplate}
          handleOpenContextMenu={handleOpenContextMenu}
          handleEditTemplate={(v) => { setOpenFamilyKey(null); handleEditTemplate(v); }}
          onCreateVersion={handleCreateNewVersion}
          onToggleActiva={handleToggleActivaVersion}
          onOpenContratos={setContratosVersion}
          escapePaused={!!contratosVersion || !!contextMenuTarget}
        />
      )}

      {contratosVersion && (
        <PlantillaContratosSheet
          plantilla={contratosVersion}
          onClose={() => setContratosVersion(null)}
        />
      )}

      {contratosFamilia && (
        <PlantillaContratosSheet
          familia={contratosFamilia}
          onClose={() => setContratosFamilia(null)}
        />
      )}

      {previewTemplate && (
        <PreviewModal
          plantilla={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => { setUseTemplate(previewTemplate); setPreviewTemplate(null); }}
        />
      )}

      {useTemplate && (
        <UseTemplateModal plantilla={useTemplate} onClose={() => setUseTemplate(null)} />
      )}

      {isNewTemplateModalOpen && (
        <NewTemplateModal
          createForm={templateFormCache}
          setCreateForm={setTemplateFormCache}
          softwareList={apiProductos}
          existingPlantillas={plantillas}
          editingTemplate={editingTemplate}
          onClose={() => {
            setIsNewTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          onSuccess={(guardada) => {
            setIsNewTemplateModalOpen(false);
            setEditingTemplate(null);
            // Con la plantilla que devolvió el server basta un upsert local;
            // el refetch queda solo como red de seguridad si no vino cuerpo.
            if (guardada?.id) onPlantillaPatched(guardada);
            else fetchPlantillasData();
          }}
        />
      )}
    </div>
  );
}
