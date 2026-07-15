import { Icon } from './ui';

const CATEGORIA_META = {
  COBRE: { label: 'Cobre', color: 'var(--orange)', bg: 'var(--orange-tint)' },
  PLATA: { label: 'Plata', color: 'var(--text-muted)', bg: 'var(--neutral-200)' },
  PLATINO: { label: 'Platino', color: 'var(--cyan-deep)', bg: 'var(--cyan-tint)' },
  DIAMANTE: { label: 'Diamante', color: 'var(--indigo)', bg: 'var(--indigo-bg)' },
  OBSIDIANA: { label: 'Obsidiana', color: 'var(--violet-deep)', bg: 'var(--violet-tint)' },
};

const ESTADO_TENANT_PILL = {
  ACTIVO: 'ok',
  GRACIA: 'warn',
  SUSPENDIDO: 'danger',
};

const QUOTA_LABELS = {
  contratos: 'Contratos',
  clientes: 'Clientes',
  usuarios: 'Usuarios',
};

export default function MembresiaTab({ membresia }) {
  if (!membresia) return <p className="cw-empty">Sin información de membresía</p>;

  const meta = CATEGORIA_META[membresia.categoria] || { label: membresia.categoria, color: 'var(--text-muted)', bg: 'var(--neutral-200)' };
  const tenant = membresia.tenant || {};
  const quotas = membresia.quotas || {};

  return (
    <div className="ct-tab-resumen">
      <div className="ct-resumen-grid">
        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M12 2l3 6 6 .9-4.5 4.2 1 6.4L12 16.6 6.5 19.5l1-6.4L3 8.9 9 8z" color="var(--warning-bright)" w={14} />
            Plan de Suscripción
          </p>
          <div className="cw-plan-header">
            <span className="cw-plan-badge" style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
            <span className={`cw-pill ${ESTADO_TENANT_PILL[tenant.estado] || ''}`}>
              Cuenta {tenant.estado?.toLowerCase() || '—'}
            </span>
          </div>
          <div className="ct-resumen-dates">
            <div className="ct-date-row">
              <span className="ct-date-label">Cuenta (tenant)</span>
              <span className="ct-date-value">{tenant.razon_social || '—'}</span>
            </div>
          </div>
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d={['M20 6L9 17l-5-5']} color="var(--success-alt)" w={14} />
            Funciones Incluidas
          </p>
          {(membresia.features || []).length === 0 ? (
            <p className="cw-empty">Sin funciones registradas</p>
          ) : (
            <div className="cw-features">
              {membresia.features.map((f) => <span className="cw-feature" key={f}>{f}</span>)}
            </div>
          )}
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d={['M12 20V10', 'M18 20V4', 'M6 20v-4']} color="var(--cyan)" w={14} />
            Cuotas del Plan
          </p>
          {Object.keys(quotas).length === 0 ? (
            <p className="cw-empty">Sin cuotas definidas</p>
          ) : Object.entries(quotas).map(([recurso, limite]) => (
            <div className="cw-quota" key={recurso}>
              <div className="cw-quota-head">
                <span>{QUOTA_LABELS[recurso] || recurso}</span>
                <strong>{limite === null ? 'Ilimitado' : `Límite ${limite}`}</strong>
              </div>
              <div className="cw-quota-bar">
                <div
                  className="cw-quota-fill"
                  style={{ width: limite === null ? '100%' : '0%', opacity: limite === null ? 0.35 : 1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
