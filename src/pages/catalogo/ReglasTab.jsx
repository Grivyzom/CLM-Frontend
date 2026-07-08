import { Icon } from './ui';

// Reglas de negocio: datos estáticos de demo hasta que exista el endpoint.
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

// ─── Tab: Reglas de Negocio ──────────────────────────────────────────────────
export default function ReglasTab() {
  return (
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
  );
}
