import SortableHeader from '../../components/ui/SortableHeader';
import { Icon } from './ui';
import { PRODUCTO_CATEGORIAS, formatPrecio } from './helpers';

const CAT_COLORS = {
  'Bot': 'var(--cyan)',
  'Agente': 'var(--violet-bright)',
  'Script': 'var(--success-alt)',
  'Software': 'var(--primary)',
  'Auditoría': 'var(--danger)',
  'Consultoría': 'var(--warning-bright)',
};

// ─── Tab: Productos / Tarifas ────────────────────────────────────────────────
export default function ProductosTab({
  productos, loading, error, onRetry,
  productoFilters, setProductoFilters,
  ordering, onSort,
  onCreate, onView, onEdit, onDelete,
}) {
  return (
    <div className="catalogo-productos">
      <div className="catalogo-toolbar">
        <div className="catalogo-search">
          <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
          <input
            type="text"
            placeholder="Buscar por SKU o nombre…"
            value={productoFilters.search}
            onChange={e => setProductoFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <select
          className="catalogo-btn-secondary"
          value={productoFilters.categoria}
          onChange={e => setProductoFilters(prev => ({ ...prev, categoria: e.target.value }))}
          style={{ cursor: 'pointer' }}
        >
          {['Todos', ...PRODUCTO_CATEGORIAS].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="catalogo-btn-primary" onClick={onCreate}>
          <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: 'var(--text-faint)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span style={{ fontSize: 12 }}>Cargando productos…</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: 'var(--danger)' }}>
            <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={28} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar los productos</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error}</span>
            <button className="catalogo-btn-secondary" onClick={onRetry} style={{ marginTop: 4 }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && productos.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
            <Icon d={['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']} w={40} color="var(--border)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay productos en el catálogo</span>
            <span style={{ fontSize: 11 }}>Crea el primero con el botón «Agregar Ítem».</span>
          </div>
        )}

        {!loading && !error && productos.map((p, i) => (
          <div key={p.id ?? p.sku + i} className="catalogo-productos-row">
            <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", color: 'var(--primary)', fontWeight: 600 }}>{p.sku}</span>
            <span style={{ fontWeight: 600 }}>{p.name}</span>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Sin descripción</span>}</span>
              {p.datos_adicionales && Object.keys(p.datos_adicionales).length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {Object.entries(p.datos_adicionales).map(([k, v]) => {
                    if (!v) return null;
                    const keyLabel = k.replace('_', ' ');
                    return (
                      <span key={k} style={{
                        background: 'var(--bg-page)',
                        border: '1px solid var(--neutral-200)',
                        borderRadius: 3,
                        padding: '1px 5px',
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace'
                      }}>
                        <strong style={{ textTransform: 'capitalize' }}>{keyLabel}:</strong> {v}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <span style={{ color: CAT_COLORS[p.cat], fontWeight: 600, fontSize: 10 }}>{p.cat}</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {p.tipo_licencia === 'Gratuito / OpenSource' ? 'Gratis' : formatPrecio(p.price)}
              </span>
              {p.tipo_licencia !== 'Gratuito / OpenSource' && p.unit && (
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}> {p.unit}</span>
              )}
            </div>
            <span style={{ color: 'var(--text-muted)' }}>{p.tipo_licencia === 'Gratuito / OpenSource' ? '—' : p.currency}</span>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                title="Ver detalle"
                onClick={(e) => { e.stopPropagation(); onView(p); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={13} />
              </button>
              <button
                title="Editar"
                onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={13} />
              </button>
              <button
                title="Eliminar"
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Icon d={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} w={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
