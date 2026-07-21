import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { CreditCard, CheckCircle2, Zap, Shield, Crown, Building2 } from 'lucide-react';
import TopbarActions from '../components/layout/TopbarActions';
import SEO from '../components/SEO';
import './Membresias.css';
import { useAuth } from '../contexts/AuthContext';

gsap.registerPlugin(useGSAP);

export default function Membresias() {
  const containerRef = useRef(null);
  const { user } = useAuth();

  useGSAP(() => {
    gsap.from('.mb-anim', {
      y: 20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.1,
      ease: 'power2.out',
    });
    
    gsap.from('.mb-usage-fill', {
      width: 0,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.3
    });
  }, { scope: containerRef });

  return (
    <div className="page-container" ref={containerRef}>
      <SEO title="Membresías | KyoCLM" />
      
      <header className="page-header mb-anim">
        <div>
          <h1 className="page-title">Membresías y Planes</h1>
          <p className="page-description">Administra tu suscripción, métodos de pago y límites de uso en KyoCLM.</p>
        </div>
        <TopbarActions />
      </header>

      <div className="page-content">
        {/* Banner de plan actual */}
        <div className="mb-current-plan-banner mb-anim">
          <div className="mb-current-plan-info">
            <h2>Plan {user?.tenant?.plan || 'Empresarial'}</h2>
            <p>Ciclo de facturación actual: 1 de Julio al 31 de Julio, 2026</p>
          </div>
          <button className="mb-current-plan-action">
            Gestionar facturación
          </button>
        </div>

        {/* Uso de la cuenta */}
        <h2 className="mb-section-title mb-anim">
          <Zap size={20} className="text-primary" /> Uso de recursos
        </h2>
        <div className="mb-grid mb-anim">
          <div className="mb-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Contratos Activos</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>124 / 500</span>
            </div>
            <div className="mb-usage-bar">
              <div className="mb-usage-fill" style={{ width: '25%' }}></div>
            </div>
            <div className="mb-usage-stats">
              <span>25% utilizado</span>
              <span>Renovación el 1 de Agosto</span>
            </div>
          </div>
          
          <div className="mb-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Usuarios Registrados</span>
              <span style={{ fontWeight: 600, color: 'var(--warning-vivid)' }}>8 / 10</span>
            </div>
            <div className="mb-usage-bar">
              <div className="mb-usage-fill warning" style={{ width: '80%' }}></div>
            </div>
            <div className="mb-usage-stats">
              <span>80% utilizado</span>
              <span>2 asientos disponibles</span>
            </div>
          </div>
          
          <div className="mb-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Almacenamiento</span>
              <span style={{ fontWeight: 600, color: 'var(--success-deep)' }}>2.4 GB / 50 GB</span>
            </div>
            <div className="mb-usage-bar">
              <div className="mb-usage-fill" style={{ width: '5%', background: 'var(--success)' }}></div>
            </div>
            <div className="mb-usage-stats">
              <span>5% utilizado</span>
              <span>Espacio de sobra</span>
            </div>
          </div>
        </div>

        <h2 className="mb-section-title mb-anim">
          <CreditCard size={20} className="text-primary" /> Planes disponibles
        </h2>
        
        <div className="mb-grid mb-anim">
          {/* Plan Básico */}
          <div className="mb-plan-card">
            <div className="mb-plan-title">
              <Shield size={22} className="text-muted" /> Starter
            </div>
            <div className="mb-plan-price">
              $49.990<span>/mes</span>
            </div>
            <p className="mb-plan-desc">Ideal para pequeñas empresas y startups que necesitan gestión esencial.</p>
            
            <ul className="mb-feature-list">
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Hasta 50 contratos activos</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>3 usuarios administradores</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Plantillas básicas y editor estándar</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Soporte por correo electrónico</span>
              </li>
            </ul>
            
            <button className="mb-btn mb-btn-outline">Contactar a ventas</button>
          </div>

          {/* Plan Pro (Actual) */}
          <div className="mb-plan-card active">
            <div className="mb-plan-badge">Plan Actual</div>
            <div className="mb-plan-title" style={{ color: 'var(--primary-deep)' }}>
              <Building2 size={22} /> Empresarial
            </div>
            <div className="mb-plan-price">
              $129.990<span>/mes</span>
            </div>
            <p className="mb-plan-desc">Gestión integral del ciclo de vida para empresas en crecimiento.</p>
            
            <ul className="mb-feature-list">
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Hasta 500 contratos activos</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>10 usuarios administradores</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Auditoría legal y flujos de aprobación</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Firmas electrónicas integradas (50/mes)</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Soporte prioritario 24/7</span>
              </li>
            </ul>
            
            <button className="mb-btn mb-btn-outline" disabled style={{ opacity: 0.6 }}>Tu plan actual</button>
          </div>

          {/* Plan Enterprise */}
          <div className="mb-plan-card">
            <div className="mb-plan-title">
              <Crown size={22} style={{ color: 'var(--warning-vivid)' }} /> Corporativo
            </div>
            <div className="mb-plan-price">
              $349.990<span>/mes</span>
            </div>
            <p className="mb-plan-desc">Para grandes corporaciones con necesidades complejas y alto volumen.</p>
            
            <ul className="mb-feature-list">
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Contratos ilimitados</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Usuarios ilimitados</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Integración API y SSO (Single Sign-On)</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Analítica avanzada y reportes BI a medida</span>
              </li>
              <li className="mb-feature-item">
                <CheckCircle2 size={18} className="mb-feature-icon" />
                <span>Account Manager dedicado</span>
              </li>
            </ul>
            
            <button className="mb-btn mb-btn-primary">Mejorar plan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
