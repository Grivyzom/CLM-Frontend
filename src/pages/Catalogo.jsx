import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import './Catalogo.css';
import { getPlantillas, getClausulas, getProductos, deleteProducto } from '../api';
import EditClauseModal from './EditClauseModal';
import TopbarActions from '../components/layout/TopbarActions';
import { useConfirm } from '../contexts/ConfirmContext';

import { normalizeApiPlantilla, getTagStyles, PRODUCTO_VACIO, TEMPLATE_VACIO } from './catalogo/helpers';
import { Icon } from './catalogo/ui';
import { ContextMenu } from './catalogo/dropdowns';
import PlantillasTab from './catalogo/PlantillasTab';
import ClausulasTab from './catalogo/ClausulasTab';
import ProductosTab from './catalogo/ProductosTab';
import ReglasTab from './catalogo/ReglasTab';
import PreviewModal from './catalogo/PreviewModal';
import UseTemplateModal from './catalogo/UseTemplateModal';
import InsertarClausulaModal from './catalogo/InsertarClausulaModal';
import ProductModal from './catalogo/ProductModal';
import NewTemplateModal from './catalogo/NewTemplateModal';

gsap.registerPlugin(useGSAP);

const CLAUSES_PER_PAGE = 10;

export default function Catalogo() {
  const { confirm, alert: alertModal } = useConfirm();
  const [tab, setTab] = useState('plantillas');
  const [selectedClause, setSelectedClause] = useState(0);
  const [clauseAlt, setClauseAlt] = useState(0);
  const [clausePage, setClausePage] = useState(1);

  const [isClauseModalOpen, setIsClauseModalOpen] = useState(false);
  const [clauseToEdit, setClauseToEdit] = useState(null);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);

  // Los modales de cláusulas se renderizan a nivel de página: al cambiar de tab
  // deben cerrarse explícitamente.
  useEffect(() => {
    setIsInsertModalOpen(false);
    setIsClauseModalOpen(false);
  }, [tab]);

  // Cache state for creation modals
  const [productFormCache, setProductFormCache] = useState(PRODUCTO_VACIO);
  const [clauseFormCache, setClauseFormCache] = useState({
    name: '',
    cat: '',
    risk: 'Medio',
    versions: [
      { label: 'Estándar', tag: 'Estándar', text: '' }
    ]
  });
  const [templateFormCache, setTemplateFormCache] = useState(TEMPLATE_VACIO);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [contextMenuTarget, setContextMenuTarget] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState({ estado: 'Todos', categoria: 'Todos', search: '' });
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [useTemplate, setUseTemplate] = useState(null);

  // ── Carga de plantillas desde la API ────────────────────────────────────────
  const [apiPlantillas, setApiPlantillas] = useState([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(true);
  const [errorPlantillas, setErrorPlantillas] = useState(null);

  const fetchPlantillasData = useCallback(() => {
    setLoadingPlantillas(true);
    setErrorPlantillas(null);
    getPlantillas()
      .then(data => {
        setApiPlantillas((data || []).map(normalizeApiPlantilla));
        setLoadingPlantillas(false);
      })
      .catch(err => {
        setErrorPlantillas(err.message || 'Error al cargar plantillas');
        setLoadingPlantillas(false);
      });
  }, []);

  useEffect(() => {
    fetchPlantillasData();
  }, [fetchPlantillasData]);

  const catalogoContainerRef = useRef(null);
  // La entrada de cards corre solo una vez por sesión: re-animarla en cada
  // cambio de filtros hacía sentir la vista lenta al escribir en el buscador.
  const cardsAnimatedRef = useRef(false);

  useGSAP(() => {
    if (cardsAnimatedRef.current) return;
    if (sessionStorage.getItem('catalogo_animated') === 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (tab === 'plantillas' && !loadingPlantillas && apiPlantillas.length > 0) {
      const cards = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card');
      if (cards && cards.length > 0) {
        cardsAnimatedRef.current = true;

        // Select internal text and badge elements
        const titles = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-title div p');
        const metas = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-meta');
        const statuses = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-status > *');
        const footers = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-footer > *');

        const tl = gsap.timeline({
          onComplete: () => {
            sessionStorage.setItem('catalogo_animated', 'true');
          }
        });

        // 1. Animate card outlines/backgrounds
        tl.fromTo(cards, { y: 16, opacity: 0 }, {
          y: 0, opacity: 1,
          duration: 0.35, stagger: 0.04, ease: 'power2.out',
          clearProps: 'transform,opacity'
        });

        // 2. Slide up titles and category metadata in stagger
        tl.fromTo(titles, { y: 10, opacity: 0 }, {
          y: 0, opacity: 1,
          duration: 0.3, stagger: 0.025, ease: 'power3.out',
          clearProps: 'transform,opacity'
        }, '-=0.25');

        tl.fromTo(metas, { y: 8, opacity: 0 }, {
          y: 0, opacity: 1,
          duration: 0.28, stagger: 0.025, ease: 'power3.out',
          clearProps: 'transform,opacity'
        }, '-=0.24');

        // 3. Stagger reveal status badges & variable counts
        tl.fromTo(statuses, { y: 6, opacity: 0 }, {
          y: 0, opacity: 1,
          duration: 0.25, stagger: 0.02, ease: 'power2.out',
          clearProps: 'transform,opacity'
        }, '-=0.2');

        // 4. Reveal footer actions and dates
        tl.fromTo(footers, { y: 6, opacity: 0 }, {
          y: 0, opacity: 1,
          duration: 0.25, stagger: 0.02, ease: 'power2.out',
          clearProps: 'transform,opacity'
        }, '-=0.18');
      }
    }
  }, { dependencies: [apiPlantillas, loadingPlantillas, tab], scope: catalogoContainerRef });

  // ── Carga de cláusulas desde la API ─────────────────────────────────────────
  const [apiClausulas, setApiClausulas] = useState([]);
  const [loadingClausulas, setLoadingClausulas] = useState(true);
  const [errorClausulas, setErrorClausulas] = useState(null);

  const fetchClausulasData = useCallback(() => {
    setLoadingClausulas(true);
    setErrorClausulas(null);
    getClausulas()
      .then(data => {
        const normalized = (data || []).map(c => ({
          ...c,
          versions: c.versions.map(v => ({
            ...v,
            label: v.etiqueta,
            tag: v.tipo,
            text: v.texto,
            ...getTagStyles(v.tipo)
          }))
        }));
        setApiClausulas(normalized);
        setLoadingClausulas(false);
        setSelectedClause(prev => (prev === 0 && normalized.length > 0) ? normalized[0].id : prev);
      })
      .catch(err => {
        setErrorClausulas(err.message || 'Error al cargar cláusulas');
        setLoadingClausulas(false);
      });
  }, []);

  useEffect(() => {
    fetchClausulasData();
  }, [fetchClausulasData]);

  // ── Carga de productos/tarifas desde la API ─────────────────────────────────
  const [apiProductos, setApiProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(null);
  const [productoFilters, setProductoFilters] = useState({ search: '', categoria: 'Todos' });

  const fetchProductosData = useCallback(() => {
    setLoadingProductos(true);
    setErrorProductos(null);
    getProductos()
      .then(data => {
        setApiProductos(data || []);
        setLoadingProductos(false);
      })
      .catch(err => {
        setErrorProductos(err.message || 'Error al cargar productos');
        setLoadingProductos(false);
      });
  }, []);

  useEffect(() => {
    fetchProductosData();
  }, [fetchProductosData]);

  // Auto-draw SVG icons al cargar la página o cambiar de tab. No depende de los
  // filtros: redibujar todos los iconos en cada tecla del buscador causaba jank.
  // Se leen todos los getTotalLength() antes de escribir estilos para evitar
  // layout thrashing (lectura/escritura alternada fuerza un reflow por icono).
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const paths = catalogoContainerRef.current?.querySelectorAll(
      'svg.clm-svg path, svg.clm-svg line, svg.clm-svg polyline, svg.clm-svg circle, svg.clm-svg rect'
    );
    if (!paths || paths.length === 0) return;

    const measured = [];
    paths.forEach(path => {
      try {
        const length = path.getTotalLength();
        if (length > 0) measured.push([path, length]);
      } catch (e) {}
    });
    measured.forEach(([path, length]) => {
      gsap.fromTo(path,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          clearProps: 'strokeDasharray,strokeDashoffset'
        }
      );
    });
  }, { dependencies: [tab, loadingPlantillas, loadingClausulas, loadingProductos], scope: catalogoContainerRef });

  // Draw SVG icons on hover de elementos interactivos. Delegación de eventos:
  // un solo listener en el contenedor en lugar de uno por botón/card, y cubre
  // elementos agregados dinámicamente sin re-suscribirse en cada render.
  useGSAP(() => {
    const container = catalogoContainerRef.current;
    if (!container) return;

    const SELECTOR = '.catalogo-tab, .catalogo-card, .catalogo-btn-secondary, .catalogo-btn-primary, .catalogo-action-btn, button';

    const handleMouseOver = (e) => {
      const el = e.target.closest(SELECTOR);
      if (!el || !container.contains(el)) return;
      // Ignorar movimientos internos dentro del mismo elemento (equivale a mouseenter)
      if (el.contains(e.relatedTarget)) return;

      const paths = el.querySelectorAll(
        'svg.clm-svg path, svg.clm-svg line, svg.clm-svg polyline, svg.clm-svg circle, svg.clm-svg rect'
      );
      paths.forEach(path => {
        try {
          const length = path.getTotalLength();
          if (length > 0) {
            gsap.fromTo(path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.6,
                ease: 'power2.out',
                clearProps: 'strokeDasharray,strokeDashoffset'
              }
            );
          }
        } catch (e) {}
      });
    };

    container.addEventListener('mouseover', handleMouseOver);
    return () => container.removeEventListener('mouseover', handleMouseOver);
  }, { scope: catalogoContainerRef });

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalMode, setProductModalMode] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleProductModalSaved = (producto, mode) => {
    if (mode === 'create') {
      setApiProductos(prev => [...prev, producto]);
    } else {
      setApiProductos(prev => prev.map(p => p.id === producto.id ? producto : p));
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await confirm({
        title: 'Eliminar producto',
        message: '¿Estás seguro de que deseas eliminar este producto/tarifa?',
        isDangerous: true,
        action: async () => {
          await deleteProducto(id);
          setApiProductos(prev => prev.filter(p => p.id !== id));
        }
      });
    } catch (err) {
      if (err) {
        alertModal({ title: 'Error al eliminar producto', message: err.message || 'Error al eliminar el producto', isDangerous: true });
      }
    }
  };

  const [productoSort, setProductoSort] = useState({ key: '', direction: '' });

  const filteredAndSortedProductos = useMemo(() => {
    let items = apiProductos.filter(p => {
      if (productoFilters.categoria !== 'Todos' && p.cat !== productoFilters.categoria) return false;
      if (productoFilters.search && !p.name.toLowerCase().includes(productoFilters.search.toLowerCase()) && !p.sku.toLowerCase().includes(productoFilters.search.toLowerCase())) return false;
      return true;
    });

    if (productoSort.key) {
      const isAsc = productoSort.direction === 'asc';
      items.sort((a, b) => {
        let valA = a[productoSort.key];
        let valB = b[productoSort.key];

        if (productoSort.key === 'price') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return isAsc ? -1 : 1;
        if (valA > valB) return isAsc ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [apiProductos, productoFilters, productoSort]);

  const handleProductoSort = (nextOrdering) => {
    if (!nextOrdering) {
      setProductoSort({ key: '', direction: '' });
    } else if (nextOrdering.startsWith('-')) {
      setProductoSort({ key: nextOrdering.slice(1), direction: 'desc' });
    } else {
      setProductoSort({ key: nextOrdering, direction: 'asc' });
    }
  };

  const productoOrdering = productoSort.key
    ? (productoSort.direction === 'desc' ? `-${productoSort.key}` : productoSort.key)
    : '';

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

  const handleCreateTemplateFromScratch = useCallback(() => {
    setTemplateFormCache(TEMPLATE_VACIO);
    setEditingTemplate(null);
    setIsNewTemplateModalOpen(true);
  }, []);

  const selectedClauseData = apiClausulas.find(c => c.id === selectedClause) || apiClausulas[0];
  const selectedAlt = selectedClauseData ? (selectedClauseData.versions[clauseAlt] || selectedClauseData.versions[0]) : null;

  const totalClausePages = Math.ceil(apiClausulas.length / CLAUSES_PER_PAGE);
  const paginatedClausulas = apiClausulas.slice((clausePage - 1) * CLAUSES_PER_PAGE, clausePage * CLAUSES_PER_PAGE);
  const clauseCategories = Array.from(new Set(paginatedClausulas.map(c => c.cat)));

  return (
    <div className="catalogo-container" ref={catalogoContainerRef}>
      <div className="catalogo-header">
        <div>
          <p className="catalogo-header-label">Enfoque Platform</p>
          <h1 className="catalogo-header-title">Catálogo</h1>
        </div>
        <div className="catalogo-header-info">
          <span className="catalogo-date">Vie 4 jul 2026</span>
          <div className="catalogo-divider"></div>
          <TopbarActions />
        </div>
      </div>

      <div className="catalogo-tabs">
        {[
          { id: 'plantillas', label: 'Plantillas', count: loadingPlantillas ? '…' : apiPlantillas.length, icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'] },
          { id: 'clausulas', label: 'Cláusulas', count: loadingClausulas ? '…' : apiClausulas.length, icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
          { id: 'productos', label: 'Productos / Tarifas', count: loadingProductos ? '…' : apiProductos.length, icon: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'] },
          { id: 'reglas', label: 'Reglas de Negocio', count: 7, icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'] },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`catalogo-tab ${tab === t.id ? 'active' : ''}`}
          >
            <Icon d={t.icon} color={tab === t.id ? 'var(--primary)' : 'var(--text-faint)'} w={14} />
            <span>{t.label}</span>
            <span className="catalogo-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="catalogo-content">
        {tab === 'plantillas' && (
          <PlantillasTab
            plantillas={apiPlantillas}
            loading={loadingPlantillas}
            error={errorPlantillas}
            onRetry={fetchPlantillasData}
            filters={filters}
            updateFilter={updateFilter}
            activeFilterCount={activeFilterCount}
            setPreviewTemplate={setPreviewTemplate}
            handleOpenContextMenu={handleOpenContextMenu}
            onCreateFromScratch={handleCreateTemplateFromScratch}
          />
        )}

        {tab === 'clausulas' && (
          <ClausulasTab
            loading={loadingClausulas}
            error={errorClausulas}
            paginatedClausulas={paginatedClausulas}
            clauseCategories={clauseCategories}
            clausePage={clausePage}
            setClausePage={setClausePage}
            totalClausePages={totalClausePages}
            selectedClause={selectedClause}
            setSelectedClause={setSelectedClause}
            clauseAlt={clauseAlt}
            setClauseAlt={setClauseAlt}
            selectedClauseData={selectedClauseData}
            selectedAlt={selectedAlt}
            onNewClause={() => { setClauseToEdit(null); setIsClauseModalOpen(true); }}
            onEditClause={(clause) => { setClauseToEdit(clause); setIsClauseModalOpen(true); }}
            onInsert={() => setIsInsertModalOpen(true)}
          />
        )}

        {tab === 'productos' && (
          <ProductosTab
            productos={filteredAndSortedProductos}
            loading={loadingProductos}
            error={errorProductos}
            onRetry={fetchProductosData}
            productoFilters={productoFilters}
            setProductoFilters={setProductoFilters}
            ordering={productoOrdering}
            onSort={handleProductoSort}
            onCreate={() => { setSelectedProduct(null); setProductModalMode('create'); setProductModalOpen(true); }}
            onView={(p) => { setSelectedProduct(p); setProductModalMode('view'); setProductModalOpen(true); }}
            onEdit={(p) => { setSelectedProduct(p); setProductModalMode('edit'); setProductModalOpen(true); }}
            onDelete={handleDeleteProduct}
          />
        )}

        {tab === 'reglas' && <ReglasTab />}
      </div>

      {contextMenuTarget && (
        <ContextMenu
          pos={contextMenuPos}
          onClose={() => setContextMenuTarget(null)}
          onPreview={() => { setPreviewTemplate(contextMenuTarget); setContextMenuTarget(null); }}
          onUse={() => { setUseTemplate(contextMenuTarget); setContextMenuTarget(null); }}
          onEdit={() => {
            setEditingTemplate(contextMenuTarget);
            setTemplateFormCache({
               nombre: contextMenuTarget.name,
               tipo_contrato: contextMenuTarget.tipo_contrato,
               version_codigo: contextMenuTarget.version,
               software_id: contextMenuTarget.software_id || '',
               modo_origen: contextMenuTarget.modo_origen,
               archivo_docx: null
            });
            setIsNewTemplateModalOpen(true);
            setContextMenuTarget(null);
          }}
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
          editingTemplate={editingTemplate}
          onClose={() => {
            setIsNewTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          onSuccess={() => {
            setIsNewTemplateModalOpen(false);
            setEditingTemplate(null);
            fetchPlantillasData();
          }}
        />
      )}

      {productModalOpen && (
        <ProductModal
          mode={productModalMode}
          product={selectedProduct}
          createForm={productFormCache}
          setCreateForm={setProductFormCache}
          onClose={() => {
            setProductModalOpen(false);
            setSelectedProduct(null);
          }}
          onSaved={handleProductModalSaved}
        />
      )}

      {isInsertModalOpen && (
        <InsertarClausulaModal
          clauseText={selectedClauseData?.versions[clauseAlt]?.text}
          clauseName={selectedClauseData?.name}
          clauseId={selectedClauseData?.id}
          onClose={() => setIsInsertModalOpen(false)}
        />
      )}

      {isClauseModalOpen && (
        <EditClauseModal
          clause={clauseToEdit}
          createForm={clauseFormCache}
          setCreateForm={setClauseFormCache}
          onClose={() => setIsClauseModalOpen(false)}
          onSuccess={() => {
            setIsClauseModalOpen(false);
            fetchClausulasData();
          }}
        />
      )}
    </div>
  );
}
