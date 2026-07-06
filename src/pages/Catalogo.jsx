import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import './Catalogo.css';
import { getPlantillas, getClausulas, getProductos, createProducto, getSoftwareList, updateProducto, deleteProducto, createPlantilla, getClientes, getSLAs, createContrato, generarDocumentoContrato } from '../api';
import EditClauseModal from './EditClauseModal';
import SortableHeader from '../components/ui/SortableHeader';

const CONTEXTS = ['Administración Global', 'SoftTrack Pro v3', 'ContaLite v2.1'];

// ── Helpers para normalizar datos de la API al formato esperado por la UI ──────

const TIPO_COLOR = {
  RECURRENTE: { color: '#059669', bg: '#d1fae5' },
  PERPETUO:   { color: '#2563eb', bg: '#eff6ff' },
  PRO_BONO:   { color: '#7c3aed', bg: '#ede9fe' },
  INTERNO:    { color: '#d97706', bg: '#fef3c7' },
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
    _raw: p,
  };
}

function getTagStyles(tipo) {
  if (tipo === 'Estándar') return { tagColor: '#15803d', tagBg: '#f0fdf4' };
  if (tipo === 'Alternativa') return { tagColor: '#b45309', tagBg: '#fffbeb' };
  return { tagColor: '#6d28d9', tagBg: '#f5f3ff' };
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

const Icon = ({ d, color = '#7c7670', w = 14 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

function StatusBadge({ status }) {
  const cfg = {
    'Aprobado': { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    'Borrador': { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    'En revisión': { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
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
  const cfg = { 'Alto': { color: '#be123c', bg: '#fff1f2' }, 'Medio': { color: '#b45309', bg: '#fffbeb' }, 'Bajo': { color: '#15803d', bg: '#f0fdf4' } };
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
          background: '#fff', border: '1px solid #d8d4cc', borderRadius: 6,
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
              fontSize: 12, color: '#3b3631', textAlign: 'left', fontFamily: 'inherit',
              borderRadius: 4, opacity: item.disabled ? 0.5 : 1, transition: 'background 0.12s'
            }}
            onMouseEnter={e => !item.disabled && (e.currentTarget.style.background = '#efede8')}
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
    cursor: 'pointer', fontSize: 12, color: danger ? '#dc2626' : '#5c574f',
    textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s'
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
      <div
        ref={menuRef}
        style={{
          position: 'fixed', top: menuPos.top, left: menuPos.left,
          background: '#fff', border: '1px solid #d8d4cc', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 999, minWidth: 180,
          animation: 'dropIn 0.15s ease-out', overflow: 'hidden'
        }}
      >
        <button
          style={itemStyle()}
          onClick={() => { onPreview?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={14} />
          Vista previa
        </button>
        <button
          style={itemStyle()}
          onClick={() => { onUse?.(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d="M5 12h14M12 5l7 7-7 7" w={14} />
          Usar plantilla
        </button>
        <div style={{ height: 1, background: '#e5e2da', margin: '2px 0' }} />
        <button
          style={itemStyle()}
          onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={14} />
          Editar
        </button>
        <button
          style={itemStyle()}
          onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.background = '#efede8'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" w={14} />
          Duplicar
        </button>
        <div style={{ height: 1, background: '#e5e2da', margin: '2px 0' }} />
        <button
          style={itemStyle(true)}
          onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Icon d={['M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3','M10 11v6','M14 11v6']} color="#dc2626" w={14} />
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
          background: '#fff', border: '1px solid #d8d4cc', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 999, padding: 16, minWidth: 260,
          animation: 'dropIn 0.15s ease-out', display: 'flex', flexDirection: 'column', gap: 16
        }}
      >
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, color: '#7c7670', textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado</p>
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
                    ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb' }
                    : { background: '#fff', color: '#5c574f', borderColor: '#d8d4cc' })
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, color: '#7c7670', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoría</p>
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
                    ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb' }
                    : { background: '#fff', color: '#5c574f', borderColor: '#d8d4cc' })
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
            style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d8d4cc', background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e2da'}
            onMouseLeave={e => e.currentTarget.style.background = '#efede8'}
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Preview Modal ──────────────────────────────────────────────────────────
function PreviewModal({ plantilla, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const sampleText = `CONTRATO DE ${plantilla.name.toUpperCase()}

Versión ${plantilla.version} · Categoría: ${plantilla.cat}

─────────────────────────────────────────────────────────

1. PARTES

   [PARTE_A] ("El Proveedor"), con domicilio en [DOMICILIO_PROVEEDOR],
   y [PARTE_B] ("El Cliente"), con domicilio en [DOMICILIO_CLIENTE],
   acuerdan lo siguiente:

2. OBJETO

   El presente contrato tiene por objeto regular las condiciones bajo las
   cuales [PARTE_A] prestará a [PARTE_B] los servicios descritos en el
   Anexo A del presente documento.

3. VIGENCIA

   El contrato entrará en vigor el día [FECHA_INICIO] y tendrá una
   duración de [DURACION] meses, pudiendo ser renovado por mutuo acuerdo
   de las partes.

4. PRECIO Y FORMA DE PAGO

   La contraprestación acordada es de [MONTO] [MONEDA], pagadera según
   las condiciones establecidas en el Anexo B.

5. CONFIDENCIALIDAD

   Ambas partes se comprometen a mantener en estricta confidencialidad
   toda la información intercambiada en el marco de este contrato,
   durante un período de [PERIODO_CONF] años posteriores a su terminación.

6. FIRMA

   ___________________________          ___________________________
   [PARTE_A]                            [PARTE_B]
   Fecha: [FECHA_FIRMA]                 Fecha: [FECHA_FIRMA]`;

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
          background: '#fff', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e5e2da',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: '#efede8', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6, background: plantilla.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: plantilla.color, fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.abbr}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3b3631' }}>{plantilla.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#b0aaa3', fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.cat} · {plantilla.version} · {plantilla.vars} variables</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, background: '#f0f0f0', color: '#7c7670',
              borderRadius: 4, padding: '3px 8px', fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>Vista previa</span>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#7c7670', fontSize: 18, transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e5e2da'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Cerrar"
            >×</button>
          </div>
        </div>

        {/* Variables bar */}
        <div style={{
          padding: '8px 20px', borderBottom: '1px solid #efede8',
          display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, background: '#fafaf9'
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#b0aaa3', textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'center', marginRight: 4 }}>Variables:</span>
          {['PARTE_A','PARTE_B','DOMICILIO_PROVEEDOR','DOMICILIO_CLIENTE','FECHA_INICIO','DURACION','MONTO','MONEDA'].map(v => (
            <span key={v} style={{
              fontSize: 9, fontWeight: 700, background: 'rgba(37,99,235,0.08)', color: '#2563eb',
              border: '1px solid rgba(37,99,235,0.2)', borderRadius: 4, padding: '2px 7px',
              fontFamily: "'JetBrains Mono',monospace"
            }}>[{v}]</span>
          ))}
        </div>

        {/* Document body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <pre style={{
            margin: 0, fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: 12, lineHeight: 1.8, color: '#3b3631', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>{sampleText}</pre>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e2da',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafaf9', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 5, border: '1px solid #d8d4cc',
              background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e2da'}
            onMouseLeave={e => e.currentTarget.style.background = '#efede8'}
          >Cerrar</button>
          <button
            style={{
              padding: '7px 14px', borderRadius: 5, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
          >Usar esta plantilla →</button>
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
      const nuevoContrato = await createContrato({
        cliente_id: selectedClient.id,
        software_id: plantilla.software_id || 1, // Fallback si la plantilla no tiene software asociado
        sla_id: slas.length > 0 ? slas[0].id : 1, // Fallback si no hay SLAs cargados
        tipo_contrato: plantilla.tipo_contrato || 'RECURRENTE',
        monto: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
        frecuencia_facturacion: (plantilla.tipo_contrato || 'RECURRENTE') === 'RECURRENTE' ? 'MENSUAL' : undefined,
      });

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
          background: '#fff', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e5e2da',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#efede8', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: plantilla.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: plantilla.color, fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.abbr}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#3b3631' }}>
                {step === 3 ? 'Contrato creado' : 'Crear contrato desde plantilla'}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#b0aaa3' }}>{plantilla.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c7670', fontSize: 18, transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e2da'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >×</button>
        </div>

        {/* Steps indicator */}
        {step < 3 && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #efede8', display: 'flex', gap: 0 }}>
            {[{n:1,label:'Cliente'},{n:2,label:'Configuración del contrato'}].map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: step >= s.n ? '#2563eb' : '#e5e2da',
                    color: step >= s.n ? '#fff' : '#b0aaa3'
                  }}>{s.n}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: step >= s.n ? '#2563eb' : '#b0aaa3' }}>{s.label}</span>
                </div>
                {i < 1 && <div style={{ flex: 1, height: 1, background: '#e5e2da', margin: '0 10px', alignSelf: 'center' }} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '16px 20px', minHeight: 220 }}>
          {step === 1 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#3b3631' }}>Selecciona el cliente para el nuevo contrato</p>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '7px 10px 7px 30px', border: '1px solid #d8d4cc',
                    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
                    outline: 'none', background: '#f4f3ef', color: '#3b3631'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {filteredClients.length === 0 && <p style={{ fontSize: 12, color: '#7c7670', textAlign: 'center', padding: '20px 0' }}>No se encontraron clientes.</p>}
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
                        borderColor: selectedClient?.id === c.id ? '#2563eb' : '#e5e2da',
                        background: selectedClient?.id === c.id ? 'rgba(37,99,235,0.05)' : '#fafaf9',
                        borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#3b3631' }}>{cName}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#b0aaa3', fontFamily: "'JetBrains Mono',monospace" }}>{cRut}</p>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                        background: cType === 'Empresa' ? 'rgba(37,99,235,0.08)' : '#f0fdf4',
                        color: cType === 'Empresa' ? '#2563eb' : '#15803d'
                      }}>{cType}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#3b3631' }}>Nombre del contrato</p>
              <input
                type="text"
                value={contractName}
                onChange={e => setContractName(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', border: '1px solid #d8d4cc',
                  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', color: '#3b3631', marginBottom: 14
                }}
                autoFocus
              />
              <div style={{ background: '#f4f3ef', borderRadius: 6, padding: '10px 14px', border: '1px solid #e5e2da' }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#b0aaa3', textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumen</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#7c7670' }}>Plantilla:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3b3631' }}>{plantilla.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#7c7670' }}>Cliente:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3b3631' }}>
                      {selectedClient?.razon_social || selectedClient?.nombre_comercial}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#7c7670' }}>Variables:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>{plantilla.vars || 0} a completar</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'previewIn 0.3s ease-out' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#d1fae5', color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 28, boxShadow: '0 4px 12px rgba(5,150,105,0.15)'
              }}>✓</div>
              <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#3b3631' }}>Contrato y documento creados con éxito</p>
              <p style={{ margin: 0, fontSize: 13, color: '#7c7670', lineHeight: 1.5 }}>
                Se ha creado un nuevo contrato basado en la plantilla <strong>{plantilla.abbr}</strong> para el cliente <strong>{selectedClient?.razon_social || selectedClient?.nombre_comercial}</strong> y se ha generado su documento correspondiente.<br/><br/>
                Puedes revisarlo y editarlo en la sección de Contratos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e2da',
          display: 'flex', justifyContent: step === 3 ? 'center' : 'space-between', gap: 8,
          background: '#fafaf9'
        }}>
          {step < 3 ? (
            <>
              <button
                onClick={() => step === 1 ? onClose() : setStep(1)}
                style={{
                  padding: '7px 14px', borderRadius: 5, border: '1px solid #d8d4cc',
                  background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >{step === 1 ? 'Cancelar' : '← Atrás'}</button>
              <button
                disabled={isCreating || (step === 1 ? !selectedClient : !contractName.trim())}
                onClick={() => step === 1 ? setStep(2) : handleCreate()}
                style={{
                  padding: '7px 16px', borderRadius: 5, border: 'none',
                  background: isCreating || (step === 1 ? !selectedClient : !contractName.trim()) ? '#93c5fd' : '#2563eb',
                  color: '#fff', fontSize: 12, fontWeight: 600,
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
                background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
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
    padding: '8px 10px', border: '1px solid #d8d4cc',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: '#3b3631',
    backgroundColor: isView ? '#f4f3ef' : '#fff',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c7670', textTransform: 'uppercase', letterSpacing: 0.5 };

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
          background: '#fff', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: hasDynamicPanel ? 860 : 520, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', transition: 'max-width 0.25s ease-in-out', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e5e2da',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#efede8', flexShrink: 0
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3b3631' }}>{modalTitle}</p>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c7670', fontSize: 18
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e2da'}
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
                  style={{ ...inputStyle, backgroundColor: '#f4f3ef', color: '#7c7670' }}
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
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? '#f4f3ef' : '#fff' }}
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? '0' : '1200'}
                />
              </div>
              <div>
                <label style={labelStyle}>Moneda</label>
                <input
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? '#f4f3ef' : '#fff' }}
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
                  style={{ ...inputStyle, backgroundColor: (isView || isFreeLicense) ? '#f4f3ef' : '#fff' }}
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                  disabled={isView || isFreeLicense}
                  placeholder={isFreeLicense ? 'No aplica' : '/usuario/año'}
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 12 }}>
                <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="#dc2626" w={14} />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Side Panel "Más Información" */}
          {hasDynamicPanel && (
            <div style={{
              width: 320, borderLeft: '1px solid #e5e2da', background: '#fafaf9',
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: '#3b3631' }}>Más Información</h4>
                <p style={{ margin: 0, fontSize: 11, color: '#7c7670' }}>Campos requeridos para la categoría <strong>{form.cat}</strong>.</p>
              </div>

              <div style={{ width: '100%', height: '1px', background: '#e5e2da', margin: '4px 0' }} />

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
          padding: '12px 20px', borderTop: '1px solid #e5e2da',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafaf9', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid #d8d4cc', background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >{isView ? 'Cerrar' : 'Cancelar'}</button>
          {!isView && (
            <button
              disabled={!isValid || saving}
              onClick={handleSubmit}
              style={{
                padding: '7px 16px', borderRadius: 5, border: 'none',
                background: (!isValid || saving) ? '#93c5fd' : '#2563eb',
                color: '#fff', fontSize: 12, fontWeight: 600,
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
const TEMPLATE_VACIO = { nombre: '', tipo_contrato: 'PLAZO_FIJO', version_codigo: '', software_id: '', modo_origen: 'archivo', archivo_docx: null };

function NewTemplateModal({ onClose, onSuccess, createForm, setCreateForm, softwareList }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [searchSoft, setSearchSoft] = useState('');
  const [showSoft, setShowSoft] = useState(false);
  const filteredSoft = (softwareList || []).filter(s => (s.name || s.nombre || '').toLowerCase().includes(searchSoft.toLowerCase()));

  const setField = (field, value) => setCreateForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.nombre || !createForm.tipo_contrato || !createForm.version_codigo || !createForm.software_id) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (createForm.modo_origen === 'archivo' && !createForm.archivo_docx) {
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

      await createPlantilla(fd);
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
    padding: '8px 10px', border: '1px solid #d8d4cc',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: '#3b3631', backgroundColor: '#fff',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c7670', textTransform: 'uppercase', letterSpacing: 0.5 };
  const modeBtn = (active) => ({
    flex: 1, padding: '8px 12px', borderRadius: 5,
    border: active ? '2px solid #2563eb' : '1px solid #d8d4cc',
    background: active ? '#eff6ff' : '#fafaf9',
    color: active ? '#2563eb' : '#7c7670',
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
          background: '#fff', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e5e2da',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#efede8', flexShrink: 0
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3b3631' }}>Nueva Plantilla de Contrato</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#7c7670' }}>El software seleccionado determina qué plantilla se usa al crear contratos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c7670', fontSize: 18
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
                <Icon d="M6 9l6 6 6-6" w={12} color="#7c7670"/>
              </div>
              {showSoft && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d8d4cc', borderRadius: 5, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <input 
                    autoFocus
                    placeholder="Buscar..."
                    value={searchSoft}
                    onChange={e => setSearchSoft(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: 'none', borderBottom: '1px solid #e5e2da', boxSizing: 'border-box', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: '#3b3631' }}
                  />
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {filteredSoft.length > 0 ? filteredSoft.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => { setField('software_id', s.id); setShowSoft(false); setSearchSoft(''); }}
                        style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', color: '#3b3631' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f4f4f5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {s.name || s.nombre}
                      </div>
                    )) : <div style={{ padding: '8px 10px', fontSize: 12, color: '#7c7670' }}>No hay resultados</div>}
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
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" w={14} color={createForm.modo_origen === 'archivo' ? '#2563eb' : '#7c7670'} />
                  Subir documento (.docx)
                </span>
              </button>
              <button
                type="button"
                style={modeBtn(createForm.modo_origen === 'clausulas')}
                onClick={() => setField('modo_origen', 'clausulas')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" w={14} color={createForm.modo_origen === 'clausulas' ? '#2563eb' : '#7c7670'} />
                  Generar con cláusulas
                </span>
              </button>
            </div>
          </div>

          {/* Archivo — solo si modo = archivo */}
          {createForm.modo_origen === 'archivo' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px', border: '1px dashed #d8d4cc', borderRadius: 6, background: '#fafaf9'
            }}>
              <label style={{ ...labelStyle, textAlign: 'center', marginBottom: 12 }}>Archivo Word (.docx) *</label>
              <label style={{
                cursor: 'pointer', padding: '8px 16px', background: '#fff', border: '1px solid #d8d4cc',
                borderRadius: 5, fontSize: 12, fontWeight: 600, color: '#3b3631', fontFamily: 'inherit',
                transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f4f5'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" w={14} color="#7c7670" />
                Seleccionar archivo
                <input
                  type="file"
                  accept=".docx"
                  onChange={e => setField('archivo_docx', e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
              {createForm.archivo_docx && (
                <p style={{ margin: '12px 0 0 0', fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon d="M20 6L9 17l-5-5" w={12} color="#16a34a" /> {createForm.archivo_docx.name} ({Math.round(createForm.archivo_docx.size / 1024)} KB)
                </p>
              )}
            </div>
          )}

          {createForm.modo_origen === 'clausulas' && (
            <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01" w={14} color="#15803d" />
              <p style={{ margin: 0, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                El documento se generará automáticamente con las cláusulas configuradas.
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 12 }}>
              <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="#dc2626" w={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e2da',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafaf9', flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid #d8d4cc', background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancelar</button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '7px 16px', borderRadius: 5, border: 'none',
              background: saving ? '#93c5fd' : '#2563eb',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}
          >{saving ? 'Subiendo…' : 'Crear plantilla ✓'}</button>
        </div>
      </form>
    </div>
  );
}


export default function Catalogo() {
  const [ctx, setCtx] = useState(0);
  const [tab, setTab] = useState('plantillas');
  const [selectedClause, setSelectedClause] = useState(0);
  const [clauseAlt, setClauseAlt] = useState(0);
  const [clausePage, setClausePage] = useState(1);

  const [isClauseModalOpen, setIsClauseModalOpen] = useState(false);
  const [clauseToEdit, setClauseToEdit] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);

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

  // ── Software list (para el modal de nueva plantilla) ────────────────────────────────
  const [softwareListCatalogo, setSoftwareListCatalogo] = useState([]);
  useEffect(() => {
    getSoftwareList().then(setSoftwareListCatalogo).catch(() => setSoftwareListCatalogo([]));
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
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto/tarifa?')) return;
    try {
      await deleteProducto(id);
      setApiProductos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message || 'Error al eliminar el producto');
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
    <div className="catalogo-container">
      <div className="catalogo-header">
        <div>
          <p className="catalogo-header-label">Enfoque Platform</p>
          <h1 className="catalogo-header-title">Catálogo</h1>
        </div>
        <div className="catalogo-header-info">
          <span className="catalogo-date">Vie 4 jul 2026</span>
          <div className="catalogo-divider"></div>
          <div className="catalogo-ctx-badge">
            <span className="catalogo-ctx-dot" />
            {CONTEXTS[ctx]}
            <Icon d="M6 9l6 6 6-6" color="#2563eb" w={10} />
          </div>
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
            <Icon d={t.icon} color={tab === t.id ? '#2563eb' : '#b0aaa3'} w={14} />
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
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
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
                  style={{ color: filterOpen ? '#2563eb' : undefined, borderColor: filterOpen ? '#bfdbfe' : undefined, background: filterOpen ? '#eff6ff' : undefined }}
                >
                  <Icon d="M4 6h16M7 12h10M10 18h4" color={filterOpen ? '#2563eb' : '#7c7670'} w={13} />
                  Filtrar
                  {activeFilterCount > 0 && (
                    <span style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
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
                  <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} color="#7c7670" w={13} />
                  Importar
                </button>
                {importOpen && (
                  <ActionDropdown
                    anchorRef={importBtnRef}
                    onClose={() => setImportOpen(false)}
                    items={[
                      {
                        label: 'Importar desde Word/PDF',
                        icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="#7c7670" w={14} />,
                        onClick: () => console.log('Import from Word/PDF'),
                      },
                      {
                        label: 'Importar desde Excel',
                        icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="#15803d" w={14} />,
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
                  <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                  Nueva Plantilla
                </button>
                {newTemplateOpen && (
                  <ActionDropdown
                    anchorRef={newTemplateBtnRef}
                    onClose={() => setNewTemplateOpen(false)}
                    items={[
                      {
                        label: 'Crear desde cero',
                        icon: <Icon d={['M12 5v14', 'M5 12h14']} color="#7c7670" w={14} />,
                        onClick: () => {
                          setNewTemplateOpen(false);
                          setIsNewTemplateModalOpen(true);
                        },
                      },
                      {
                        label: 'Generar con IA (Enfoque AI)',
                        icon: <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" color="#7c3aed" w={14} />,
                        onClick: () => console.log('Generar con IA'),
                      },
                      {
                        label: 'Importar documento (Word/PDF)',
                        icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} color="#7c7670" w={14} />,
                        onClick: () => console.log('Importar doc'),
                      },
                      {
                        label: 'Clonar existente',
                        icon: <Icon d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" color="#7c7670" w={14} />,
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
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: '#b0aaa3' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ fontSize: 12 }}>Cargando plantillas…</span>
                </div>
              )}

              {/* Estado de error */}
              {!loadingPlantillas && errorPlantillas && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: '#dc2626' }}>
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="#dc2626" w={28} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar las plantillas</span>
                  <span style={{ fontSize: 11, color: '#7c7670' }}>{errorPlantillas}</span>
                  <button
                    className="catalogo-btn-secondary"
                    onClick={() => { setErrorPlantillas(null); setLoadingPlantillas(true); getPlantillas().then(d => { setApiPlantillas((d||[]).map(normalizeApiPlantilla)); setLoadingPlantillas(false); }).catch(e => { setErrorPlantillas(e.message); setLoadingPlantillas(false); }); }}
                    style={{ marginTop: 4 }}
                  >Reintentar</button>
                </div>
              )}

              {/* Estado vacío */}
              {!loadingPlantillas && !errorPlantillas && apiPlantillas.length === 0 && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: '#b0aaa3' }}>
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6']} w={40} color="#d8d4cc" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#7c7670' }}>No hay plantillas en el catálogo</span>
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
                <div key={p.id} className="catalogo-card">
                  <div className="catalogo-card-header">
                    <div className="catalogo-card-abbr" style={{ background: p.bg }}>
                      <span style={{ color: p.color }}>{p.abbr}</span>
                    </div>
                    <div className="catalogo-card-title">
                      <p>{p.name}</p>
                      <p className="catalogo-card-meta">{p.cat} · {p.version}</p>
                    </div>
                  </div>

                  <div className="catalogo-card-status">
                    <StatusBadge status={p.status} />
                    {p.vars !== null && (
                      <span style={{ fontSize: 10, color: '#b0aaa3', marginLeft: 2 }}>{p.vars} variables</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#7c7670', fontWeight: 600 }}>{p.uses} usos</span>
                  </div>

                  <div className="catalogo-card-footer">
                    <span style={{ fontSize: 10, color: '#b0aaa3' }}>Act. {p.updated}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {/* Eye – Preview */}
                      <button
                        title="Vista previa"
                        className="catalogo-icon-btn"
                        onClick={e => { e.stopPropagation(); setPreviewTemplate(p); }}
                      >
                        <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={13} color="#7c7670" />
                      </button>
                      {/* Software tag */}
                      {p._raw?.software_nombre && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: '#eff6ff', color: '#2563eb', fontFamily: "'JetBrains Mono',monospace",
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
                        <Icon d={['M12 5v.01','M12 12v.01','M12 19v.01','M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z','M12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z']} w={14} color="#7c7670" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'clausulas' && (
          <div className="catalogo-clausulas">
            <div className="catalogo-clausulas-sidebar">
              <div className="catalogo-clausulas-sidebar-header">
                <div className="catalogo-search">
                  <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
                  <input type="text" placeholder="Buscar cláusula…" />
                </div>
              </div>
              
              {loadingClausulas && (
                <div style={{ padding: 20, textAlign: 'center', color: '#b0aaa3', fontSize: 12 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <br />Cargando cláusulas...
                </div>
              )}
              {errorClausulas && <div style={{ padding: 20, textAlign: 'center', color: '#dc2626', fontSize: 12 }}>{errorClausulas}</div>}

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
                        <span style={{ fontSize: 10, color: '#b0aaa3' }}>{c.versions.length} versiones</span>
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
                      style={{ background: 'none', border: '1px solid #d8d4cc', borderRadius: 4, padding: '4px 8px', cursor: clausePage === 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: clausePage === 1 ? '#d8d4cc' : '#3b3631' }}
                    >Anterior</button>
                    <span style={{ fontSize: 11, color: '#7c7670', fontWeight: 600 }}>Pág {clausePage} de {totalClausePages}</span>
                    <button
                      onClick={() => setClausePage(p => Math.min(totalClausePages, p + 1))}
                      disabled={clausePage === totalClausePages}
                      style={{ background: 'none', border: '1px solid #d8d4cc', borderRadius: 4, padding: '4px 8px', cursor: clausePage === totalClausePages ? 'not-allowed' : 'pointer', fontSize: 12, color: clausePage === totalClausePages ? '#d8d4cc' : '#3b3631' }}
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
                        <span style={{ fontSize: 10, color: '#b0aaa3' }}>{selectedClauseData.versions.length} versiones disponibles</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button 
                        className="catalogo-btn-secondary"
                        onClick={() => { setClauseToEdit(activeClause); setIsClauseModalOpen(true); }}
                      >
                        Editar
                      </button>
                      <button className="catalogo-btn-primary">Insertar en contrato</button>
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
                      <Icon d={clauseAlt === 0 ? 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'} color={clauseAlt === 0 ? '#15803d' : '#b45309'} w={15} />
                      <p>
                        {clauseAlt === 0
                          ? 'Cláusula estándar aprobada por el equipo legal. Uso recomendado en contratos de bajo y mediano riesgo.'
                          : 'Versión alternativa para negociaciones. Requiere aprobación del Gerente Legal antes de su uso.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#b0aaa3' }}>
                  <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} w={40} color="#d8d4cc" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#7c7670', marginTop: 12 }}>Selecciona una cláusula</span>
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
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
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
                <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0', color: '#b0aaa3' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ fontSize: 12 }}>Cargando productos…</span>
                </div>
              )}

              {!loadingProductos && errorProductos && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0', color: '#dc2626' }}>
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="#dc2626" w={28} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>No se pudieron cargar los productos</span>
                  <span style={{ fontSize: 11, color: '#7c7670' }}>{errorProductos}</span>
                  <button className="catalogo-btn-secondary" onClick={fetchProductosData} style={{ marginTop: 4 }}>Reintentar</button>
                </div>
              )}

              {!loadingProductos && !errorProductos && filteredAndSortedProductos.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: '#b0aaa3' }}>
                  <Icon d={['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']} w={40} color="#d8d4cc" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#7c7670' }}>No hay productos en el catálogo</span>
                  <span style={{ fontSize: 11 }}>Crea el primero con el botón «Agregar Ítem».</span>
                </div>
              )}

              {!loadingProductos && !errorProductos && filteredAndSortedProductos.map((p, i) => {
                const catColors = { 
                  'Bot': '#0891b2', 
                  'Agente': '#7c3aed', 
                  'Script': '#059669', 
                  'Software': '#2563eb', 
                  'Auditoría': '#dc2626', 
                  'Consultoría': '#d97706' 
                };
                return (
                  <div key={p.id ?? p.sku + i} className="catalogo-productos-row">
                    <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", color: '#2563eb', fontWeight: 600 }}>{p.sku}</span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ color: '#7c7670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc || <span style={{ color: '#b0aaa3', fontStyle: 'italic' }}>Sin descripción</span>}</span>
                      {p.datos_adicionales && Object.keys(p.datos_adicionales).length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          {Object.entries(p.datos_adicionales).map(([k, v]) => {
                            if (!v) return null;
                            const keyLabel = k.replace('_', ' ');
                            return (
                              <span key={k} style={{ 
                                background: '#f4f3ef', 
                                border: '1px solid #e5e2da', 
                                borderRadius: 3, 
                                padding: '1px 5px', 
                                fontSize: 9, 
                                color: '#7c7670',
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
                        <span style={{ fontSize: 10, color: '#b0aaa3' }}> {p.unit}</span>
                      )}
                    </div>
                    <span style={{ color: '#7c7670' }}>{p.tipo_licencia === 'Gratuito / OpenSource' ? '—' : p.currency}</span>
                    
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        title="Ver detalle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                          setProductModalMode('view');
                          setProductModalOpen(true);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: '#7c7670' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                        onMouseLeave={e => e.currentTarget.style.color = '#7c7670'}
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
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: '#7c7670' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                        onMouseLeave={e => e.currentTarget.style.color = '#7c7670'}
                      >
                        <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={13} />
                      </button>
                      <button
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(p.id);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: '#7c7670' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#7c7670'}
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
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
                <input type="text" placeholder="Buscar regla…" />
              </div>
              <button className="catalogo-btn-primary">
                <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                Nueva Regla
              </button>
            </div>

            {RULES.map(rule => {
              const ruleSt = { 'Activa': { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' }, 'En prueba': { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' }, 'Inactiva': { color: '#b0aaa3', bg: '#efede8', border: '#d8d4cc' } };
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
                      <span style={{ fontSize: 10, color: '#b0aaa3' }}>{rule.applies} · {rule.uses} activaciones</span>
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
                      <Icon d="M5 12h14M12 5l7 7-7 7" color="#2563eb" w={18} />
                      <div>
                        <p className="catalogo-rule-label">Entonces…</p>
                        {rule.actions.map((act, i) => (
                          <div key={i} className="catalogo-rule-action">
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
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
        />
      )}

      {previewTemplate && (
        <PreviewModal plantilla={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}

      {useTemplate && (
        <UseTemplateModal plantilla={useTemplate} onClose={() => setUseTemplate(null)} />
      )}

      {isNewTemplateModalOpen && (
        <NewTemplateModal
          createForm={templateFormCache}
          setCreateForm={setTemplateFormCache}
          softwareList={apiProductos}
          onClose={() => setIsNewTemplateModalOpen(false)}
          onSuccess={() => {
            setIsNewTemplateModalOpen(false);
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
