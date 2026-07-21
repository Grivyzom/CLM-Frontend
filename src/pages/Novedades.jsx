import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Sparkles, Zap, CheckCircle2, Star, Rocket, Shield } from 'lucide-react';
import TopbarActions from '../components/layout/TopbarActions';
import SEO from '../components/SEO';
import './Novedades.css';

gsap.registerPlugin(useGSAP);

export default function Novedades() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from('.nv-anim', {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.15,
      ease: 'back.out(1.2)',
    });
  }, { scope: containerRef });

  return (
    <div className="page-container" ref={containerRef}>
      <SEO title="Novedades | KyoCLM" />
      
      <header className="page-header nv-anim">
        <div>
          <h1 className="page-title">Novedades y Actualizaciones</h1>
          <p className="page-description">Descubre las últimas mejoras, funciones y correcciones de la plataforma.</p>
        </div>
        <TopbarActions />
      </header>

      <div className="page-content">
        <div className="nv-banner nv-anim">
          <div className="nv-banner-content">
            <h2>KyoCLM 2.0 ya está aquí</h2>
            <p>Hemos rediseñado por completo la experiencia de usuario y añadido Inteligencia Artificial para la revisión de contratos.</p>
          </div>
          <div className="nv-banner-icon">
            <Rocket size={40} color="white" />
          </div>
        </div>

        <div className="nv-timeline">
          {/* Release 2.0 */}
          <div className="nv-item nv-major nv-anim">
            <div className="nv-marker"></div>
            <span className="nv-date">20 de Julio, 2026</span>
            <div className="nv-card">
              <div className="nv-card-header">
                <h3 className="nv-title">Actualización Mayor: KyoCLM 2.0</h3>
                <span className="nv-version">v2.0.0</span>
              </div>
              <p className="nv-desc">
                Esta es la actualización más grande que hemos lanzado. Incluye una interfaz completamente renovada y herramientas avanzadas de automatización.
              </p>
              <ul className="nv-feature-list">
                <li className="nv-feature-item">
                  <Star size={18} className="nv-feature-icon" style={{color: 'var(--warning-vivid)'}} />
                  <div>
                    <span className="nv-badge nv-badge-new">Nuevo</span>
                    <strong>Auditoría Legal Automatizada (IA)</strong>: Detecta riesgos, cláusulas faltantes y desviaciones estándar automáticamente en segundos.
                  </div>
                </li>
                <li className="nv-feature-item">
                  <Sparkles size={18} className="nv-feature-icon" />
                  <div>
                    <span className="nv-badge nv-badge-new">Nuevo</span>
                    <strong>Diseño de Interfaz Premium</strong>: Un rediseño total de la plataforma con animaciones fluidas, paletas de color mejoradas y mejor accesibilidad.
                  </div>
                </li>
                <li className="nv-feature-item">
                  <Zap size={18} className="nv-feature-icon" />
                  <div>
                    <span className="nv-badge nv-badge-imp">Mejora</span>
                    <strong>Velocidad del Dashboard</strong>: El dashboard ahora carga un 40% más rápido gracias al nuevo sistema de caché optimizado.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Release 1.5.2 */}
          <div className="nv-item nv-anim">
            <div className="nv-marker"></div>
            <span className="nv-date">02 de Junio, 2026</span>
            <div className="nv-card">
              <div className="nv-card-header">
                <h3 className="nv-title">Mejoras de Seguridad y Firmas</h3>
                <span className="nv-version">v1.5.2</span>
              </div>
              <p className="nv-desc">
                Actualización de mantenimiento enfocada en la fiabilidad de las integraciones de firma electrónica y correcciones de seguridad.
              </p>
              <ul className="nv-feature-list">
                <li className="nv-feature-item">
                  <Shield size={18} className="nv-feature-icon" />
                  <div>
                    <span className="nv-badge nv-badge-imp">Mejora</span>
                    <strong>Autenticación de 2 Factores (2FA)</strong>: Ahora puedes forzar 2FA para todos los usuarios de tu organización (disponible en el plan Corporativo).
                  </div>
                </li>
                <li className="nv-feature-item">
                  <CheckCircle2 size={18} className="nv-feature-icon" style={{color: 'var(--success)'}} />
                  <div>
                    <span className="nv-badge nv-badge-fix">Fix</span>
                    <strong>Sincronización de Firmas</strong>: Se corrigió un error donde algunos contratos firmados externamente tardaban hasta 15 minutos en reflejarse.
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Release 1.5.0 */}
          <div className="nv-item nv-anim">
            <div className="nv-marker"></div>
            <span className="nv-date">15 de Mayo, 2026</span>
            <div className="nv-card">
              <div className="nv-card-header">
                <h3 className="nv-title">Editor de Cláusulas y Plantillas</h3>
                <span className="nv-version">v1.5.0</span>
              </div>
              <p className="nv-desc">
                Introducimos el nuevo sistema de biblioteca de cláusulas reutilizables para estandarizar tus contratos.
              </p>
              <ul className="nv-feature-list">
                <li className="nv-feature-item">
                  <Sparkles size={18} className="nv-feature-icon" />
                  <div>
                    <span className="nv-badge nv-badge-new">Nuevo</span>
                    <strong>Biblioteca de Cláusulas</strong>: Guarda tus cláusulas aprobadas y arrástralas a cualquier contrato en edición.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
