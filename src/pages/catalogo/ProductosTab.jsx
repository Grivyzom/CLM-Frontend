import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SortableHeader from '../../components/ui/SortableHeader';
import { Icon } from './ui';
import { PRODUCTO_CATEGORIAS, formatPrecio, PRODUCTO_VACIO } from './helpers';
import ProductModal from './ProductModal';

function renderCuratedBadges(p) {
  const extra = p.datos_adicionales;
  if (!extra || Object.keys(extra).length === 0) return null;

  const badges = [];

  if (p.cat === 'Software') {
    // 1. Modalidad de entrega
    if (extra.modalidad_entrega) {
      const mode = extra.modalidad_entrega;
      let icon = '📦';
      if (mode.includes('SaaS') || mode.includes('Cloud')) icon = '☁️';
      else if (mode.includes('On-Premise')) icon = '🏢';
      else if (mode.includes('Híbrido')) icon = '🔄';
      else if (mode.includes('Local')) icon = '💾';
      badges.push({ label: mode, icon, type: 'delivery' });
    }
    // 2. Nivel de soporte
    if (extra.nivel_soporte) {
      const support = extra.nivel_soporte;
      let label = support.split(' (')[0]; // Simplify "Básico (Email/Tickets)" -> "Básico"
      let icon = '🕒';
      if (support.includes('Premium')) { icon = '⭐'; label = 'Premium (24/7)'; }
      else if (support.includes('Estándar')) { icon = '🕒'; label = 'Estándar'; }
      else if (support.includes('Básico')) { icon = '✉️'; label = 'Básico'; }
      else { icon = '🚫'; label = 'Sin Soporte'; }
      badges.push({ label, icon, type: 'support' });
    }
    // 3. Propiedad Intelectual
    if (extra.propiedad_intelectual) {
      const ip = extra.propiedad_intelectual;
      let label = 'Licencia';
      let icon = '📝';
      if (ip.includes('Desarrollador')) { label = 'Licencia de Uso'; icon = '📝'; }
      else if (ip.includes('Cliente')) { label = 'Propiedad Cliente'; icon = '💼'; }
      else if (ip.includes('Abierto') || ip.includes('Open Source')) { label = 'Open Source'; icon = '🔓'; }
      badges.push({ label, icon, type: 'ip' });
    }
  } else if (p.cat === 'Agente') {
    if (extra.tipo_agente) badges.push({ label: `Agente ${extra.tipo_agente}`, icon: '🤖', type: 'generic' });
    if (extra.integracion_llm) badges.push({ label: extra.integracion_llm, icon: '🧠', type: 'llm' });
  } else if (p.cat === 'Script') {
    if (extra.entorno_lenguaje) badges.push({ label: extra.entorno_lenguaje, icon: '🐍', type: 'generic' });
    if (extra.proposito) badges.push({ label: extra.proposito, icon: '⚙️', type: 'generic' });
  } else if (p.cat === 'Auditoría') {
    if (extra.enfoque) badges.push({ label: extra.enfoque, icon: '🔍', type: 'generic' });
  } else if (p.cat === 'Consultoría') {
    if (extra.modalidad) badges.push({ label: extra.modalidad, icon: '🤝', type: 'generic' });
  }

  // Fallback: if no curated badges found, show original style for whatever keys we have
  if (badges.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        {Object.entries(extra).map(([k, v]) => {
          if (!v) return null;
          return (
            <span key={k} style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 9,
              color: 'var(--text-muted)',
              fontFamily: 'monospace'
            }}>
              <strong>{k.replace('_', ' ')}:</strong> {v}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
      {badges.map((b, idx) => {
        let bg = 'var(--bg-subtle)';
        let border = 'var(--border)';
        let color = 'var(--text-secondary)';
        
        if (b.type === 'delivery') {
          bg = 'rgba(59, 130, 246, 0.06)';
          border = 'rgba(59, 130, 246, 0.18)';
          color = 'var(--primary)';
        } else if (b.type === 'support') {
          bg = 'rgba(16, 185, 129, 0.06)';
          border = 'rgba(16, 185, 129, 0.18)';
          color = 'var(--success-deep)';
        } else if (b.type === 'ip') {
          bg = 'rgba(139, 92, 246, 0.06)';
          border = 'rgba(139, 92, 246, 0.18)';
          color = 'var(--violet-bright)';
        } else if (b.type === 'llm') {
          bg = 'rgba(236, 72, 153, 0.06)';
          border = 'rgba(236, 72, 153, 0.18)';
          color = 'var(--rose)';
        }

        return (
          <span key={idx} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: '9.5px',
            fontWeight: 600,
            color: color
          }}>
            <span style={{ fontSize: 11 }}>{b.icon}</span>
            {b.label}
          </span>
        );
      })}
    </div>
  );
}

function renderCategoriaBadge(p) {
  let subcat = '';
  let iconPath = '';

  const badgeStyles = {
    'Bot': { bg: 'rgba(6, 182, 212, 0.07)', border: 'rgba(6, 182, 212, 0.18)', color: 'var(--cyan)' },
    'Agente': { bg: 'rgba(139, 92, 246, 0.07)', border: 'rgba(139, 92, 246, 0.18)', color: 'var(--violet-bright)' },
    'Script': { bg: 'rgba(16, 185, 129, 0.07)', border: 'rgba(16, 185, 129, 0.18)', color: 'var(--success-alt)' },
    'Software': { bg: 'rgba(59, 130, 246, 0.07)', border: 'rgba(59, 130, 246, 0.18)', color: 'var(--primary)' },
    'Auditoría': { bg: 'rgba(239, 68, 68, 0.07)', border: 'rgba(239, 68, 68, 0.18)', color: 'var(--danger)' },
    'Consultoría': { bg: 'rgba(245, 158, 11, 0.07)', border: 'rgba(245, 158, 11, 0.18)', color: 'var(--warning-bright)' },
  };

  const style = badgeStyles[p.cat] || { bg: 'var(--bg-subtle)', border: 'var(--border)', color: 'var(--text-muted)' };

  if (p.cat === 'Software') {
    const tipo = p.datos_adicionales?.tipo_software;
    if (tipo) {
      subcat = tipo === 'Otro' ? (p.datos_adicionales?.tipo_software_otro || 'Otro') : tipo;
    }
  }

  // Icons based on category or subcategory
  if (p.cat === 'Software') {
    const tipo = p.datos_adicionales?.tipo_software;
    if (['App Android', 'App iOS', 'App Multiplataforma'].includes(tipo)) {
      iconPath = ["M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"]; // Phone
    } else if (tipo === 'App Web') {
      iconPath = ["M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"]; // Globe
    } else if (['Software Nativo PC', 'Software Nativo Mac'].includes(tipo)) {
      iconPath = ["M2 20h20", "M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"]; // Monitor
    } else if (tipo === 'Servicio Backend') {
      iconPath = ["M2 4h20v5H2zm0 6h20v5H2zm0 6h20v5H2z", "M6 6.5h.01", "M6 12.5h.01", "M6 18.5h.01"]; // Server
    } else {
      iconPath = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";
    }
  } else if (p.cat === 'Agente' || p.cat === 'Bot') {
    iconPath = "M12 2a8 8 0 0 0-8 8v3a4 4 0 0 0 2 3.46V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3.54A4 4 0 0 0 20 13v-3a8 8 0 0 0-8-8z"; // Robot
  } else if (p.cat === 'Script') {
    iconPath = ["M16 18l6-6-6-6", "M8 6l-6 6 6 6", "M12 4l-4 16"]; // Brackets
  } else if (p.cat === 'Auditoría') {
    iconPath = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"; // Shield
  } else if (p.cat === 'Consultoría') {
    iconPath = ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]; // People
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', justifyContent: 'center' }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 16,
        padding: '3px 9px',
        fontSize: '9.5px',
        fontWeight: 700,
        color: style.color,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}>
        {iconPath && <Icon d={iconPath} w={11} color={style.color} />}
        {p.cat}
      </span>
      {subcat && (
        <span style={{
          fontSize: '9px',
          color: 'var(--text-muted)',
          marginLeft: 6,
          fontWeight: 600,
          background: 'var(--bg-page)',
          padding: '1px 6px',
          borderRadius: 4,
          border: '1px solid var(--border)',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          maxWidth: '120px'
        }} title={subcat}>
          {subcat}
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
        <button className="catalogo-btn-primary" onClick={handleCreate}>
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
              {renderCuratedBadges(p)}
            </div>
            {renderCategoriaBadge(p)}
            <div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {p.tipo_licencia === 'Gratuito / OpenSource' ? 'Gratis' : formatPrecio(p.price)}
              </span>
              {p.tipo_licencia !== 'Gratuito / OpenSource' && p.unit && (
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}> {p.unit}</span>
              )}
            </div>
            <span style={{ color: 'var(--text-muted)' }}>{p.tipo_licencia === 'Gratuito / OpenSource' ? '—' : p.currency}</span>

            <div className="catalogo-action-group" onClick={e => e.stopPropagation()}>
              <button
                title="Ver workspace del producto"
                className="catalogo-action-group-btn"
                onClick={(e) => { e.stopPropagation(); if (p.id) navigate(`/catalogo/${p.id}`, { state: { producto: p } }); else handleView(p); }}
              >
                <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={14} color="currentColor" />
              </button>
              <button
                title="Editar"
                className="catalogo-action-group-btn"
                onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
              >
                <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={14} color="currentColor" />
              </button>
              <button
                title="Eliminar"
                className="catalogo-action-group-btn danger"
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
              >
                <Icon d={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} w={14} color="currentColor" />
              </button>
            </div>
          </div>
        ))}
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
