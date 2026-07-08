import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import './Catalogo.css';
import { getPlantillas, getClausulas, getProductos, createProducto, getSoftwareList, updateProducto, deleteProducto, createPlantilla, updatePlantilla, getClientes, getSLAs, createContrato, generarDocumentoContrato, getContratos, togglePlantillaActiva } from '../api';
import EditClauseModal from './EditClauseModal';
import SortableHeader from '../components/ui/SortableHeader';

gsap.registerPlugin(useGSAP);
import TopbarActions from '../components/layout/TopbarActions';
import { useConfirm } from '../contexts/ConfirmContext';

// ── Helpers para normalizar datos de la API al formato esperado por la UI ──────

const TIPO_COLOR = {
  RECURRENTE: { color: 'var(--success-alt)', bg: 'var(--success-tint)' },
  PERPETUO:   { color: 'var(--primary)', bg: 'var(--primary-bg)' },
  PRO_BONO:   { color: 'var(--violet-bright)', bg: 'var(--violet-tint)' },
  INTERNO:    { color: 'var(--warning-bright)', bg: 'var(--warning-tint)' },
};

const TIPO_CAT = {
  RECURRENTE: 'Comercial',
  PERPETUO:   'Comercial',
  PRO_BONO:   'Legal',
  INTERNO:    'Operaciones',
};

function derivarAbbr(nombre) {
  // Toma las primeras letras de las palabras principales (excluye artículos)
  const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'e',
                        'para', 'con', 'por', 'a', 'en', 'un', 'una']);
  const words = nombre.split(/\s+/).filter(w => !stop.has(w.toLowerCase()));
  const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return initials || nombre.substring(0, 3).toUpperCase();
}

function formatearFecha(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function normalizeApiPlantilla(p) {
  const tc = TIPO_COLOR[p.tipo_contrato] || TIPO_COLOR.RECURRENTE;
  return {
    id:      p.id,
    name:    p.nombre,
    abbr:    derivarAbbr(p.nombre),
    cat:     TIPO_CAT[p.tipo_contrato] || 'General',
    version: p.version_codigo,
    vars:    null,   // el backend no expone conteo de variables por ahora
    status:  p.activa ? 'Aprobado' : 'Inactivo',
    updated: formatearFecha(p.fecha_creacion),
    uses:    p.usos || 0,
    color:   tc.color,
    bg:      tc.bg,
    tipo_contrato: p.tipo_contrato,
    software_id:   p.software_id,
    modo_origen:   p.modo_origen,
    _raw: p,
  };
}

function getTagStyles(tipo) {
  if (tipo === 'Estándar') return { tagColor: 'var(--success-deep)', tagBg: 'var(--success-bg)' };
  if (tipo === 'Alternativa') return { tagColor: 'var(--warning)', tagBg: 'var(--warning-bg)' };
  return { tagColor: 'var(--violet)', tagBg: 'var(--violet-bg)' };
}

const PRODUCTO_CATEGORIAS = ['Bot', 'Agente', 'Script', 'Software', 'Auditoría', 'Consultoría'];

function formatPrecio(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return `$${n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const RULES = [
  { id: 1, name: 'Aprobación por monto alto', status: 'Activa', priority: 1,
    conditions: [{ field: 'Valor del contrato', op: 'mayor que', value: '$50,000 USD' }],
    actions: ['Añadir cláusula de auditoría externa', 'Exigir aprobación del Director Financiero', 'Notificar al Comité Legal'],
    applies: 'Todos los contratos', uses: 23 },
  { id: 2, name: 'NDA obligatorio para nuevos clientes', status: 'Activa', priority: 2,
    conditions: [{ field: 'Estado del cliente', op: 'igual a', value: 'Nuevo' }, { field: 'Tipo de contrato', op: 'no es', value: 'NDA' }],
    actions: ['Bloquear firma hasta adjuntar NDA firmado', 'Enviar NDA estándar al cliente vía email'],
    applies: 'Contratos de servicios', uses: 41 },
];

const CATS = ['Responsabilidad', 'Confidencialidad', 'Pagos', 'Resolución de Disputas', 'Vigencia y Terminación'];

const Icon = ({ d, color = 'var(--text-muted)', w = 14, className = '' }) => (
  <svg className={`clm-svg ${className}`} width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

function StatusBadge({ status }) {
  const cfg = {
    'Aprobado': { color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    'Borrador': { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
    'En revisión': { color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-border)' },
  };
  const c = cfg[status] || cfg['Aprobado'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
      {status}
    </span>
  );
}

function RiskBadge({ risk }) {
  const cfg = { 'Alto': { color: 'var(--rose)', bg: 'var(--rose-bg)' }, 'Medio': { color: 'var(--warning)', bg: 'var(--warning-bg)' }, 'Bajo': { color: 'var(--success-deep)', bg: 'var(--success-bg)' } };
  const c = cfg[risk] || cfg['Bajo'];
  return <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: c.color, background: c.bg, borderRadius: 4, padding: '1px 6px' }}>{risk}</span>;
}

// ─── Componentes del Menú Contextual y Dropdowns ────────────────────────────

function ActionDropdown({ anchorRef, items, onClose }) {
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    const top = anchorRect.bottom + margin;
    const left = anchorRect.left;

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let adjLeft = left;
      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, anchorRect.right - rect.width);
      }
      setPos({ top, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
      <div
        ref={dropdownRef}
        role="menu"
        style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 999, padding: 4, minWidth: 220,
          animation: 'dropIn 0.15s ease-out'
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px',
              border: 'none', background: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--text-primary)', textAlign: 'left', fontFamily: 'inherit',
              borderRadius: 4, opacity: item.disabled ? 0.5 : 1, transition: 'background 0.12s'
            }}
            onMouseEnter={e => !item.disabled && (e.currentTarget.style.background = 'var(--bg-topbar)')}
            onMouseLeave={e => !item.disabled && (e.currentTarget.style.background = 'none')}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function ContextMenu({ pos, target, onClose, onPreview, onUse }) {
  const [menuPos, setMenuPos] = useState({ top: pos.y, left: pos.x });
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = rect.width || 180;
    const menuHeight = rect.height || 120;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = pos.y;
    let left = pos.x;

    if (left + menuWidth + margin > viewportWidth) left = Math.max(margin, pos.x - menuWidth - margin);
    if (top + menuHeight + margin > viewportHeight) top = Math.max(margin, pos.y - menuHeight - margin);

    setMenuPos({ top, left });
  }, [pos]);

  const itemStyle = (danger = false) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '9px 12px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 12, color: danger ? 'var(--danger)' : 'var(--text-secondary)',
    textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s'
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
      <div
        ref={menuRef}
        style={{
          position: 'fixed', top: menuPos.top, left: menuPos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 999, minWidth: 180,
          animation: 'dropIn 0.15s ease-out', overflow: 'hidden'
        }}
      >
        <button
          style={itemStyle()}
          onClick={() => { onPreview?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={14} />
          Vista previa
        </button>
        <button
          style={itemStyle()}
          onClick={() => { onUse?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d="M5 12h14M12 5l7 7-7 7" w={14} />
          Usar plantilla
        </button>
        <div style={{ height: 1, background: 'var(--neutral-200)', margin: '2px 0' }} />
        <button
          style={itemStyle()}
          onClick={() => { onEdit?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={14} />
          Editar
        </button>
        <button
          style={itemStyle()}
          onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" w={14} />
          Duplicar
        </button>
        <div style={{ height: 1, background: 'var(--neutral-200)', margin: '2px 0' }} />
        <button
          style={itemStyle(true)}
          onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-tint)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} color="var(--danger)" w={14} />
          Eliminar
        </button>
      </div>
    </>
  );
}

function FilterDropdown({ onClose, filters, updateFilter, anchorRef }) {
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    let top = anchorRect.bottom + margin;
    let left = anchorRect.left;

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjLeft = left;
      let adjTop = top;

      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, viewportWidth - rect.width - margin);
      }
      if (adjTop + rect.height + margin > viewportHeight) {
        adjTop = Math.max(margin, anchorRect.top - rect.height - margin);
      }

      setPos({ top: adjTop, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
      <div
        ref={dropdownRef}
        role="dialog"
        style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 999, padding: 16, minWidth: 260,
          animation: 'dropIn 0.15s ease-out', display: 'flex', flexDirection: 'column', gap: 16
        }}
      >
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Todos', 'Aprobado', 'Borrador', 'En revisión'].map(op => (
              <button
                key={op}
                onClick={() => updateFilter('estado', op)}
                style={{
                  padding: '4px 10px', borderRadius: 12, border: '1px solid',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  ...(filters.estado === op 
                    ? { background: 'var(--primary)', color: 'var(--text-on-accent)', borderColor: 'var(--primary)' }
                    : { background: 'var(--surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' })
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoría</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Todos', 'Legal', 'Operaciones', 'Comercial', 'Tecnología'].map(op => (
              <button
                key={op}
                onClick={() => updateFilter('categoria', op)}
                style={{
                  padding: '4px 10px', borderRadius: 12, border: '1px solid',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  ...(filters.categoria === op 
                    ? { background: 'var(--primary)', color: 'var(--text-on-accent)', borderColor: 'var(--primary)' }
                    : { background: 'var(--surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' })
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Plantilla Card ───────────────────────────────────────────────────────────
function PlantillaCard({ p, setPreviewTemplate, handleOpenContextMenu }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [p.name]);

  const offset = isOverflowing && containerRef.current && textRef.current 
    ? textRef.current.scrollWidth - containerRef.current.clientWidth
    : 0;

  return (
    <div 
      className="catalogo-card" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="catalogo-card-header">
        <div className="catalogo-card-abbr" style={{ background: p.bg }}>
          <span style={{ color: p.color }}>{p.abbr}</span>
        </div>
        <div className="catalogo-card-title" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div 
            ref={containerRef}
            style={{
              overflow: 'hidden',
              maskImage: isOverflowing && !isHovered ? 'linear-gradient(to right, black 80%, transparent 100%)' : 'none',
              WebkitMaskImage: isOverflowing && !isHovered ? 'linear-gradient(to right, black 80%, transparent 100%)' : 'none',
            }}
          >
            <p 
              ref={textRef}
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                display: 'inline-block',
                transform: isHovered && isOverflowing ? `translateX(-${offset}px)` : 'translateX(0)',
                transition: isHovered && isOverflowing ? `transform ${Math.max(1, offset * 0.02)}s linear 0.2s` : 'transform 0.3s ease-out'
              }}
            >
              {p.name}
            </p>
          </div>
          <p className="catalogo-card-meta">{p.cat} · {p.version}</p>
        </div>
      </div>

      <div className="catalogo-card-status">
        <StatusBadge status={p.status} />
        {p.vars !== null && (
          <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 2 }}>{p.vars} variables</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{p.uses} usos</span>
      </div>

      <div className="catalogo-card-footer">
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Act. {p.updated}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Eye – Preview */}
          <button
            title="Vista previa"
            className="catalogo-icon-btn"
            onClick={e => { e.stopPropagation(); setPreviewTemplate(p); }}
          >
            <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={13} color="var(--text-muted)" />
          </button>
          {/* Software tag */}
          {p._raw?.software_nombre && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: 'var(--primary-bg)', color: 'var(--primary)', fontFamily: "'JetBrains Mono',monospace",
              maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={p._raw.software_nombre}>
              {p._raw.software_nombre}
            </span>
          )}
          {/* Three dots */}
          <button
            title="Más opciones"
            className="catalogo-icon-btn"
            onClick={e => handleOpenContextMenu(e, p)}
          >
            <Icon d={['M12 5v.01','M12 12v.01','M12 19v.01','M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z']} w={14} color="var(--text-muted)" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ──────────────────────────────────────────────────────────
function PreviewModal({ plantilla, onClose, onUse }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState('');
  // Modo enfoque: el modal pasa a pantalla completa y oculta header/footer;
  // solo queda el PDF con una píldora flotante para salir.
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      // Esc sale primero del enfoque; un segundo Esc cierra el modal.
      setFocusMode(f => {
        if (f) return false;
        onClose();
        return f;
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Carga el PDF real de la plantilla (variables sin resolver). Se pide como
  // blob para poder distinguir errores (422 cláusulas, 500 conversión) del
  // contenido, cosa que un iframe directo no permite.
  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    setPdfLoading(true);
    setPdfError('');
    setPdfUrl(null);

    fetch(`/api/plantillas/plantillas/${plantilla.id}/preview-pdf/`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const err = await res.json(); msg = err.error || err.detail || msg; } catch (_) {}
          throw new Error(msg);
        }
        return res.blob();
      })
      .then(blob => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch(err => { if (!revoked) setPdfError(err.message); })
      .finally(() => { if (!revoked) setPdfLoading(false); });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [plantilla.id]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: focusMode ? 0 : 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: focusMode ? 0 : 10,
          boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: focusMode ? 'none' : 960,
          height: focusMode ? '100%' : '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        {!focusMode && (
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6, background: plantilla.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: plantilla.color, fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.abbr}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{plantilla.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.cat} · {plantilla.version}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, background: 'var(--bg-inset)', color: 'var(--text-muted)',
              borderRadius: 4, padding: '3px 8px', fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>Vista previa</span>
            <button
              onClick={() => setFocusMode(true)}
              disabled={!pdfUrl}
              style={{
                width: 28, height: 28, border: 'none', background: 'none',
                cursor: pdfUrl ? 'pointer' : 'default', opacity: pdfUrl ? 1 : 0.4,
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'background 0.15s'
              }}
              onMouseEnter={e => { if (pdfUrl) e.currentTarget.style.background = 'var(--neutral-200)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Modo enfoque (pantalla completa)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 18, transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Cerrar"
            >×</button>
          </div>
        </div>
        )}

        {/* Píldora flotante para salir del modo enfoque */}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 5,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-primary)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)', opacity: 0.92
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.92}
            title="Salir del modo enfoque (Esc)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Vista previa · Esc
          </button>
        )}

        {/* Document body — PDF real de la plantilla */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-page)' }}>
          {pdfLoading ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 12
            }}>
              Generando vista previa del documento…
            </div>
          ) : pdfError ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 10, padding: '0 40px', textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                No se pudo previsualizar la plantilla
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.6 }}>
                {pdfError}
              </p>
            </div>
          ) : (
            <iframe
              title={`Vista previa de la plantilla ${plantilla.name}`}
              src={`${pdfUrl}#view=FitH`}
              style={{ flex: 1, width: '100%', border: 'none' }}
            />
          )}
        </div>

        {/* Footer */}
        {!focusMode && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-faint)', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          >Cerrar</button>
          <button
            onClick={() => onUse?.()}
            style={{
              padding: '7px 14px', borderRadius: 5, border: 'none',
              background: 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
          >Usar esta plantilla →</button>
        </div>
        )}
      </div>
    </div>
  );
}


// ─── Insert Clause Modal ──────────────────────────────────────────────────────────
function InsertarClausulaModal({ clauseText, clauseName, clauseId, onClose }) {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    // Filtramos las plantillas por modo_origen='clausulas'
    getPlantillas({ modo_origen: 'clausulas' })
      .then(res => setPlantillas(Array.isArray(res) ? res : (res?.results || [])))
      .catch(() => setPlantillas([]))
      .finally(() => setLoading(false));
  }, []);

  const selectPlantilla = (p) => {
    setSelectedPlantilla(p);
    setPdfLoading(true);
    setPdfError('');
    setPdfUrl(null);
    fetch(`/api/plantillas/plantillas/${p.id}/preview-pdf/`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const err = await res.json(); msg = err.error || err.detail || msg; } catch (_) {}
          throw new Error(msg);
        }
        return res.blob();
      })
      .then(blob => setPdfUrl(URL.createObjectURL(blob)))
      .catch(err => {
        setPdfUrl(null);
        setPdfError(err.message || 'Error desconocido');
      })
      .finally(() => setPdfLoading(false));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 860, height: '85vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Insertar en contrato</h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
             <Icon d={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" w={16} />
          </button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', padding: 20 }}>
          {!selectedPlantilla ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Selecciona una plantilla base (tipo cláusulas) para insertar la cláusula <strong>{clauseName}</strong>.</p>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando plantillas...</div>
              ) : plantillas.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay plantillas de tipo cláusulas disponibles.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, overflowY: 'auto', padding: 2 }}>
                  {plantillas.map(p => (
                    <div 
                      key={p.id} 
                      style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'var(--surface)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                      onClick={() => selectPlantilla(p)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{p.nombre || p.name}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{p.tipo_contrato_display || p.tipo_contrato}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Previsualización de Inserción</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Documento base: {selectedPlantilla.nombre}</p>
                </div>
                <button className="catalogo-btn-secondary" onClick={() => setSelectedPlantilla(null)}>Cambiar plantilla</button>
              </div>
              
              <div style={{ flex: 1, background: 'var(--bg-panel)', padding: '24px 16px', overflowY: 'auto', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)' }}>
                {/* Visual Document Mockup */}
                <div style={{ width: '100%', maxWidth: 640, background: '#fff', minHeight: 600, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                  {pdfLoading ? (
                    <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-faint)' }}>Generando documento base...</div>
                  ) : pdfUrl ? (
                    <iframe src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} style={{ width: '100%', height: 500, border: 'none' }} title="Base PDF" />
                  ) : (
                    <div style={{ height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)', padding: 20, textAlign: 'center' }}>
                      <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" w={32} color="var(--danger)" />
                      <div style={{ marginTop: 12, fontWeight: 600 }}>Error al cargar documento base.</div>
                      <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>{pdfError}</div>
                    </div>
                  )}
                  {/* Append Clause UI */}
                  <div style={{ padding: '40px', borderTop: '2px dashed var(--primary-tint)' }}>
                     <div style={{ display: 'inline-block', background: 'var(--primary-bg)', color: 'var(--primary)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' }}>Cláusula Incrustada</div>
                     <h4 style={{ marginBottom: 12, fontSize: 16, color: '#1a1a1a' }}>{clauseName}</h4>
                     <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>{clauseText}</p>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
                <button className="catalogo-btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="catalogo-btn-primary" onClick={async () => {
                  try {
                    const currentClausulas = selectedPlantilla.clausulas_seleccionadas || [];
                    if (!currentClausulas.includes(clauseId)) {
                       const formData = new FormData();
                       formData.append('clausulas_seleccionadas', JSON.stringify([...currentClausulas, clauseId]));
                       await updatePlantilla(selectedPlantilla.id, formData);
                       alert('Cláusula incrustada con éxito.');
                    } else {
                       alert('Esta cláusula ya está incrustada en la plantilla.');
                    }
                  } catch(e) {
                     alert('Error: ' + e);
                  }
                  onClose();
                }}>Confirmar Incrustación</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Use Template Modal (wizard: cliente → configuración → creado) ──────────
function UseTemplateModal({ plantilla, onClose }) {
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [contractName, setContractName] = useState(plantilla.name || '');
  const [isCreating, setIsCreating] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [slas, setSlas] = useState([]);

  useEffect(() => {
    getClientes({ page_size: 200 })
      .then((data) => setClientes(Array.isArray(data) ? data : data.results || []))
      .catch(() => setClientes([]));
    getSLAs()
      .then((data) => setSlas(Array.isArray(data) ? data : []))
      .catch(() => setSlas([]));
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filteredClients = clientes.filter(c => {
    const name = c.razon_social || c.nombre_comercial || '';
    const rut = c.id_fiscal || '';
    return name.toLowerCase().includes(clientSearch.toLowerCase()) || rut.includes(clientSearch);
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const validTipos = ['RECURRENTE', 'PERPETUO', 'PRO_BONO', 'INTERNO'];
      let finalTipoContrato = plantilla.tipo_contrato;
      if (!validTipos.includes(finalTipoContrato)) {
        finalTipoContrato = 'RECURRENTE';
      }

      const nuevoContrato = await createContrato({
        cliente_id: selectedClient.id,
        software_id: plantilla.software_id || 1, // Fallback si la plantilla no tiene software asociado
        sla_id: slas.length > 0 ? slas[0].id : 1, // Fallback si no hay SLAs cargados
        tipo_contrato: finalTipoContrato,
        monto: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
        frecuencia_facturacion: finalTipoContrato === 'RECURRENTE' ? 'MENSUAL' : undefined,
      });
      // Setear la plantilla como activa globalmente para este tipo de contrato y producto
      await togglePlantillaActiva(plantilla.id, true);

      // Generar el documento para el contrato recién creado a partir de esta plantilla
      await generarDocumentoContrato({
        contrato_id: nuevoContrato.id,
        plantilla_id: plantilla.id,
      });

      setStep(3);
    } catch (e) {
      alert('Error creando contrato: ' + (e.message || e));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: plantilla.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: plantilla.color, fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.abbr}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {step === 3 ? 'Contrato creado' : 'Crear contrato desde plantilla'}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)' }}>{plantilla.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18, transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >×</button>
        </div>

        {/* Steps indicator */}
        {step < 3 && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bg-topbar)', display: 'flex', gap: 0 }}>
            {[{n:1,label:'Cliente'},{n:2,label:'Configuración del contrato'}].map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: step >= s.n ? 'var(--primary)' : 'var(--neutral-200)',
                    color: step >= s.n ? 'var(--text-on-accent)' : 'var(--text-faint)'
                  }}>{s.n}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: step >= s.n ? 'var(--primary)' : 'var(--text-faint)' }}>{s.label}</span>
                </div>
                {i < 1 && <div style={{ flex: 1, height: 1, background: 'var(--neutral-200)', margin: '0 10px', alignSelf: 'center' }} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '16px 20px', minHeight: 220 }}>
          {step === 1 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Selecciona el cliente para el nuevo contrato</p>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '7px 10px 7px 30px', border: '1px solid var(--border)',
                    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
                    outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {filteredClients.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No se encontraron clientes.</p>}
                {filteredClients.map(c => {
                  const cName = c.razon_social || c.nombre_comercial || 'Sin nombre';
                  const cRut = c.id_fiscal || 'Sin RUT';
                  const cType = c.tipo === 'juridica' ? 'Empresa' : 'Persona Natural';
                  
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', border: '1px solid',
                        borderColor: selectedClient?.id === c.id ? 'var(--primary)' : 'var(--neutral-200)',
                        background: selectedClient?.id === c.id ? 'rgba(37,99,235,0.05)' : 'var(--bg-faint)',
                        borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{cName}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono',monospace" }}>{cRut}</p>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                        background: cType === 'Empresa' ? 'rgba(37,99,235,0.08)' : 'var(--success-bg)',
                        color: cType === 'Empresa' ? 'var(--primary)' : 'var(--success-deep)'
                      }}>{cType}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Nombre del contrato</p>
              <input
                type="text"
                value={contractName}
                onChange={e => setContractName(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', border: '1px solid var(--border)',
                  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', color: 'var(--text-primary)', marginBottom: 14
                }}
                autoFocus
              />
              <div style={{ background: 'var(--bg-page)', borderRadius: 6, padding: '10px 14px', border: '1px solid var(--neutral-200)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumen</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Plantilla:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{plantilla.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cliente:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedClient?.razon_social || selectedClient?.nombre_comercial}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Variables:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>{plantilla.vars || 0} a completar</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'previewIn 0.3s ease-out' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--success-tint)', color: 'var(--success-alt)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 28, boxShadow: '0 4px 12px rgba(5,150,105,0.15)'
              }}>✓</div>
              <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Contrato y documento creados con éxito</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Se ha creado un nuevo contrato basado en la plantilla <strong>{plantilla.abbr}</strong> para el cliente <strong>{selectedClient?.razon_social || selectedClient?.nombre_comercial}</strong> y se ha generado su documento correspondiente.<br/><br/>
                Puedes revisarlo y editarlo en la sección de Contratos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: step === 3 ? 'center' : 'space-between', gap: 8,
          background: 'var(--bg-faint)'
        }}>
          {step < 3 ? (
            <>
              <button
                onClick={() => step === 1 ? onClose() : setStep(1)}
                style={{
                  padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)',
                  background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >{step === 1 ? 'Cancelar' : '← Atrás'}</button>
              <button
                disabled={isCreating || (step === 1 ? !selectedClient : !contractName.trim())}
                onClick={() => step === 1 ? setStep(2) : handleCreate()}
                style={{
                  padding: '7px 16px', borderRadius: 5, border: 'none',
                  background: isCreating || (step === 1 ? !selectedClient : !contractName.trim()) ? 'var(--primary-soft)' : 'var(--primary)',
                  color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
                  cursor: isCreating || (step === 1 ? !selectedClient : !contractName.trim()) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s'
                }}
              >{step === 1 ? 'Siguiente →' : (isCreating ? 'Creando...' : 'Crear contrato ✓')}</button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '9px 16px', borderRadius: 5, border: 'none',
                background: 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
            >Terminar y Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Product Modal ───────────────────────────────────────────────────────
const PRODUCTO_VACIO = { name: '', desc: '', cat: 'Software', tipo_licencia: 'Comercial', price: '', currency: 'USD', unit: '', status: 'Activo', datos_adicionales: {} };

function ProductModal({ onClose, onSaved, mode = 'create', product, createForm, setCreateForm }) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [localForm, setLocalForm] = useState(() => {
    if (product) {
      return {
        ...PRODUCTO_VACIO,
        ...product,
        tipo_licencia: product.tipo_licencia || 'Comercial',
        datos_adicionales: product.datos_adicionales || {}
      };
    }
    return PRODUCTO_VACIO;
  });

  const form = isCreate ? createForm : localForm;
  const setForm = isCreate ? setCreateForm : setLocalForm;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const setExtraField = (key, val) => {
    setForm(prev => ({
      ...prev,
      datos_adicionales: {
        ...(prev.datos_adicionales || {}),
        [key]: val
      }
    }));
  };

  const validateDynamicFields = (cat, extra) => {
    if (cat === 'Software') {
      return !!extra.tipo_software;
    }
    if (cat === 'Agente') {
      return !!extra.tipo_agente && !!extra.integracion_llm?.trim();
    }
    if (cat === 'Script') {
      return !!extra.entorno_lenguaje && !!extra.proposito;
    }
    if (cat === 'Auditoría') {
      return !!extra.enfoque;
    }
    if (cat === 'Consultoría') {
      return !!extra.modalidad;
    }
    return true;
  };

  const isFreeLicense = form.tipo_licencia === 'Gratuito / OpenSource';

  const isPriceValid = isFreeLicense || (
    form.price !== '' && Number(form.price) >= 0 && form.currency.trim() && form.unit.trim()
  );

  const isDynamicValid = validateDynamicFields(form.cat, form.datos_adicionales || {});

  const isValid = form.name.trim() && isPriceValid && isDynamicValid;

  const handleSubmit = async () => {
    if (isView) return;
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        price: isFreeLicense ? '0' : form.price,
        currency: isFreeLicense ? 'N/A' : form.currency,
        unit: isFreeLicense ? 'No aplica' : form.unit,
      };

      if (isCreate) {
        const nuevo = await createProducto(payload);
        onSaved(nuevo, 'create');
        if (setCreateForm) setCreateForm(PRODUCTO_VACIO);
      } else {
        const editado = await updateProducto(product.id, payload);
        onSaved(editado, 'edit');
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: 'var(--text-primary)',
    backgroundColor: isView ? 'var(--bg-page)' : 'var(--surface)',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };

  let modalTitle = 'Nuevo Ítem — Producto / Tarifa';
  if (isEdit) modalTitle = 'Editar Ítem — Producto / Tarifa';
  if (isView) modalTitle = 'Detalle de Producto / Tarifa';

  const hasDynamicPanel = ['Software', 'Agente', 'Script', 'Auditoría', 'Consultoría'].includes(form.cat);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: hasDynamicPanel ? 860 : 520, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', transition: 'max-width 0.25s ease-in-out', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{modalTitle}</p>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', minHeight: 380, maxHeight: '70vh', overflow: 'hidden' }}>
          {/* Left Column: General Data */}
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>SKU</label>
                <input
                  style={{ ...inputStyle, backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)' }}
                  value={isCreate ? 'Auto-generado' : form.sku}
                  disabled={true}
                  placeholder="Auto-generado"
                />
              </div>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input style={inputStyle} value={form.name} onChange={e => setField('name', e.target.value)} disabled={isView} placeholder="SoftTrack Pro v3 – Anual" autoFocus={isCreate} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 56, fontFamily: 'inherit' }}
                value={form.desc}
                onChange={e => setField('desc', e.target.value)}
                disabled={isView}
                placeholder="Licencia anual por usuario, incluye soporte 8×5"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select style={inputStyle} value={form.cat} onChange={e => setField('cat', e.target.value)} disabled={isView}>
                  {PRODUCTO_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Licencia</label>
                <select
                  style={inputStyle}
                  value={form.tipo_licencia || 'Comercial'}
                  onChange={e => {
                    const type = e.target.value;
                    const isFree = type === 'Gratuito / OpenSource';
                    setForm(prev => ({
                      ...prev,
                      tipo_licencia: type,
                      price: isFree ? '0' : prev.price === '0' ? '' : prev.price,
                      currency: isFree ? 'N/A' : prev.currency === 'N/A' ? 'USD' : prev.currency,
                      unit: isFree ? 'No aplica' : prev.unit === 'No aplica' ? '' : prev.unit
                    }));
                  }}
                  disabled={isView}
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Gratuito / OpenSource">Gratuito / OpenSource</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Precio</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? '0' : '1200'}
                />
              </div>
              <div>
                <label style={labelStyle}>Moneda</label>
                <input
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.currency}
                  onChange={e => setField('currency', e.target.value.toUpperCase())}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'N/A' : 'USD'}
                  maxLength={8}
                />
              </div>
              <div>
                <label style={labelStyle}>Unidad</label>
                <input
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? 'var(--bg-page)' : 'var(--surface)' }}
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'No aplica' : '/usuario/año'}
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12 }}>
                <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={14} />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Side Panel "Más Información" */}
          {hasDynamicPanel && (
            <div style={{
              width: 320, borderLeft: '1px solid var(--neutral-200)', background: 'var(--bg-faint)',
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Más Información</h4>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Campos requeridos para la categoría <strong>{form.cat}</strong>.</p>
              </div>

              <div style={{ width: '100%', height: '1px', background: 'var(--neutral-200)', margin: '4px 0' }} />

              {form.cat === 'Software' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tipo de Software *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.tipo_software || ''}
                      onChange={e => setExtraField('tipo_software', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="App Android">App Android</option>
                      <option value="App Multiplataforma">App Multiplataforma</option>
                      <option value="App Web">App Web</option>
                      <option value="Software Nativo PC">Software Nativo PC</option>
                    </select>
                  </div>
                </div>
              )}

              {form.cat === 'Agente' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tipo de Agente *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.tipo_agente || ''}
                      onChange={e => setExtraField('tipo_agente', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Autónomo">Autónomo</option>
                      <option value="Semiautónomo">Semiautónomo</option>
                      <option value="Reactivo / Reglas">Reactivo / Reglas</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Integración / LLM *</label>
                    <input
                      style={inputStyle}
                      value={form.datos_adicionales?.integracion_llm || ''}
                      onChange={e => setExtraField('integracion_llm', e.target.value)}
                      disabled={isView}
                      placeholder="e.g. OpenAI GPT-4, Claude 3.5"
                    />
                  </div>
                </div>
              )}

              {form.cat === 'Script' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Entorno / Lenguaje *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.entorno_lenguaje || ''}
                      onChange={e => setExtraField('entorno_lenguaje', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Bash/Shell">Bash/Shell</option>
                      <option value="Python">Python</option>
                      <option value="Node.js">Node.js</option>
                      <option value="PowerShell">PowerShell</option>
                      <option value="Go/CLI">Go/CLI</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Propósito *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.proposito || ''}
                      onChange={e => setExtraField('proposito', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Automatización">Automatización</option>
                      <option value="Datos/ETL">Datos/ETL</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Scraping">Scraping</option>
                    </select>
                  </div>
                </div>
              )}

              {form.cat === 'Auditoría' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Enfoque *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.enfoque || ''}
                      onChange={e => setExtraField('enfoque', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Seguridad/Pentesting">Seguridad/Pentesting</option>
                      <option value="Calidad de Código/QA">Calidad de Código/QA</option>
                      <option value="Rendimiento">Rendimiento</option>
                      <option value="Cumplimiento Normativo">Cumplimiento Normativo</option>
                    </select>
                  </div>
                </div>
              )}

              {form.cat === 'Consultoría' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Modalidad *</label>
                    <select
                      style={inputStyle}
                      value={form.datos_adicionales?.modalidad || ''}
                      onChange={e => setExtraField('modalidad', e.target.value)}
                      disabled={isView}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Por Hora">Por Hora</option>
                      <option value="Por Proyecto">Por Proyecto</option>
                      <option value="Asesoría Continua">Asesoría Continua</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-faint)', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >{isView ? 'Cerrar' : 'Cancelar'}</button>
          {!isView && (
            <button
              disabled={!isValid || saving}
              onClick={handleSubmit}
              style={{
                padding: '7px 16px', borderRadius: 5, border: 'none',
                background: (!isValid || saving) ? 'var(--primary-soft)' : 'var(--primary)',
                color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
                cursor: (!isValid || saving) ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}
            >{saving ? 'Guardando…' : isCreate ? 'Crear producto ✓' : 'Guardar cambios ✓'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Template Modal ─────────────────────────────────────────────────────
const TEMPLATE_VACIO = { nombre: '', tipo_contrato: 'PLAZO_FIJO', version_codigo: '', software_id: '', modo_origen: 'archivo', archivo_docx: null, clausulas_seleccionadas: [] };

function NewTemplateModal({ onClose, onSuccess, createForm, setCreateForm, softwareList, editingTemplate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!editingTemplate;

  const [searchSoft, setSearchSoft] = useState('');
  const [showSoft, setShowSoft] = useState(false);
  const filteredSoft = (softwareList || []).filter(s => (s.name || s.nombre || '').toLowerCase().includes(searchSoft.toLowerCase()));

  const [clausulasOpciones, setClausulasOpciones] = useState([]);
  useEffect(() => {
    getClausulas().then(setClausulasOpciones).catch(() => {});
  }, []);

  const setField = (field, value) => setCreateForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.nombre || !createForm.tipo_contrato || !createForm.version_codigo || !createForm.software_id) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (!isEdit && createForm.modo_origen === 'archivo' && !createForm.archivo_docx) {
      setError('Debes subir un archivo .docx para el modo "Documento propio".');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('nombre', createForm.nombre);
      fd.append('tipo_contrato', createForm.tipo_contrato);
      fd.append('version_codigo', createForm.version_codigo);
      fd.append('software', createForm.software_id);
      fd.append('modo_origen', createForm.modo_origen);
      if (createForm.archivo_docx) fd.append('archivo_docx', createForm.archivo_docx);
      if (createForm.modo_origen === 'clausulas') {
        fd.append('clausulas_seleccionadas', JSON.stringify(createForm.clausulas_seleccionadas || []));
      }

      if (isEdit) {
        await updatePlantilla(editingTemplate.id, fd);
      } else {
        await createPlantilla(fd);
      }
      setCreateForm(TEMPLATE_VACIO);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--surface)',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };
  const modeBtn = (active) => ({
    flex: 1, padding: '8px 12px', borderRadius: 5,
    border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
    background: active ? 'var(--primary-bg)' : 'var(--bg-faint)',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s',
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{isEdit ? 'Editar Plantilla de Contrato' : 'Nueva Plantilla de Contrato'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>El software seleccionado determina qué plantilla se usa al crear contratos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre de Plantilla *</label>
            <input
              style={inputStyle}
              value={createForm.nombre}
              onChange={e => setField('nombre', e.target.value)}
              placeholder="Ej: Contrato de Prestación de Servicios CPS"
              required
            />
          </div>

          {/* Software + Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Software / Producto *</label>
              <div 
                onClick={() => setShowSoft(!showSoft)}
                style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {createForm.software_id ? ((softwareList || []).find(s => s.id == createForm.software_id)?.name || (softwareList || []).find(s => s.id == createForm.software_id)?.nombre) : 'Buscar producto...'}
                </span>
                <Icon d="M6 9l6 6 6-6" w={12} color="var(--text-muted)"/>
              </div>
              {showSoft && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <input 
                    autoFocus
                    placeholder="Buscar..."
                    value={searchSoft}
                    onChange={e => setSearchSoft(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--neutral-200)', boxSizing: 'border-box', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: 'var(--text-primary)' }}
                  />
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {filteredSoft.length > 0 ? filteredSoft.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => { setField('software_id', s.id); setShowSoft(false); setSearchSoft(''); }}
                        style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {s.name || s.nombre}
                      </div>
                    )) : <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>No hay resultados</div>}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Tipo de Contrato *</label>
              <select
                style={inputStyle}
                value={createForm.tipo_contrato}
                onChange={e => setField('tipo_contrato', e.target.value)}
                required
              >
                <option value="PLAZO_FIJO">Plazo Fijo</option>
                <option value="INDEFINIDO">Indefinido</option>
                <option value="OBRA_FAENA">Por Obra o Faena</option>
                <option value="HONORARIOS">Honorarios / Prestación de Servicios</option>
                <option value="PART_TIME">Part-Time</option>
              </select>
            </div>
          </div>

          {/* Version */}
          <div>
            <label style={labelStyle}>Versión / Código *</label>
            <input
              style={inputStyle}
              value={createForm.version_codigo}
              onChange={e => setField('version_codigo', e.target.value)}
              placeholder="Ej: v1.0"
              required
            />
          </div>

          {/* Modo origen */}
          <div>
            <label style={labelStyle}>Modo de generación del documento *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={modeBtn(createForm.modo_origen === 'archivo')}
                onClick={() => setField('modo_origen', 'archivo')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" w={14} color={createForm.modo_origen === 'archivo' ? 'var(--primary)' : 'var(--text-muted)'} />
                  Subir documento (.docx)
                </span>
              </button>
              <button
                type="button"
                style={modeBtn(createForm.modo_origen === 'clausulas')}
                onClick={() => setField('modo_origen', 'clausulas')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" w={14} color={createForm.modo_origen === 'clausulas' ? 'var(--primary)' : 'var(--text-muted)'} />
                  Generar con cláusulas
                </span>
              </button>
            </div>
          </div>

          {/* Archivo — solo si modo = archivo */}
          {createForm.modo_origen === 'archivo' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--bg-faint)'
            }}>
              <label style={{ ...labelStyle, textAlign: 'center', marginBottom: 12 }}>Archivo Word (.docx) *</label>
              <label style={{
                cursor: 'pointer', padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit',
                transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" w={14} color="var(--text-muted)" />
                Seleccionar archivo
                <input
                  type="file"
                  accept=".docx"
                  onChange={e => setField('archivo_docx', e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
              {createForm.archivo_docx && (
                <p style={{ margin: '12px 0 0 0', fontSize: 11, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon d="M20 6L9 17l-5-5" w={12} color="var(--success)" /> {createForm.archivo_docx.name} ({Math.round(createForm.archivo_docx.size / 1024)} KB)
                </p>
              )}
            </div>
          )}

          {createForm.modo_origen === 'clausulas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '10px 12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01" w={14} color="var(--success-deep)" />
                <p style={{ margin: 0, fontSize: 11, color: 'var(--success-deep)', fontWeight: 600 }}>
                  El documento se generará automáticamente con las cláusulas seleccionadas.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Seleccionar Cláusulas</label>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 5, padding: 8, background: 'var(--surface)' }}>
                  {clausulasOpciones.map(c => {
                    const isSelected = (createForm.clausulas_seleccionadas || []).includes(c.id);
                    return (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelection = e.target.checked
                              ? [...(createForm.clausulas_seleccionadas || []), c.id]
                              : (createForm.clausulas_seleccionadas || []).filter(id => id !== c.id);
                            setField('clausulas_seleccionadas', newSelection);
                          }}
                        />
                        {c.name} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({c.cat})</span>
                      </label>
                    );
                  })}
                  {clausulasOpciones.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cargando cláusulas...</div>}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12 }}>
              <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-faint)', flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancelar</button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '7px 16px', borderRadius: 5, border: 'none',
              background: saving ? 'var(--primary-soft)' : 'var(--primary)',
              color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}
          >{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios ✓' : 'Crear plantilla ✓')}</button>
        </div>
      </form>
    </div>
  );
}


export default function Catalogo() {
  const { confirm, alert: alertModal } = useConfirm();
  const [tab, setTab] = useState('plantillas');
  const [selectedClause, setSelectedClause] = useState(0);
  const [clauseAlt, setClauseAlt] = useState(0);
  const [clausePage, setClausePage] = useState(1);

  const [isClauseModalOpen, setIsClauseModalOpen] = useState(false);
  const [clauseToEdit, setClauseToEdit] = useState(null);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);

  useEffect(() => {
    setIsInsertModalOpen(false);
    setIsClauseModalOpen(false);
    setImportOpen(false);
    setNewTemplateOpen(false);
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
  const [filterOpen, setFilterOpen] = useState(false);
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

  useGSAP(() => {
    if (tab === 'plantillas' && !loadingPlantillas && apiPlantillas.length > 0) {
      const cards = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card');
      if (cards && cards.length > 0) {
        gsap.killTweensOf(cards);
        
        // Select internal text and badge elements
        const titles = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-title div p');
        const metas = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-meta');
        const statuses = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-status > *');
        const footers = catalogoContainerRef.current?.querySelectorAll('.catalogo-grid .catalogo-card-footer > *');

        if (titles) gsap.killTweensOf(titles);
        if (metas) gsap.killTweensOf(metas);
        if (statuses) gsap.killTweensOf(statuses);
        if (footers) gsap.killTweensOf(footers);

        // Pre-set starting position for a clean entrance (Eliminates FOUC)
        gsap.set(cards, { y: 24, opacity: 0, scale: 0.96 });
        gsap.set(titles, { y: 15, opacity: 0 });
        gsap.set(metas, { y: 10, opacity: 0 });
        gsap.set(statuses, { y: 8, opacity: 0 });
        gsap.set(footers, { y: 8, opacity: 0 });

        const tl = gsap.timeline();

        // 1. Animate card outlines/backgrounds
        tl.to(cards,
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            clearProps: 'transform,opacity,scale'
          }
        );

        // 2. Slide up titles and category metadata in stagger
        tl.to(titles,
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.04,
            ease: 'power3.out',
            clearProps: 'transform,opacity'
          },
          '-=0.35'
        );

        tl.to(metas,
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.04,
            ease: 'power3.out',
            clearProps: 'transform,opacity'
          },
          '-=0.3'
        );

        // 3. Stagger reveal status badges & variable counts
        tl.to(statuses,
          {
            y: 0,
            opacity: 1,
            duration: 0.35,
            stagger: 0.03,
            ease: 'power2.out',
            clearProps: 'transform,opacity'
          },
          '-=0.25'
        );

        // 4. Reveal footer actions and dates
        tl.to(footers,
          {
            y: 0,
            opacity: 1,
            duration: 0.35,
            stagger: 0.03,
            ease: 'power2.out',
            clearProps: 'transform,opacity'
          },
          '-=0.2'
        );
      }
    }
  }, { dependencies: [apiPlantillas, filters, loadingPlantillas, tab], scope: catalogoContainerRef });

  // ── Software list (para el modal de nueva plantilla) ────────────────────────────────
  const [softwareListCatalogo, setSoftwareListCatalogo] = useState([]);
  useEffect(() => {
    getSoftwareList().then(setSoftwareListCatalogo).catch(() => setSoftwareListCatalogo([]));
  }, []);

  // ── Contratos (Mock M2M Clause relation) ────────────────────────────────────
  const [apiContratos, setApiContratos] = useState([]);
  useEffect(() => {
    getContratos().then(data => setApiContratos(Array.isArray(data) ? data : (data?.results || []))).catch(() => setApiContratos([]));
  }, []);

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

  // Auto-draw SVG icons on page load or tab/state changes
  useGSAP(() => {
    const paths = catalogoContainerRef.current?.querySelectorAll(
      'svg.clm-svg path, svg.clm-svg line, svg.clm-svg polyline, svg.clm-svg circle, svg.clm-svg rect'
    );
    if (!paths || paths.length === 0) return;

    paths.forEach(path => {
      try {
        const length = path.getTotalLength();
        if (length > 0) {
          gsap.fromTo(path,
            { strokeDasharray: length, strokeDashoffset: length },
            {
              strokeDashoffset: 0,
              duration: 0.8,
              ease: 'power2.inOut',
              clearProps: 'strokeDasharray,strokeDashoffset'
            }
          );
        }
      } catch (e) {}
    });
  }, { dependencies: [tab, loadingPlantillas, loadingClausulas, loadingProductos, filters, productoFilters], scope: catalogoContainerRef });

  // Draw SVG icons on hover of interactive elements in the Catalogo
  useGSAP(() => {
    const handleMouseEnter = (e) => {
      const paths = e.currentTarget.querySelectorAll(
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

    // Target elements: tabs, main cards, general action buttons, list items, search wrap
    const interactiveElements = catalogoContainerRef.current?.querySelectorAll(
      '.catalogo-tab, .catalogo-card, .catalogo-btn-secondary, .catalogo-btn-primary, .catalogo-action-btn, button'
    );

    if (interactiveElements) {
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter);
      });
    }

    return () => {
      if (interactiveElements) {
        interactiveElements.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter);
        });
      }
    };
  }, { dependencies: [tab, loadingPlantillas, loadingClausulas, loadingProductos, filters, productoFilters], scope: catalogoContainerRef });

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

  const getOrderingValue = () => {
    if (!productoSort.key) return '';
    return productoSort.direction === 'desc' ? `-${productoSort.key}` : productoSort.key;
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const activeFilterCount = [
    filters.estado !== 'Todos',
    filters.categoria !== 'Todos'
  ].filter(Boolean).length;

  const importBtnRef = useRef(null);
  const newTemplateBtnRef = useRef(null);
  const filterBtnRef = useRef(null);

  const handleOpenContextMenu = (e, item) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenuTarget(item);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const selectedClauseData = apiClausulas.find(c => c.id === selectedClause) || apiClausulas[0];
  const selectedAlt = selectedClauseData ? (selectedClauseData.versions[clauseAlt] || selectedClauseData.versions[0]) : null;
  
  const CLAUSES_PER_PAGE = 10;
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
                          setTemplateFormCache(TEMPLATE_VACIO);
                          setEditingTemplate(null);
                          setNewTemplateOpen(false);
                          setIsNewTemplateModalOpen(true);
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
              {loadingPlantillas && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: 'var(--text-faint)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ fontSize: 12 }}>Cargando plantillas…</span>
                </div>
              )}

              {/* Estado de error */}
              {!loadingPlantillas && errorPlantillas && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: 'var(--danger)' }}>
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={28} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar las plantillas</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{errorPlantillas}</span>
                  <button
                    className="catalogo-btn-secondary"
                    onClick={() => { setErrorPlantillas(null); setLoadingPlantillas(true); getPlantillas().then(d => { setApiPlantillas((d||[]).map(normalizeApiPlantilla)); setLoadingPlantillas(false); }).catch(e => { setErrorPlantillas(e.message); setLoadingPlantillas(false); }); }}
                    style={{ marginTop: 4 }}
                  >Reintentar</button>
                </div>
              )}

              {/* Estado vacío */}
              {!loadingPlantillas && !errorPlantillas && apiPlantillas.length === 0 && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} w={40} color="var(--border)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay plantillas en el catálogo</span>
                  <span style={{ fontSize: 11 }}>Crea tu primera plantilla con el botón «Nueva Plantilla».</span>
                </div>
              )}

              {/* Grid de cards */}
              {!loadingPlantillas && !errorPlantillas && apiPlantillas.filter(p => {
                if (filters.estado !== 'Todos' && p.status !== filters.estado) return false;
                if (filters.categoria !== 'Todos' && p.cat !== filters.categoria) return false;
                if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && !p.abbr.toLowerCase().includes(filters.search.toLowerCase())) return false;
                return true;
              }).map(p => (
                <PlantillaCard 
                  key={p.id} 
                  p={p} 
                  setPreviewTemplate={setPreviewTemplate} 
                  handleOpenContextMenu={handleOpenContextMenu} 
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'clausulas' && (
          <div className="catalogo-clausulas">
            <div className="catalogo-clausulas-sidebar">
              <div className="catalogo-clausulas-sidebar-header">
                <div className="catalogo-search">
                  <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
                  <input type="text" placeholder="Buscar cláusula…" />
                </div>
              </div>
              
              {loadingClausulas && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <br />Cargando cláusulas...
                </div>
              )}
              {errorClausulas && <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)', fontSize: 12 }}>{errorClausulas}</div>}

              {!loadingClausulas && !errorClausulas && clauseCategories.map(cat => (
                <div key={cat}>
                  <div className="catalogo-clausulas-cat">{cat}</div>
                  {paginatedClausulas.filter(c => c.cat === cat).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClause(c.id); setClauseAlt(0); }}
                      className={`catalogo-clausulas-item ${selectedClause === c.id ? 'active' : ''}`}
                    >
                      <span>{c.name}</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <RiskBadge risk={c.risk} />
                        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{c.versions.length} versiones</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              <div className="catalogo-clausulas-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {totalClausePages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setClausePage(p => Math.max(1, p - 1))}
                      disabled={clausePage === 1}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: clausePage === 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: clausePage === 1 ? 'var(--border)' : 'var(--text-primary)' }}
                    >Anterior</button>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Pág {clausePage} de {totalClausePages}</span>
                    <button
                      onClick={() => setClausePage(p => Math.min(totalClausePages, p + 1))}
                      disabled={clausePage === totalClausePages}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: clausePage === totalClausePages ? 'not-allowed' : 'pointer', fontSize: 12, color: clausePage === totalClausePages ? 'var(--border)' : 'var(--text-primary)' }}
                    >Siguiente</button>
                  </div>
                )}
                <button 
                  className="catalogo-btn-primary"
                  onClick={() => { setClauseToEdit(null); setIsClauseModalOpen(true); }}
                >
                  + Nueva Cláusula
                </button>
              </div>
            </div>

            <div className="catalogo-clausulas-detail">
              {selectedClauseData ? (
                <>
                  <div className="catalogo-clausulas-header">
                    <div>
                      <p className="catalogo-clausulas-cat">{selectedClauseData.cat}</p>
                      <h3>{selectedClauseData.name}</h3>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <RiskBadge risk={selectedClauseData.risk} />
                        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{selectedClauseData.versions.length} versiones disponibles</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button 
                        className="catalogo-btn-secondary"
                        onClick={() => { setClauseToEdit(activeClause); setIsClauseModalOpen(true); }}
                      >
                        Editar
                      </button>
                      <button 
                        className="catalogo-btn-primary"
                        onClick={() => setIsInsertModalOpen(true)}
                      >
                        Insertar en contrato
                      </button>
                    </div>
                  </div>

                  <div className="catalogo-clausulas-tabs">
                    {selectedClauseData.versions.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setClauseAlt(i)}
                        className={`catalogo-clausulas-tab ${clauseAlt === i ? 'active' : ''}`}
                      >
                        <span style={{ background: v.tagBg, color: v.tagColor, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>{v.tag}</span>
                        <span>{v.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="catalogo-clausulas-content">
                    <div className="catalogo-clausulas-text">
                      "{selectedAlt?.text}"
                    </div>
                    <div className={`catalogo-clausulas-note ${clauseAlt === 0 ? 'approved' : 'alternative'}`}>
                      <Icon d={clauseAlt === 0 ? 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'} color={clauseAlt === 0 ? 'var(--success-deep)' : 'var(--warning)'} w={15} />
                      <p>
                        {clauseAlt === 0
                          ? 'Cláusula estándar aprobada por el equipo legal. Uso recomendado en contratos de bajo y mediano riesgo.'
                          : 'Versión alternativa para negociaciones. Requiere aprobación del Gerente Legal antes de su uso.'}
                      </p>
                    </div>
                  </div>

                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)' }}>
                  <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} w={40} color="var(--border)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12 }}>Selecciona una cláusula</span>
                  <span style={{ fontSize: 11 }}>Explora y gestiona las cláusulas desde el panel lateral.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'productos' && (
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
              <button className="catalogo-btn-primary" onClick={() => { setSelectedProduct(null); setProductModalMode('create'); setProductModalOpen(true); }}>
                <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                Agregar Ítem
              </button>
            </div>

            <div className="catalogo-productos-table">
              <div className="catalogo-productos-header">
                <SortableHeader
                  className="sortable"
                  label="SKU"
                  field="sku"
                  ordering={getOrderingValue()}
                  onSort={handleProductoSort}
                />
                <SortableHeader
                  className="sortable"
                  label="Nombre"
                  field="name"
                  ordering={getOrderingValue()}
                  onSort={handleProductoSort}
                />
                <SortableHeader
                  className="sortable"
                  label="Descripción"
                  field="desc"
                  ordering={getOrderingValue()}
                  onSort={handleProductoSort}
                />
                <SortableHeader
                  className="sortable"
                  label="Categoría"
                  field="cat"
                  ordering={getOrderingValue()}
                  onSort={handleProductoSort}
                />
                <SortableHeader
                  className="sortable"
                  label="Precio"
                  field="price"
                  ordering={getOrderingValue()}
                  onSort={handleProductoSort}
                />
                <SortableHeader
                  className="sortable"
                  label="Moneda"
                  field="currency"
                  ordering={getOrderingValue()}
                  onSort={handleProductoSort}
                />
                <span>Acciones</span>
              </div>

              {loadingProductos && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: 'var(--text-faint)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ fontSize: 12 }}>Cargando productos…</span>
                </div>
              )}

              {!loadingProductos && errorProductos && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: 'var(--danger)' }}>
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={28} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar los productos</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{errorProductos}</span>
                  <button className="catalogo-btn-secondary" onClick={fetchProductosData} style={{ marginTop: 4 }}>Reintentar</button>
                </div>
              )}

              {!loadingProductos && !errorProductos && filteredAndSortedProductos.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'var(--text-faint)' }}>
                  <Icon d={['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']} w={40} color="var(--border)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay productos en el catálogo</span>
                  <span style={{ fontSize: 11 }}>Crea el primero con el botón «Agregar Ítem».</span>
                </div>
              )}

              {!loadingProductos && !errorProductos && filteredAndSortedProductos.map((p, i) => {
                const catColors = { 
                  'Bot': 'var(--cyan)', 
                  'Agente': 'var(--violet-bright)', 
                  'Script': 'var(--success-alt)', 
                  'Software': 'var(--primary)', 
                  'Auditoría': 'var(--danger)', 
                  'Consultoría': 'var(--warning-bright)' 
                };
                return (
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
                    <span style={{ color: catColors[p.cat], fontWeight: 600, fontSize: 10 }}>{p.cat}</span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                          setProductModalMode('view');
                          setProductModalOpen(true);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={13} />
                      </button>
                      <button
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                          setProductModalMode('edit');
                          setProductModalOpen(true);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={13} />
                      </button>
                      <button
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(p.id);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Icon d={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} w={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'reglas' && (
          <div className="catalogo-reglas">
            <div className="catalogo-toolbar">
              <div className="catalogo-search">
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
                <input type="text" placeholder="Buscar regla…" />
              </div>
              <button className="catalogo-btn-primary">
                <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                Nueva Regla
              </button>
            </div>

            {RULES.map(rule => {
              const ruleSt = { 'Activa': { color: 'var(--success-deep)', bg: 'var(--success-bg)', border: 'var(--success-border)' }, 'En prueba': { color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-border)' }, 'Inactiva': { color: 'var(--text-faint)', bg: 'var(--bg-topbar)', border: 'var(--border)' } };
              const sc = ruleSt[rule.status] || ruleSt['Inactiva'];
              return (
                <div key={rule.id} className="catalogo-rule-card">
                  <div className="catalogo-rule-priority">#{rule.priority}</div>
                  <div className="catalogo-rule-content">
                    <div className="catalogo-rule-header">
                      <h4>{rule.name}</h4>
                      <span className="catalogo-rule-status" style={{ background: sc.bg, borderColor: sc.border, color: sc.color }}>
                        <span style={{ background: sc.color }} />
                        {rule.status}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{rule.applies} · {rule.uses} activaciones</span>
                    </div>
                    <div className="catalogo-rule-logic">
                      <div>
                        <p className="catalogo-rule-label">Si…</p>
                        {rule.conditions.map((cond, i) => (
                          <div key={i} className="catalogo-rule-condition">
                            <span>{cond.field}</span>
                            <span>{cond.op}</span>
                            <span>{cond.value}</span>
                          </div>
                        ))}
                      </div>
                      <Icon d="M5 12h14M12 5l7 7-7 7" color="var(--primary)" w={18} />
                      <div>
                        <p className="catalogo-rule-label">Entonces…</p>
                        {rule.actions.map((act, i) => (
                          <div key={i} className="catalogo-rule-action">
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="catalogo-btn-secondary">Editar</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenuTarget && (
        <ContextMenu
          pos={contextMenuPos}
          target={contextMenuTarget}
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
