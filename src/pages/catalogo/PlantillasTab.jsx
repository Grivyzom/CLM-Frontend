import { useState, useRef, useMemo } from 'react';
import { Icon } from './ui';
import { ActionDropdown, FilterDropdown } from './dropdowns';
import PlantillaCard from './PlantillaCard';

// ─── Tab: Plantillas ─────────────────────────────────────────────────────────
export default function PlantillasTab({
  plantillas, loading, error, onRetry,
  filters, updateFilter, activeFilterCount,
  setPreviewTemplate, handleOpenContextMenu, onCreateFromScratch,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);

  const importBtnRef = useRef(null);
  const newTemplateBtnRef = useRef(null);
  const filterBtnRef = useRef(null);

  const visiblePlantillas = useMemo(() => plantillas.filter(p => {
    if (filters.estado !== 'Todos' && p.status !== filters.estado) return false;
    if (filters.categoria !== 'Todos' && p.cat !== filters.categoria) return false;
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && !p.abbr.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }), [plantillas, filters]);

  return (
    <div className="catalogo-plantillas">
      <div className="catalogo-toolbar">
        <div className="catalogo-search">
          <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
          <input
            type="text"
            placeholder="Buscar plantilla…"
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
                  label: 'Importar desde Word/PDF',
                  icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--text-muted)" w={14} />,
                  onClick: () => console.log('Import from Word/PDF'),
                },
                {
                  label: 'Importar desde Excel',
                  icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--success-deep)" w={14} />,
                  onClick: () => console.log('Import from Excel'),
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
                    onCreateFromScratch();
                  },
                },
                {
                  label: 'Generar con IA (Enfoque AI)',
                  icon: <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" color="var(--violet-bright)" w={14} />,
                  onClick: () => console.log('Generar con IA'),
                },
                {
                  label: 'Importar documento (Word/PDF)',
                  icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="var(--text-muted)" w={14} />,
                  onClick: () => console.log('Importar doc'),
                },
                {
                  label: 'Clonar existente',
                  icon: <Icon d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" color="var(--text-muted)" w={14} />,
                  onClick: () => console.log('Clonar existente'),
                }
              ]}
            />
          )}
        </div>
      </div>

      <div className="catalogo-grid">
        {/* Estado de carga */}
        {loading && (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: 'var(--text-faint)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span style={{ fontSize: 12 }}>Cargando plantillas…</span>
          </div>
        )}

        {/* Estado de error */}
        {!loading && error && (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: 'var(--danger)' }}>
            <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={28} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar las plantillas</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error}</span>
            <button className="catalogo-btn-secondary" onClick={onRetry} style={{ marginTop: 4 }}>Reintentar</button>
          </div>
        )}

        {/* Estado vacío */}
        {!loading && !error && plantillas.length === 0 && (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
            <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} w={40} color="var(--border)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay plantillas en el catálogo</span>
            <span style={{ fontSize: 11 }}>Crea tu primera plantilla con el botón «Nueva Plantilla».</span>
          </div>
        )}

        {/* Grid de cards */}
        {!loading && !error && visiblePlantillas.map(p => (
          <PlantillaCard
            key={p.id}
            p={p}
            setPreviewTemplate={setPreviewTemplate}
            handleOpenContextMenu={handleOpenContextMenu}
          />
        ))}
      </div>
    </div>
  );
}
