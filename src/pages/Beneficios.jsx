import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Gift, Star, Award, HeadphonesIcon, TrendingUp, BookOpen, ShieldCheck, Zap } from 'lucide-react';
import TopbarActions from '../components/layout/TopbarActions';
import SEO from '../components/SEO';
import './Membresias.css';
import { useAuth } from '../contexts/AuthContext';

gsap.registerPlugin(useGSAP);

export default function Beneficios() {
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
  }, { scope: containerRef });

  return (
    <div className="page-container" ref={containerRef}>
      <SEO title="Beneficios | KyoCLM" />
      
      <header className="page-header mb-anim">
        <div>
          <h1 className="page-title">Beneficios de Membresía</h1>
          <p className="page-description">Explora y gestiona los beneficios exclusivos asociados a tu plan <strong>{user?.tenant?.plan || 'Empresarial'}</strong>.</p>
        </div>
        <TopbarActions />
      </header>

      <div className="page-content">
        <h2 className="mb-section-title mb-anim">
          <Star size={20} className="text-warning-vivid" /> Servicios Incluidos
        </h2>
        
        <div className="mb-grid mb-anim">
          <div className="mb-benefit-card">
            <div className="mb-benefit-icon-wrapper mb-icon-blue">
              <ShieldCheck size={24} />
            </div>
            <div className="mb-benefit-content">
              <h3>Auditoría Legal Automatizada</h3>
              <p>Tu plan incluye detección automática de riesgos y desviaciones en cláusulas estándar en todos los contratos nuevos.</p>
            </div>
          </div>

          <div className="mb-benefit-card">
            <div className="mb-benefit-icon-wrapper mb-icon-green">
              <Award size={24} />
            </div>
            <div className="mb-benefit-content">
              <h3>Firmas Electrónicas Premium</h3>
              <p>Cuentas con 50 firmas electrónicas certificadas por mes sin costo adicional, válidas legalmente en todo el país.</p>
            </div>
          </div>

          <div className="mb-benefit-card">
            <div className="mb-benefit-icon-wrapper mb-icon-amber">
              <HeadphonesIcon size={24} />
            </div>
            <div className="mb-benefit-content">
              <h3>Soporte Prioritario Nivel 2</h3>
              <p>Tiempo de respuesta garantizado (SLA) menor a 4 horas laborables para cualquier incidencia técnica o funcional.</p>
            </div>
          </div>
        </div>

        <h2 className="mb-section-title mb-anim">
          <Gift size={20} className="text-rose" /> Extras y Descuentos
        </h2>
        
        <div className="mb-grid mb-anim">
          <div className="mb-benefit-card">
            <div className="mb-benefit-icon-wrapper mb-icon-purple">
              <TrendingUp size={24} />
            </div>
            <div className="mb-benefit-content">
              <h3>Descuento en Integraciones</h3>
              <p>20% de descuento en el costo de implementación de integraciones a medida vía API con tus sistemas (ERP, CRM).</p>
            </div>
          </div>

          <div className="mb-benefit-card">
            <div className="mb-benefit-icon-wrapper mb-icon-rose">
              <BookOpen size={24} />
            </div>
            <div className="mb-benefit-content">
              <h3>Capacitación Continua</h3>
              <p>Acceso gratuito a webinars mensuales y sesiones de capacitación 1-a-1 trimestrales para tu equipo legal.</p>
            </div>
          </div>

          <div className="mb-benefit-card">
            <div className="mb-benefit-icon-wrapper mb-icon-blue">
              <Zap size={24} />
            </div>
            <div className="mb-benefit-content">
              <h3>Acceso Anticipado (Beta)</h3>
              <p>Eres el primero en probar nuestras nuevas funciones potenciadas por Inteligencia Artificial antes de su lanzamiento oficial.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
