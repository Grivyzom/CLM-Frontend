import React, { useState } from 'react';
import './Catalogo.css';

const CONTEXTS = ['Administración Global', 'SoftTrack Pro v3', 'ContaLite v2.1'];

const PLANTILLAS = [
  { id: 1, name: 'NDA – Acuerdo de Confidencialidad', abbr: 'NDA', cat: 'Legal', version: 'v3.1', vars: 8, status: 'Aprobado', updated: '28 jun 2026', uses: 47, color: '#2563eb', bg: '#eff6ff' },
  { id: 2, name: 'SLA – Acuerdo de Nivel de Servicio', abbr: 'SLA', cat: 'Operaciones', version: 'v2.4', vars: 12, status: 'Aprobado', updated: '15 jun 2026', uses: 33, color: '#0891b2', bg: '#cffafe' },
  { id: 3, name: 'Contrato de Prestación de Servicios', abbr: 'CPS', cat: 'Comercial', version: 'v5.0', vars: 19, status: 'Aprobado', updated: '1 jul 2026', uses: 88, color: '#059669', bg: '#d1fae5' },
  { id: 4, name: 'Contrato de Compraventa', abbr: 'CCV', cat: 'Comercial', version: 'v2.2', vars: 14, status: 'Aprobado', updated: '20 may 2026', uses: 24, color: '#7c3aed', bg: '#ede9fe' },
  { id: 5, name: 'Acuerdo Marco de Colaboración', abbr: 'AMC', cat: 'Legal', version: 'v1.1', vars: 10, status: 'Borrador', updated: '3 jul 2026', uses: 0, color: '#d97706', bg: '#fef3c7' },
  { id: 6, name: 'Contrato de Mantenimiento', abbr: 'CMT', cat: 'Operaciones', version: 'v3.0', vars: 9, status: 'Aprobado', updated: '10 jun 2026', uses: 19, color: '#dc2626', bg: '#fee2e2' },
  { id: 7, name: 'Adenda de Modificación de Contrato', abbr: 'ADN', cat: 'Legal', version: 'v1.3', vars: 6, status: 'Aprobado', updated: '25 jun 2026', uses: 31, color: '#0284c7', bg: '#e0f2fe' },
  { id: 8, name: 'Contrato de Licenciamiento de Software', abbr: 'CLS', cat: 'Tecnología', version: 'v4.1', vars: 22, status: 'En revisión', updated: '2 jul 2026', uses: 12, color: '#ea580c', bg: '#ffedd5' },
];

const CLAUSES = [
  { id: 0, cat: 'Responsabilidad', name: 'Limitación de Responsabilidad', risk: 'Alto', versions: [
      { label: 'Estándar', tag: 'Estándar', tagColor: '#15803d', tagBg: '#f0fdf4',
        text: 'La responsabilidad total acumulada de cada parte frente a la otra, surgida de o relacionada con este Acuerdo, ya sea en contrato, agravio o de otra índole, no excederá el monto total pagado por el Cliente durante los doce (12) meses inmediatamente anteriores al evento que origina la reclamación. En ningún caso ninguna de las partes será responsable por daños indirectos, incidentales, especiales, ejemplares, consecuentes o punitivos.' },
      { label: 'Flexible (negociación)', tag: 'Alternativa', tagColor: '#b45309', tagBg: '#fffbeb',
        text: 'La responsabilidad total de cada parte se limitará a dos veces (2x) el monto total pagado durante los doce (12) meses anteriores. Esta limitación no aplicará en casos de dolo, negligencia grave, violación de confidencialidad o infracciones de propiedad intelectual.' },
    ]},
  { id: 1, cat: 'Confidencialidad', name: 'Obligación de Confidencialidad', risk: 'Alto', versions: [
      { label: 'Estándar', tag: 'Estándar', tagColor: '#15803d', tagBg: '#f0fdf4',
        text: 'Cada parte acuerda mantener en estricta confidencialidad toda la Información Confidencial recibida de la otra parte y no revelarla a ningún tercero sin el consentimiento previo por escrito de la parte divulgadora. Esta obligación permanecerá vigente durante cinco (5) años posteriores a la terminación del Acuerdo.' },
      { label: 'Ampliada (datos sensibles)', tag: 'Alternativa', tagColor: '#b45309', tagBg: '#fffbeb',
        text: 'Las obligaciones de confidencialidad sobre Datos Personales, secretos comerciales o propiedad intelectual no tendrán límite temporal y permanecerán vigentes indefinidamente. Cualquier incumplimiento dará derecho a la parte afectada a solicitar medidas cautelares sin necesidad de acreditar perjuicio económico.' },
    ]},
  { id: 2, cat: 'Pagos', name: 'Condiciones de Pago y Mora', risk: 'Medio', versions: [
      { label: 'Estándar', tag: 'Estándar', tagColor: '#15803d', tagBg: '#f0fdf4',
        text: 'El Cliente abonará las facturas emitidas dentro de los treinta (30) días calendario contados desde la fecha de emisión. Los montos vencidos devengarán un interés de mora equivalente a la tasa de referencia del Banco Central más 2 puntos porcentuales, calculado de forma diaria.' },
      { label: 'Acelerada (enterprise)', tag: 'Alternativa', tagColor: '#b45309', tagBg: '#fffbeb',
        text: 'El pago se realizará a quince (15) días netos. Facturas impagas a los 45 días facultan al proveedor a suspender servicios y declarar vencimiento anticipado de todas las obligaciones pendientes sin necesidad de requerimiento previo.' },
    ]},
  { id: 3, cat: 'Resolución de Disputas', name: 'Mediación y Arbitraje', risk: 'Medio', versions: [
      { label: 'Estándar', tag: 'Estándar', tagColor: '#15803d', tagBg: '#f0fdf4',
        text: 'Las partes se comprometen a resolver cualquier controversia mediante mediación previa ante el Centro de Arbitraje y Mediación de Santiago. De no alcanzarse acuerdo en 30 días, la disputa será resuelta por un árbitro arbitrador designado de común acuerdo o por el referido Centro.' },
      { label: 'Internacional', tag: 'Alternativa', tagColor: '#6d28d9', tagBg: '#f5f3ff',
        text: 'Toda disputa se resolverá mediante arbitraje bajo las Reglas de la ICC, con sede en Miami, Florida. El idioma del procedimiento será el español. El laudo será definitivo y vinculante y podrá ejecutarse en cualquier jurisdicción competente.' },
    ]},
  { id: 4, cat: 'Vigencia y Terminación', name: 'Causales de Terminación Anticipada', risk: 'Alto', versions: [
      { label: 'Estándar', tag: 'Estándar', tagColor: '#15803d', tagBg: '#f0fdf4',
        text: 'Cualquiera de las partes podrá dar por terminado este Acuerdo con treinta (30) días de aviso previo por escrito en caso de incumplimiento material no subsanado dentro de los quince (15) días siguientes a la notificación de dicho incumplimiento.' },
      { label: 'Protección al proveedor', tag: 'Alternativa', tagColor: '#b45309', tagBg: '#fffbeb',
        text: 'El proveedor podrá terminar de inmediato, sin previo aviso, ante insolvencia declarada, cesión no autorizada o violación de cláusulas de confidencialidad. El Cliente deberá indemnizar los ingresos proyectados del período remanente del contrato.' },
    ]},
];

const PRODUCTS = [
  { sku: 'ST-PRO-A', name: 'SoftTrack Pro v3 – Anual', cat: 'Software', desc: 'Licencia anual por usuario, incluye soporte 8×5', price: '$1.200', currency: 'USD', unit: '/usuario/año', status: 'Activo' },
  { sku: 'ST-PRO-M', name: 'SoftTrack Pro v3 – Mensual', cat: 'Software', desc: 'Licencia mensual por usuario, facturación recurrente', price: '$120', currency: 'USD', unit: '/usuario/mes', status: 'Activo' },
  { sku: 'CL-STD-A', name: 'ContaLite Standard – Anual', cat: 'Software', desc: 'Módulo contabilidad básico, hasta 5 usuarios', price: '$800', currency: 'USD', unit: '/año', status: 'Activo' },
  { sku: 'AX-ENT', name: 'AnalyticsX Enterprise', cat: 'Software', desc: 'BI & analytics avanzado, usuarios ilimitados', price: '$4.500', currency: 'USD', unit: '/año', status: 'Activo' },
  { sku: 'IMP-ONC', name: 'Implementación Onsite', cat: 'Servicio', desc: 'Consultores in-situ, precio por día-hombre', price: '$850', currency: 'USD', unit: '/día', status: 'Activo' },
  { sku: 'IMP-REM', name: 'Implementación Remota', cat: 'Servicio', desc: 'Configuración y onboarding en línea, 10 horas', price: '$1.200', currency: 'USD', unit: '/proyecto', status: 'Activo' },
  { sku: 'SOP-PRE', name: 'Soporte Premium 24×7', cat: 'Soporte', desc: 'SLA garantizado: crítico < 1h, medio < 4h', price: '$300', currency: 'USD', unit: '/mes', status: 'Activo' },
  { sku: 'CAP-USR', name: 'Capacitación por Usuario', cat: 'Formación', desc: 'Sesión de 4 horas por grupo de hasta 10 personas', price: '$400', currency: 'USD', unit: '/sesión', status: 'Activo' },
  { sku: 'ST-PRO-V2', name: 'SoftTrack Pro v2 – Anual', cat: 'Software', desc: 'Versión anterior, solo para renovaciones existentes', price: '$900', currency: 'USD', unit: '/usuario/año', status: 'Descontinuado' },
];

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

export default function Catalogo() {
  const [ctx, setCtx] = useState(0);
  const [tab, setTab] = useState('plantillas');
  const [selectedClause, setSelectedClause] = useState(0);
  const [clauseAlt, setClauseAlt] = useState(0);

  const selectedClauseData = CLAUSES[selectedClause];
  const selectedAlt = selectedClauseData.versions[clauseAlt] || selectedClauseData.versions[0];

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
          { id: 'plantillas', label: 'Plantillas', count: 14, icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'] },
          { id: 'clausulas', label: 'Cláusulas', count: 38, icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
          { id: 'productos', label: 'Productos / Tarifas', count: 52, icon: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'] },
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
                <input type="text" placeholder="Buscar plantilla…" />
              </div>
              <button className="catalogo-btn-secondary">
                <Icon d="M4 6h16M7 12h10M10 18h4" color="#7c7670" w={13} />
                Filtrar
              </button>
              <button className="catalogo-btn-secondary">
                <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} color="#7c7670" w={13} />
                Importar
              </button>
              <button className="catalogo-btn-primary">
                <Icon d={['M12 5v14', 'M5 12h14']} color="#fff" w={13} />
                Nueva Plantilla
              </button>
            </div>

            <div className="catalogo-grid">
              {PLANTILLAS.map(p => (
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
                    <span style={{ fontSize: 10, color: '#b0aaa3', marginLeft: 2 }}>{p.vars} variables</span>
                  </div>
                  <div className="catalogo-card-footer">
                    <span style={{ fontSize: 10, color: '#b0aaa3' }}>Actualizado {p.updated}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#7c7670', fontWeight: 600 }}>{p.uses} usos</span>
                      <button className="catalogo-btn-use">Usar →</button>
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
              <div className="catalogo-search">
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
                <input type="text" placeholder="Buscar cláusula…" />
              </div>
              {CATS.map(cat => (
                <div key={cat}>
                  <div className="catalogo-clausulas-cat">{cat}</div>
                  {CLAUSES.filter(c => c.cat === cat).map(c => (
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
                <button className="catalogo-btn-primary">+ Nueva Cláusula</button>
              </div>
            </div>

            <div className="catalogo-clausulas-detail">
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
                  <button className="catalogo-btn-secondary">Editar</button>
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
                  "{selectedAlt.text}"
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
            </div>
          </div>
        )}

        {tab === 'productos' && (
          <div className="catalogo-productos">
            <div className="catalogo-toolbar">
              <div className="catalogo-search">
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="#b0aaa3" w={13} />
                <input type="text" placeholder="Buscar por SKU o nombre…" />
              </div>
              <button className="catalogo-btn-secondary">
                <Icon d="M4 6h16M7 12h10M10 18h4" color="#7c7670" w={13} />
                Categoría
              </button>
              <button className="catalogo-btn-primary">
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
              {PRODUCTS.map((p, i) => {
                const catColors = { 'Software': '#2563eb', 'Servicio': '#7c3aed', 'Soporte': '#0891b2', 'Formación': '#059669' };
                const discontinued = p.status === 'Descontinuado';
                return (
                  <div key={p.sku + i} className={`catalogo-productos-row ${discontinued ? 'discontinued' : ''}`}>
                    <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", color: '#2563eb', fontWeight: 600 }}>{p.sku}</span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: '#7c7670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</span>
                    <span style={{ color: catColors[p.cat], fontWeight: 600, fontSize: 10 }}>{p.cat}</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{p.price}</span>
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
    </div>
  );
}
