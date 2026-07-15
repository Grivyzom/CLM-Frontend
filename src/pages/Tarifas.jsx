import React, { useState } from 'react';
import TopbarActions from '../components/layout/TopbarActions';
import './Tarifas.css';

/* ── Íconos SVG inline ── */
const CheckIcon = () => (
  <svg className="tar-feature-icon check" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DashIcon = () => (
  <svg className="tar-feature-icon dash" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronDown = ({ className }) => (
  <svg className={`tar-faq-chevron ${className || ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ── Datos de planes ── */
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Para equipos pequeños que comienzan con la gestión contractual.',
    icon: 'S',
    iconClass: 'starter',
    monthlyPrice: 0,
    annualPrice: 0,
    isCustom: false,
    cta: 'Empezar gratis',
    ctaClass: 'outline',
    featured: false,
    features: [
      { text: 'Hasta 20 contratos activos', included: true },
      { text: 'Hasta 5 clientes', included: true },
      { text: 'Catálogo básico de cláusulas', included: true },
      { text: 'Notificaciones de vencimiento', included: true },
      { text: 'Analytics avanzados', included: false },
      { text: 'Auditoría Legal IA', included: false },
      { text: 'Multi-tenant / workspace', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'La solución completa para despachos y empresas en crecimiento.',
    icon: 'P',
    iconClass: 'pro',
    monthlyPrice: 49,
    annualPrice: 39,
    isCustom: false,
    cta: 'Comenzar prueba gratis',
    ctaClass: 'primary-btn',
    featured: true,
    features: [
      { text: 'Contratos ilimitados', included: true },
      { text: 'Clientes ilimitados', included: true },
      { text: 'Catálogo completo + cláusulas alternativas', included: true },
      { text: 'Notificaciones inteligentes', included: true },
      { text: 'Analytics avanzados (BI)', included: true },
      { text: 'Auditoría Legal IA', included: true },
      { text: 'Multi-tenant / workspace', included: false },
      { text: 'Soporte prioritario (email + chat)', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Solución personalizada para grandes organizaciones y corporativos.',
    icon: 'E',
    iconClass: 'enterprise',
    monthlyPrice: null,
    annualPrice: null,
    isCustom: true,
    cta: 'Contactar ventas',
    ctaClass: 'ghost',
    featured: false,
    features: [
      { text: 'Todo lo de Pro', included: true },
      { text: 'Multi-tenant ilimitado', included: true },
      { text: 'SSO / integración AD', included: true },
      { text: 'API REST dedicada', included: true },
      { text: 'Analytics avanzados (BI)', included: true },
      { text: 'Auditoría Legal IA + reglas custom', included: true },
      { text: 'SLA garantizado 99.9%', included: true },
      { text: 'Soporte dedicado 24/7', included: true },
    ],
  },
];

/* ── Tabla de comparación ── */
const TABLE_GROUPS = [
  {
    group: 'Contratos & Catálogo',
    rows: [
      { label: 'Contratos activos', starter: '20', pro: 'Ilimitados', enterprise: 'Ilimitados' },
      { label: 'Cláusulas estándar', starter: true, pro: true, enterprise: true },
      { label: 'Cláusulas alternativas', starter: false, pro: true, enterprise: true },
      { label: 'Generación por IA', starter: false, pro: true, enterprise: true },
    ],
  },
  {
    group: 'Clientes & Workspace',
    rows: [
      { label: 'Clientes', starter: '5', pro: 'Ilimitados', enterprise: 'Ilimitados' },
      { label: 'Multi-tenant / workspace', starter: false, pro: false, enterprise: true },
      { label: 'Roles y permisos personalizados', starter: false, pro: true, enterprise: true },
    ],
  },
  {
    group: 'Analítica & Auditoría',
    rows: [
      { label: 'Dashboard básico', starter: true, pro: true, enterprise: true },
      { label: 'Analytics BI avanzado', starter: false, pro: true, enterprise: true },
      { label: 'Auditoría Legal IA', starter: false, pro: true, enterprise: true },
      { label: 'Reglas de auditoría custom', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    group: 'Soporte & Integración',
    rows: [
      { label: 'Soporte por email', starter: true, pro: true, enterprise: true },
      { label: 'Chat en vivo', starter: false, pro: true, enterprise: true },
      { label: 'Soporte dedicado 24/7', starter: false, pro: false, enterprise: true },
      { label: 'API REST & webhooks', starter: false, pro: false, enterprise: true },
      { label: 'SSO / Active Directory', starter: false, pro: false, enterprise: true },
    ],
  },
];

/* ── Preguntas frecuentes ── */
const FAQS = [
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí. Puedes hacer upgrade o downgrade desde Ajustes → Plan. Los cambios de upgrade aplican de inmediato y el saldo pro-rata se ajusta en tu próxima factura.',
  },
  {
    q: '¿Qué ocurre cuando termina el período de prueba?',
    a: 'Al finalizar los 14 días de prueba tu cuenta pasa automáticamente al plan Starter gratuito, sin cargo. Solo necesitas ingresar datos de pago si decides actualizar a Pro.',
  },
  {
    q: '¿Cuáles son los métodos de pago aceptados?',
    a: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, Amex) y transferencia bancaria para planes anuales Enterprise.',
  },
  {
    q: '¿El plan anual incluye descuento?',
    a: 'Sí. Al pagar anualmente obtienes el equivalente a 2 meses gratis (~20% de descuento). El cobro se realiza de forma única al inicio del período.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Todos los datos se almacenan cifrados en reposo (AES-256) y en tránsito (TLS 1.3). Para planes Enterprise ofrecemos acuerdos de procesamiento de datos (DPA) y opciones de residencia geográfica.',
  },
];

/* ── Helpers ── */
function TableCell({ value }) {
  if (value === true) {
    return (
      <span className="tar-check-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="tar-dash-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
    );
  }
  return <span className={`tar-table-chip${value === 'Ilimitados' ? ' primary' : ''}`}>{value}</span>;
}

const TODAY = new Date().toLocaleDateString('es-CL', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});

export default function Tarifas() {
  const [isAnual, setIsAnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="tar-container">
      {/* ══ Topbar ══ */}
      <div className="tar-header">
        <div>
          <p className="tar-header-label">CLM‑Kyo</p>
          <h1 className="tar-header-title">Tarifas</h1>
        </div>
        <div className="topbar-right-group">
          <span className="tar-header-date">{TODAY}</span>
          <TopbarActions />
        </div>
      </div>

      <div className="tar-content">
        {/* ══ Intro ══ */}
        <div className="tar-intro">
          <div className="tar-intro-eyebrow">
            <span className="tar-intro-dot" />
            Planes y Precios
          </div>
          <h2 className="tar-intro-title">El plan adecuado para cada etapa</h2>
          <p className="tar-intro-desc">
            Desde equipos que recién empiezan hasta grandes corporativos. Sin contratos ocultos, sin sorpresas.
          </p>

          {/* Toggle billing */}
          <div className="tar-toggle-wrap" style={{ marginTop: 18 }}>
            <span className={`tar-toggle-label${!isAnual ? ' active' : ''}`}>Mensual</span>
            <button
              className={`tar-toggle-pill${isAnual ? ' anual' : ''}`}
              onClick={() => setIsAnual(v => !v)}
              aria-label="Cambiar ciclo de facturación"
              id="tar-billing-toggle"
            />
            <span className={`tar-toggle-label${isAnual ? ' active' : ''}`}>Anual</span>
            {isAnual && <span className="tar-toggle-badge">Ahorra 20%</span>}
          </div>
        </div>

        {/* ══ Plan cards ══ */}
        <div className="tar-plans-grid">
          {PLANS.map((plan) => {
            const price = isAnual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`tar-plan-card${plan.featured ? ' featured' : ''}`}
                id={`tar-plan-${plan.id}`}
              >
                {plan.featured && (
                  <div className="tar-featured-badge">Más popular</div>
                )}

                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div className={`tar-plan-icon ${plan.iconClass}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {plan.id === 'starter' && (
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        )}
                        {plan.id === 'pro' && (
                          <>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </>
                        )}
                        {plan.id === 'enterprise' && (
                          <>
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </>
                        )}
                      </svg>
                    </div>
                    <p className="tar-plan-name">{plan.name}</p>
                  </div>
                  <p className="tar-plan-tagline">{plan.tagline}</p>
                </div>

                {/* Pricing */}
                <div className="tar-plan-pricing">
                  {plan.isCustom ? (
                    <div className="tar-plan-price-row">
                      <span className={`tar-plan-amount custom-price`}>A medida</span>
                    </div>
                  ) : (
                    <>
                      <div className="tar-plan-price-row">
                        <span className="tar-plan-currency">USD</span>
                        <span className="tar-plan-amount">{price === 0 ? '0' : price}</span>
                        <span className="tar-plan-period">/mes</span>
                      </div>
                      {isAnual && price > 0 && (
                        <p className="tar-plan-annual-note">
                          Facturado anualmente — <strong>ahorra USD {(plan.monthlyPrice - price) * 12}/año</strong>
                        </p>
                      )}
                      {price === 0 && (
                        <p className="tar-plan-annual-note" style={{ color: 'var(--text-muted)' }}>
                          Siempre gratis, sin tarjeta de crédito
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="tar-plan-features">
                  {plan.features.map((f, i) => (
                    <div key={i} className="tar-plan-feature">
                      {f.included ? <CheckIcon /> : <DashIcon />}
                      <span style={{ color: f.included ? 'var(--text-secondary)' : 'var(--text-faint)' }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button className={`tar-plan-cta ${plan.ctaClass}`} id={`tar-cta-${plan.id}`}>
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* ══ Comparison table ══ */}
        <div className="tar-comparison">
          <p className="tar-section-label">Comparativa completa</p>
          <h2 className="tar-section-title">¿Qué incluye cada plan?</h2>

          <div className="tar-table-wrap">
            <table className="tar-table" id="tar-comparison-table">
              <thead>
                <tr>
                  <th>Funcionalidad</th>
                  <th>Starter</th>
                  <th className="col-featured">Pro</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_GROUPS.map((grp) => (
                  <React.Fragment key={grp.group}>
                    <tr className="group-row">
                      <td colSpan={4}>{grp.group}</td>
                    </tr>
                    {grp.rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td><TableCell value={row.starter} /></td>
                        <td className="col-featured"><TableCell value={row.pro} /></td>
                        <td><TableCell value={row.enterprise} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ FAQ ══ */}
        <div className="tar-faq">
          <p className="tar-section-label">Preguntas frecuentes</p>
          <h2 className="tar-section-title">Todo lo que necesitas saber</h2>

          <div className="tar-faq-list" id="tar-faq-list">
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`tar-faq-item${isOpen ? ' open' : ''}`}>
                  <button
                    className="tar-faq-q"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    id={`tar-faq-${i}`}
                    aria-expanded={isOpen}
                  >
                    {item.q}
                    <ChevronDown />
                  </button>
                  {isOpen && <div className="tar-faq-a">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ CTA Banner ══ */}
        <div className="tar-cta-banner" id="tar-cta-banner">
          <div className="tar-cta-text">
            <h3>¿Listo para empezar?</h3>
            <p>Prueba Pro gratis 14 días. Sin tarjeta de crédito. Cancela cuando quieras.</p>
          </div>
          <div className="tar-cta-actions">
            <button className="tar-cta-btn solid" id="tar-banner-start">Empezar prueba gratis</button>
            <button className="tar-cta-btn bordered" id="tar-banner-contact">Hablar con ventas</button>
          </div>
        </div>
      </div>
    </div>
  );
}
