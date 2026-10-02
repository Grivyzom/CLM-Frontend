import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SortableHeader from '../../components/ui/SortableHeader';
import { Icon } from './ui';
import { PRODUCTO_CATEGORIAS, formatPrecio, PRODUCTO_VACIO, PLATAFORMA_LABEL } from './helpers';
import { ICONS } from './icons';
import ProductModal from './ProductModal';

// Paleta por tono de badge: los badges heredan el acento de su semántica en
// lugar de repetir literales rgba por cada rama.
const TONOS = {
  blue:    { bg: 'rgba(59, 130, 246, 0.07)',  border: 'rgba(59, 130, 246, 0.2)',  color: 'var(--primary)' },
  green:   { bg: 'rgba(16, 185, 129, 0.07)',  border: 'rgba(16, 185, 129, 0.2)',  color: 'var(--success-alt)' },
  violet:  { bg: 'rgba(139, 92, 246, 0.07)',  border: 'rgba(139, 92, 246, 0.2)',  color: 'var(--violet-bright)' },
  rose:    { bg: 'rgba(236, 72, 153, 0.07)',  border: 'rgba(236, 72, 153, 0.2)',  color: 'var(--rose)' },
  cyan:    { bg: 'rgba(6, 182, 212, 0.07)',   border: 'rgba(6, 182, 212, 0.2)',   color: 'var(--cyan)' },
  danger:  { bg: 'rgba(239, 68, 68, 0.07)',   border: 'rgba(239, 68, 68, 0.2)',   color: 'var(--danger)' },
  amber:   { bg: 'rgba(245, 158, 11, 0.07)',  border: 'rgba(245, 158, 11, 0.2)',  color: 'var(--warning-bright)' },
  neutral: { bg: 'var(--bg-subtle)',          border: 'var(--border)',            color: 'var(--text-secondary)' },
};

const toneStyle = (tone) => {
  const t = TONOS[tone] || TONOS.neutral;
  return { background: t.bg, borderColor: t.border, color: t.color };
};

// Icono representativo de la plataforma de software (mismos trazos que usa el
// modal de creación, para que el ítem se reconozca igual en ambas vistas).
const PLATAFORMA_ICON = {
  'App Web': ICONS.globe,
  'App Android': ICONS.android,
  'App iOS': ICONS.apple,
  'App Multiplataforma': ICONS.layers,
  'Software Nativo PC': ICONS.monitor,
  'Software Nativo Mac': ICONS.laptop,
  'Servicio Backend': ICONS.server,
  'Otro': ICONS.tool,
};

const CATEGORIA_META = {
  'Bot':         { tone: 'cyan',   icon: ICONS.bot },
  'Agente':      { tone: 'violet', icon: ICONS.bot },
  'Script':      { tone: 'green',  icon: ICONS.brackets },
  'Software':    { tone: 'blue',   icon: ICONS.package },
  'Auditoría':   { tone: 'danger', icon: ICONS.shield },
  'Consultoría': { tone: 'amber',  icon: ICONS.users },
};

function Badge({ icon, label, tone = 'neutral', title }) {
  const s = toneStyle(tone);
  return (
    <span className="cat-badge" style={s} title={title || label}>
      {icon && <Icon d={icon} w={11} color="currentColor" />}
      {label}
    </span>
  );
}

function renderCuratedBadges(p) {
  const extra = p.datos_adicionales;
  if (!extra || Object.keys(extra).length === 0) return null;

  const badges = [];

  if (p.cat === 'Software') {
    // 1. Modalidad de entrega
    if (extra.modalidad_entrega) {
      const mode = extra.modalidad_entrega;
      let icon = ICONS.package;
      if (mode.includes('SaaS') || mode.includes('Cloud')) icon = ICONS.cloud;
      else if (mode.includes('On-Premise')) icon = ICONS.building;
      else if (mode.includes('Híbrido')) icon = ICONS.refresh;
      else if (mode.includes('Local')) icon = ICONS.hardDrive;
      badges.push({ label: mode, icon, tone: 'blue' });
    }
    // 2. Nivel de soporte
    if (extra.nivel_soporte) {
      const support = extra.nivel_soporte;
      let label = support.split(' (')[0]; // Simplify "Básico (Email/Tickets)" -> "Básico"
      let icon = ICONS.clock;
      if (support.includes('Premium')) { icon = ICONS.star; label = 'Premium (24/7)'; }
      else if (support.includes('Estándar')) { icon = ICONS.clock; label = 'Estándar'; }
      else if (support.includes('Básico')) { icon = ICONS.mail; label = 'Básico'; }
      else { icon = ICONS.ban; label = 'Sin Soporte'; }
      badges.push({ label, icon, tone: 'green', title: support });
    }
    // 3. Propiedad Intelectual
    if (extra.propiedad_intelectual) {
      const ip = extra.propiedad_intelectual;
      let label = 'Licencia';
      let icon = ICONS.fileText;
      if (ip.includes('Desarrollador')) { label = 'Licencia de Uso'; icon = ICONS.fileText; }
      else if (ip.includes('Cliente')) { label = 'Propiedad Cliente'; icon = ICONS.briefcase; }
      else if (ip.includes('Abierto') || ip.includes('Open Source')) { label = 'Open Source'; icon = ICONS.unlock; }
      badges.push({ label, icon, tone: 'violet', title: ip });
    }
  } else if (p.cat === 'Agente') {
    if (extra.tipo_agente) badges.push({ label: `Agente ${extra.tipo_agente}`, icon: ICONS.bot, tone: 'violet' });
    if (extra.integracion_llm) badges.push({ label: extra.integracion_llm, icon: ICONS.cpu, tone: 'rose' });
  } else if (p.cat === 'Script') {
    if (extra.entorno_lenguaje) badges.push({ label: extra.entorno_lenguaje, icon: ICONS.terminal, tone: 'green' });
    if (extra.proposito) badges.push({ label: extra.proposito, icon: ICONS.settings, tone: 'neutral' });
  } else if (p.cat === 'Auditoría') {
    if (extra.enfoque) badges.push({ label: extra.enfoque, icon: ICONS.shield, tone: 'danger' });
  } else if (p.cat === 'Consultoría') {
    if (extra.modalidad) badges.push({ label: extra.modalidad, icon: ICONS.handshake, tone: 'amber' });
  }

  // Fallback: if no curated badges found, show original style for whatever keys we have
  if (badges.length === 0) {
    return (
      <div className="cat-badge-row">
        {Object.entries(extra).map(([k, v]) => {
          if (!v) return null;
          const valor = typeof v === 'object' && v !== null
            ? (Array.isArray(v) ? v.join(', ') : JSON.stringify(v))
            : String(v);
          return (
            <span key={k} className="cat-badge cat-badge-raw" title={`${k}: ${valor}`}>
              <strong>{k.replace(/_/g, ' ')}:</strong> {valor}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="cat-badge-row">
      {badges.map((b, idx) => <Badge key={idx} {...b} />)}
    </div>
  );
}

function renderCategoriaBadge(p) {
  const meta = CATEGORIA_META[p.cat] || { tone: 'neutral', icon: null };
  const s = toneStyle(meta.tone);

  // Subcategoría: la plataforma del software. Se muestra con su etiqueta corta
  // ("Híbrida" en vez de "App Multiplataforma") y su propio icono, tintada con
  // el acento de la categoría para que se lea como un par y no como dos chips
  // sueltos.
  let subLabel = '';
  let subIcon = null;
  if (p.cat === 'Software') {
    const tipo = p.datos_adicionales?.tipo_software;
    if (tipo) {
      subLabel = tipo === 'Otro'
        ? (p.datos_adicionales?.tipo_software_otro || 'Otro')
        : (PLATAFORMA_LABEL[tipo] || tipo);
      subIcon = PLATAFORMA_ICON[tipo] || ICONS.tool;
    }
  }

  return (
    <div className="cat-cat-cell">
      <span className="cat-cat-badge" style={s}>
        {meta.icon && <Icon d={meta.icon} w={11} color="currentColor" />}
        {p.cat}
      </span>
      {subLabel && (
        <span className="cat-subcat-badge" style={{ '--sub-accent': s.color }} title={p.datos_adicionales?.tipo_software}>
          {subIcon && <Icon d={subIcon} w={10} color="var(--sub-accent)" />}
          {subLabel}
        </span>
      )}
    </div>
  );
}

// ─── Tab: Productos / Tarifas ────────────────────────────────────────────────

export default function ProductosTab({
  productos, loading, error, onRetry,
  productoFilters, setProductoFilters,
  ordering, onSort, onDelete, onProductSaved,
}) {
  const navigate = useNavigate();

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalMode, setProductModalMode] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productFormCache, setProductFormCache] = useState(PRODUCTO_VACIO);

  const hayFiltros = !!productoFilters.search || productoFilters.categoria !== 'Todos';
  const limpiarFiltros = () => setProductoFilters({ search: '', categoria: 'Todos' });

  const handleCreate = () => {
    setSelectedProduct(null);
    setProductModalMode('create');
    setProductModalOpen(true);
  };

  const handleView = (p) => {
    setSelectedProduct(p);
    setProductModalMode('view');
    setProductModalOpen(true);
  };

  const handleEdit = (p) => {
    setSelectedProduct(p);
    setProductModalMode('edit');
    setProductModalOpen(true);
  };
  return (
    <div className="catalogo-productos">
      <div className="catalogo-toolbar">
        <div className="catalogo-search">
          <Icon d={ICONS.search} color="var(--text-faint)" w={13} />
          <input
            type="text"
            placeholder="Buscar por SKU o nombre…"
            value={productoFilters.search}
            onChange={e => setProductoFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          {productoFilters.search && (
            <button
              type="button"
              className="catalogo-search-clear"
              aria-label="Limpiar búsqueda"
              onClick={() => setProductoFilters(prev => ({ ...prev, search: '' }))}
            >
              <Icon d={ICONS.x} w={11} color="currentColor" />
            </button>
          )}
        </div>
        <select
          className="catalogo-btn-secondary"
          value={productoFilters.categoria}
          onChange={e => setProductoFilters(prev => ({ ...prev, categoria: e.target.value }))}
          style={{ cursor: 'pointer' }}
          aria-label="Filtrar por categoría"
        >
          {['Todos', ...PRODUCTO_CATEGORIAS].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {!loading && !error && (
          <span className="catalogo-result-count">
            {productos.length} {productos.length === 1 ? 'ítem' : 'ítems'}
            {hayFiltros && ' filtrados'}
          </span>
        )}

        {hayFiltros && (
          <button type="button" className="catalogo-btn-ghost" onClick={limpiarFiltros}>
            <Icon d={ICONS.x} w={12} color="currentColor" />
            Limpiar
          </button>
        )}

        <button className="catalogo-btn-primary" style={{ marginLeft: 'auto' }} onClick={handleCreate}>
          <Icon d={ICONS.plus} color="var(--text-on-accent)" w={13} />
          Agregar Ítem
        </button>
      </div>

      <div className="catalogo-productos-table">
        <div className="catalogo-productos-header">
          <SortableHeader className="sortable" label="SKU" field="sku" ordering={ordering} onSort={onSort} />
          <SortableHeader className="sortable" label="Nombre" field="name" ordering={ordering} onSort={onSort} />
          <SortableHeader className="sortable" label="Descripción" field="desc" ordering={ordering} onSort={onSort} />
          <SortableHeader className="sortable" label="Categoría" field="cat" ordering={ordering} onSort={onSort} />
          <SortableHeader className="sortable" label="Precio" field="price" ordering={ordering} onSort={onSort} />
          <SortableHeader className="sortable" label="Moneda" field="currency" ordering={ordering} onSort={onSort} />
          <span>Acciones</span>
        </div>

        {loading && (
          <div className="catalogo-productos-state">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span style={{ fontSize: 12 }}>Cargando productos…</span>
          </div>
        )}

        {!loading && error && (
          <div className="catalogo-productos-state" style={{ color: 'var(--danger)' }}>
            <Icon d={ICONS.alertTriangle} color="var(--danger)" w={28} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar los productos</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error}</span>
            <button className="catalogo-btn-secondary" onClick={onRetry} style={{ marginTop: 4 }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && productos.length === 0 && (
          hayFiltros ? (
            <div className="catalogo-productos-state">
              <Icon d={ICONS.search} w={34} color="var(--border-strong)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Ningún ítem coincide con el filtro</span>
              <span style={{ fontSize: 11 }}>
                {productoFilters.search ? `Búsqueda «${productoFilters.search}»` : 'Sin búsqueda'}
                {productoFilters.categoria !== 'Todos' && ` · Categoría ${productoFilters.categoria}`}
              </span>
              <button className="catalogo-btn-secondary" onClick={limpiarFiltros} style={{ marginTop: 4 }}>Limpiar filtros</button>
            </div>
          ) : (
            <div className="catalogo-productos-state">
              <Icon d={ICONS.store} w={38} color="var(--border-strong)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay productos en el catálogo</span>
              <span style={{ fontSize: 11 }}>Crea el primero con el botón «Agregar Ítem».</span>
              <button className="catalogo-btn-primary" onClick={handleCreate} style={{ marginTop: 6 }}>
                <Icon d={ICONS.plus} color="var(--text-on-accent)" w={13} />
                Agregar Ítem
              </button>
            </div>
          )
        )}

        {!loading && !error && productos.map((p, i) => {
          const esGratis = p.tipo_licencia === 'Gratuito / OpenSource';
          return (
            <div key={p.id ?? p.sku + i} className="catalogo-productos-row">
              <span className="cat-sku" title={p.sku}>{p.sku}</span>
              <span className="cat-nombre" title={p.name}>
                {p.name}
                {p.tenant_nombre && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--bg-faint)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                  }}>
                    {p.tenant_nombre}
                  </span>
                )}
              </span>
              <div className="cat-desc-cell">
                <span className="cat-desc" title={p.desc || undefined}>
                  {p.desc || <span className="cat-desc-empty">Sin descripción</span>}
                </span>
                {renderCuratedBadges(p)}
              </div>
              {renderCategoriaBadge(p)}
              <div className="cat-price-cell">
                {esGratis ? (
                  <span className="cat-price-free">
                    <Icon d={ICONS.gift} w={10} color="currentColor" />
                    Gratis
                  </span>
                ) : (
                  <>
                    <span className="cat-price-value">{formatPrecio(p.price, p.currency)}</span>
                    {p.unit && <span className="cat-price-unit">{p.unit}</span>}
                  </>
                )}
              </div>
              <span>
                {esGratis
                  ? <span className="cat-currency-chip is-muted">—</span>
                  : <span className="cat-currency-chip">{p.currency}</span>}
              </span>

              <div className="catalogo-action-group" onClick={e => e.stopPropagation()}>
                <button
                  title="Ver workspace del producto"
                  aria-label={`Ver workspace de ${p.name}`}
                  className="catalogo-action-group-btn"
                  onClick={(e) => { e.stopPropagation(); if (p.id) navigate(`/catalogo/${p.id}`, { state: { producto: p } }); else handleView(p); }}
                >
                  <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={14} color="currentColor" />
                </button>
                <button
                  title="Editar"
                  aria-label={`Editar ${p.name}`}
                  className="catalogo-action-group-btn"
                  onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                >
                  <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={14} color="currentColor" />
                </button>
                <button
                  title="Eliminar"
                  aria-label={`Eliminar ${p.name}`}
                  className="catalogo-action-group-btn danger"
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                >
                  <Icon d={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} w={14} color="currentColor" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
          onSaved={onProductSaved}
        />
      )}
    </div>
  );
}
