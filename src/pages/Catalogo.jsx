import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import './Catalogo.css';
import { getPlantillas, getClausulas, getProductos, createProducto } from '../api';
import EditClauseModal from './EditClauseModal';

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
    uses:    0,
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

const PRODUCTO_CATEGORIAS = ['Software', 'Servicio', 'Soporte', 'Formación'];

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

// ─── Use Template Modal ──────────────────────────────────────────────────────
const CLIENTES_SAMPLE = [
  { id: 1, name: 'Acme Corporation', rut: '76.123.456-7', type: 'Empresa' },
  { id: 2, name: 'Innovatech Ltda.', rut: '77.654.321-K', type: 'Empresa' },
  { id: 3, name: 'Juan Pérez Silva', rut: '12.345.678-9', type: 'Persona Natural' },
  { id: 4, name: 'GlobalSoft S.A.', rut: '99.111.222-3', type: 'Empresa' },
];

function UseTemplateModal({ plantilla, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [contractName, setContractName] = useState(`${plantilla.name} – `);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filteredClients = CLIENTES_SAMPLE.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.rut.includes(clientSearch)
  );

  const handleCreate = () => {
    alert(`✅ Contrato "${contractName}" creado con la plantilla ${plantilla.abbr} para ${selectedClient?.name || 'cliente seleccionado'}.`);
    onClose();
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
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#3b3631' }}>Usar plantilla</p>
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
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #efede8', display: 'flex', gap: 0 }}>
          {[{n:1,label:'Cliente'},{n:2,label:'Nombre'}].map((s, i) => (
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

        {/* Body */}
        <div style={{ padding: '16px 20px', minHeight: 220 }}>
          {step === 1 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#3b3631' }}>Selecciona el cliente</p>
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
                {filteredClients.map(c => (
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
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#3b3631' }}>{c.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#b0aaa3', fontFamily: "'JetBrains Mono',monospace" }}>{c.rut}</p>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                      background: c.type === 'Empresa' ? 'rgba(37,99,235,0.08)' : '#f0fdf4',
                      color: c.type === 'Empresa' ? '#2563eb' : '#15803d'
                    }}>{c.type}</span>
                  </button>
                ))}
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3b3631' }}>{selectedClient?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#7c7670' }}>Variables:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>{plantilla.vars} a completar</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e2da',
          display: 'flex', justifyContent: 'space-between', gap: 8,
          background: '#fafaf9'
        }}>
          <button
            onClick={() => step === 1 ? onClose() : setStep(1)}
            style={{
              padding: '7px 14px', borderRadius: 5, border: '1px solid #d8d4cc',
              background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}
          >{step === 1 ? 'Cancelar' : '← Atrás'}</button>
          <button
            disabled={step === 1 ? !selectedClient : !contractName.trim()}
            onClick={() => step === 1 ? setStep(2) : handleCreate()}
            style={{
              padding: '7px 16px', borderRadius: 5, border: 'none',
              background: (step === 1 ? !selectedClient : !contractName.trim()) ? '#93c5fd' : '#2563eb',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: (step === 1 ? !selectedClient : !contractName.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s'
            }}
          >{step === 1 ? 'Siguiente →' : 'Crear contrato ✓'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── New Product Modal ───────────────────────────────────────────────────────
const PRODUCTO_VACIO = { sku: '', name: '', desc: '', cat: 'Software', price: '', currency: 'USD', unit: '', status: 'Activo' };

function NewProductModal({ onClose, onCreated }) {
  const [form, setForm] = useState(PRODUCTO_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const isValid = form.sku.trim() && form.name.trim() && form.price !== '' && Number(form.price) >= 0;

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const producto = await createProducto(form);
      onCreated(producto);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear el producto');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', border: '1px solid #d8d4cc',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: '#3b3631',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c7670', textTransform: 'uppercase', letterSpacing: 0.5 };

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
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3b3631' }}>Nuevo Ítem — Producto / Tarifa</p>
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
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>SKU</label>
              <input style={inputStyle} value={form.sku} onChange={e => setField('sku', e.target.value)} placeholder="ST-PRO-A" autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="SoftTrack Pro v3 – Anual" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 56, fontFamily: 'inherit' }}
              value={form.desc}
              onChange={e => setField('desc', e.target.value)}
              placeholder="Licencia anual por usuario, incluye soporte 8×5"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Categoría</label>
              <select style={inputStyle} value={form.cat} onChange={e => setField('cat', e.target.value)}>
                {PRODUCTO_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select style={inputStyle} value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Descontinuado">Descontinuado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Precio</label>
              <input type="number" min="0" step="0.01" style={inputStyle} value={form.price} onChange={e => setField('price', e.target.value)} placeholder="1200" />
            </div>
            <div>
              <label style={labelStyle}>Moneda</label>
              <input style={inputStyle} value={form.currency} onChange={e => setField('currency', e.target.value.toUpperCase())} placeholder="USD" maxLength={8} />
            </div>
            <div>
              <label style={labelStyle}>Unidad</label>
              <input style={inputStyle} value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="/usuario/año" />
            </div>
          </div>

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
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid #d8d4cc', background: '#efede8', color: '#3b3631', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancelar</button>
          <button
            disabled={!isValid || saving}
            onClick={handleSubmit}
            style={{
              padding: '7px 16px', borderRadius: 5, border: 'none',
              background: (!isValid || saving) ? '#93c5fd' : '#2563eb',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: (!isValid || saving) ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}
          >{saving ? 'Guardando…' : 'Crear producto ✓'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Catalogo() {
  const [ctx, setCtx] = useState(0);
  const [tab, setTab] = useState('plantillas');
  const [selectedClause, setSelectedClause] = useState(0);
  const [clauseAlt, setClauseAlt] = useState(0);

  const [isClauseModalOpen, setIsClauseModalOpen] = useState(false);
  const [clauseToEdit, setClauseToEdit] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    setLoadingPlantillas(true);
    setErrorPlantillas(null);
    getPlantillas()
      .then(data => {
        if (!cancelled) {
          setApiPlantillas((data || []).map(normalizeApiPlantilla));
          setLoadingPlantillas(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setErrorPlantillas(err.message || 'Error al cargar plantillas');
          setLoadingPlantillas(false);
        }
      });
    return () => { cancelled = true; };
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
        if (normalized.length > 0 && selectedClause === 0) {
          setSelectedClause(normalized[0].id);
        }
      })
      .catch(err => {
        setErrorClausulas(err.message || 'Error al cargar cláusulas');
        setLoadingClausulas(false);
      });
  }, [selectedClause]);

  useEffect(() => {
    fetchClausulasData();
  }, [fetchClausulasData]);

  // ── Carga de productos/tarifas desde la API ─────────────────────────────────
  const [apiProductos, setApiProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(null);
  const [productoFilters, setProductoFilters] = useState({ search: '', categoria: 'Todos' });
  const [newProductOpen, setNewProductOpen] = useState(false);

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
  const clauseCategories = Array.from(new Set(apiClausulas.map(c => c.cat)));

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
                        onClick: () => console.log('Crear desde cero'),
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
                      {/* Use */}
                      <button
                        className="catalogo-btn-use"
                        onClick={e => { e.stopPropagation(); setUseTemplate(p); }}
                      >Usar →</button>
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
                  {apiClausulas.filter(c => c.cat === cat).map(c => (
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
              <div className="catalogo-clausulas-footer">
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
              <button className="catalogo-btn-primary" onClick={() => setNewProductOpen(true)}>
                <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                Agregar Ítem
              </button>
            </div>

            <div className="catalogo-productos-table">
              <div className="catalogo-productos-header">
                {['SKU', 'Nombre', 'Descripción', 'Categoría', 'Precio', 'Moneda', 'Estado'].map(col => (
                  <span key={col}>{col}</span>
                ))}
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

              {!loadingProductos && !errorProductos && apiProductos.filter(p => {
                if (productoFilters.categoria !== 'Todos' && p.cat !== productoFilters.categoria) return false;
                if (productoFilters.search && !p.name.toLowerCase().includes(productoFilters.search.toLowerCase()) && !p.sku.toLowerCase().includes(productoFilters.search.toLowerCase())) return false;
                return true;
              }).length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: '#b0aaa3' }}>
                  <Icon d={['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']} w={40} color="#d8d4cc" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#7c7670' }}>No hay productos en el catálogo</span>
                  <span style={{ fontSize: 11 }}>Crea el primero con el botón «Agregar Ítem».</span>
                </div>
              )}

              {!loadingProductos && !errorProductos && apiProductos.filter(p => {
                if (productoFilters.categoria !== 'Todos' && p.cat !== productoFilters.categoria) return false;
                if (productoFilters.search && !p.name.toLowerCase().includes(productoFilters.search.toLowerCase()) && !p.sku.toLowerCase().includes(productoFilters.search.toLowerCase())) return false;
                return true;
              }).map((p, i) => {
                const catColors = { 'Software': '#2563eb', 'Servicio': '#7c3aed', 'Soporte': '#0891b2', 'Formación': '#059669' };
                const discontinued = p.status === 'Descontinuado';
                return (
                  <div key={p.id ?? p.sku + i} className={`catalogo-productos-row ${discontinued ? 'discontinued' : ''}`}>
                    <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", color: '#2563eb', fontWeight: 600 }}>{p.sku}</span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: '#7c7670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</span>
                    <span style={{ color: catColors[p.cat], fontWeight: 600, fontSize: 10 }}>{p.cat}</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{formatPrecio(p.price)}</span>
                      <span style={{ fontSize: 10, color: '#b0aaa3' }}>{p.unit}</span>
                    </div>
                    <span style={{ color: '#7c7670' }}>{p.currency}</span>
                    {discontinued ? (
                      <span className="catalogo-status-discontinued">Descontinuado</span>
                    ) : (
                      <span className="catalogo-status-active">● Activo</span>
                    )}
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

      {newTemplateOpen && <NewTemplateModal onClose={() => setNewTemplateOpen(false)} />}

      {newProductOpen && (
        <NewProductModal
          onClose={() => setNewProductOpen(false)}
          onCreated={(producto) => setApiProductos(prev => [...prev, producto])}
        />
      )}

      {isClauseModalOpen && (
        <EditClauseModal
          clause={clauseToEdit}
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
