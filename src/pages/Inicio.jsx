import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play } from 'lucide-react';
import './Inicio.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const NEWS_DATA = [
  {
    badgeLabel: 'NUEVO',
    badgeClass: 'nuevo',
    date: '02 JUL 2026',
    title: 'Generación de contratos por cláusulas',
    description: 'Arma contratos combinando bloques legales predefinidos y validados por nuestro equipo jurídico.',
  },
  {
    badgeLabel: 'BETA',
    badgeClass: 'beta',
    date: '24 JUN 2026',
    title: 'Nuevo panel de Análisis BI',
    description: 'Un panel de inteligencia de negocio pensado para clientes expertos: tendencias, riesgos y valor de cartera.',
  },
  {
    badgeLabel: 'MEJORA',
    badgeClass: 'mejora',
    date: '11 JUN 2026',
    title: 'Modo claro / oscuro',
    description: 'Toda la plataforma ahora se adapta a tu preferencia de tema, con la misma calidez de siempre.',
  },
];

const FEATURES = [
  { title: 'Redacción por cláusulas', desc: 'Arma contratos combinando bloques predefinidos y validados.' },
  { title: 'Análisis en tiempo real', desc: 'Panel BI para seguir el estado y valor de tu cartera de contratos.' },
  { title: 'Firma y seguimiento', desc: 'Notificaciones automáticas de vencimientos y renovaciones.' },
];

const PIPELINE = [
  { label: 'BORRADOR', width: 92, active: true, count: 1 },
  { label: 'REVISIÓN', width: 4, active: false, count: 0 },
  { label: 'APROBADO', width: 4, active: false, count: 0 },
  { label: 'P. FIRMA', width: 4, active: false, count: 0 },
  { label: 'ACTIVO', width: 4, active: false, count: 0 },
];

const MRR_MONTHS = ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];

const MOCK_DATE = new Date().toLocaleDateString('es-CL', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});

export default function Inicio() {
  const pageRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.in-nav', { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, clearProps: 'transform,opacity' })
      .fromTo('.in-hero-copy', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, clearProps: 'transform,opacity' }, '-=0.2')
      .fromTo('.in-hero-visual', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, clearProps: 'transform,opacity' }, '-=0.35');

    gsap.utils.toArray('.in-reveal', pageRef.current).forEach((el) => {
      gsap.fromTo(
        el,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    });
  }, { scope: pageRef });

  return (
    <div className="in-page" ref={pageRef}>
      {/* ══════════ NAV ══════════ */}
      <header className={`in-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="in-nav-inner">
          <a href="#" className="in-brand">
            <div className="in-brand-mark">CK</div>
            <div>
              <p className="in-brand-label">Gestión de contratos</p>
              <p className="in-brand-name">CLM‑Kyo</p>
            </div>
          </a>

          <nav className="in-nav-pill">
            <a href="#funcionamiento" className="in-nav-link">Funcionamiento</a>
            <a href="#noticias" className="in-nav-link">Noticias</a>
            <a href="#equipo" className="in-nav-link">Equipo</a>
          </nav>

          <div className="in-nav-right">
            <span className="in-nav-version">
              <span className="in-dot success" />
              v1.0.4
            </span>
            <Link to="/login" className="in-nav-cta">Iniciar sesión →</Link>
          </div>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="in-hero">
        {/* Fondo SVG: grid + trayectorias animadas del ciclo de contrato */}
        <svg className="in-hero-bg" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="in-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeOpacity="0.045" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1440" height="700" fill="url(#in-grid)" />
          <path className="in-bg-draw" d="M -40 560 C 240 500, 420 610, 720 540 S 1220 430, 1490 500" fill="none" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="2" strokeDasharray="900" />
          <path className="in-bg-dash" d="M -40 620 C 300 570, 520 660, 840 600 S 1260 520, 1490 570" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle className="in-bg-pulse" cx="240" cy="120" r="3.5" fill="var(--primary)" fillOpacity="0.35" />
          <circle className="in-bg-pulse d2" cx="1180" cy="150" r="3" fill="var(--success)" fillOpacity="0.4" />
          <circle className="in-bg-pulse d3" cx="1330" cy="330" r="2.5" fill="var(--warning)" fillOpacity="0.35" />
        </svg>

        <div className="in-hero-grid">
          <div className="in-hero-copy">
            <div className="in-hero-badge">
              <span className="in-dot primary" />
              GESTIÓN DE CONTRATOS · IA INTEGRADA
            </div>

            <h1 className="in-hero-title">Bienvenido seas a<br />CLM‑Kyo</h1>

            <p className="in-hero-desc">
              La plataforma que automatiza el ciclo de vida completo de tus contratos: redacción por cláusulas, seguimiento, análisis y firma — todo en un solo lugar.
            </p>

            <div className="in-hero-actions">
              <a href="#funcionamiento" className="in-btn-primary">Ver cómo funciona ↓</a>
              <Link to="/login" className="in-btn-ghost">Iniciar sesión</Link>
            </div>
          </div>

          {/* Mockup fiel del dashboard "Vista General" */}
          <div className="in-hero-visual">
            <div className="in-mock">
              <div className="in-mock-topbar">
                <div>
                  <p className="in-mock-eyebrow">GESTIÓN DE CONTRATOS</p>
                  <p className="in-mock-title">Vista General</p>
                </div>
                <p className="in-mock-date">{MOCK_DATE}</p>
              </div>

              <div className="in-mock-kpis">
                <div className="in-mock-kpi">
                  <p className="in-mock-kpi-label">MRR</p>
                  <p className="in-mock-kpi-value">$500</p>
                  <p className="in-mock-kpi-delta up">↑ +100% vs mes ant.</p>
                </div>
                <div className="in-mock-kpi">
                  <p className="in-mock-kpi-label">CONTRATOS</p>
                  <p className="in-mock-kpi-value">1</p>
                  <p className="in-mock-kpi-delta up">+1 este mes</p>
                </div>
                <div className="in-mock-kpi">
                  <p className="in-mock-kpi-label">CLIENTES</p>
                  <p className="in-mock-kpi-value">1</p>
                  <p className="in-mock-kpi-delta up">+3 nuevos</p>
                </div>
                <div className="in-mock-kpi">
                  <p className="in-mock-kpi-label">REQ. ACCIÓN</p>
                  <p className="in-mock-kpi-value ok">0</p>
                  <p className="in-mock-kpi-delta muted">mora · gracia</p>
                </div>
              </div>

              <div className="in-mock-body">
                <div className="in-mock-card">
                  <p className="in-mock-eyebrow">CICLO DE VIDA</p>
                  <p className="in-mock-card-title">Pipeline por etapa</p>
                  <div className="in-mock-pipeline">
                    {PIPELINE.map((row, i) => (
                      <div key={row.label} className="in-mock-pipe-row">
                        <span className="in-mock-pipe-label">{row.label}</span>
                        <div className="in-mock-pipe-track">
                          <div
                            className={`in-mock-pipe-fill${row.active ? ' active' : ''}`}
                            style={{ width: `${row.width}%`, animationDelay: `${0.4 + i * 0.1}s` }}
                          />
                        </div>
                        <span className={`in-mock-pipe-count${row.active ? ' active' : ''}`}>{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="in-mock-card in-mock-chart">
                  <div className="in-mock-chart-head">
                    <div>
                      <p className="in-mock-eyebrow">INGRESOS RECURRENTES</p>
                      <p className="in-mock-card-title">MRR últimos 6 meses</p>
                    </div>
                    <span className="in-mock-chart-delta">↑ +100%</span>
                  </div>
                  <div className="in-mock-bars">
                    {MRR_MONTHS.map((m, i) => (
                      <div
                        key={m}
                        className={`in-mock-bar${i === MRR_MONTHS.length - 1 ? ' active' : ''}`}
                        style={i === MRR_MONTHS.length - 1 ? { height: '88%' } : { height: '6%' }}
                      />
                    ))}
                  </div>
                  <div className="in-mock-bar-labels">
                    {MRR_MONTHS.map((m) => <span key={m}>{m}</span>)}
                  </div>
                </div>
              </div>

              <div className="in-mock-statusbar">
                <span className="in-mock-status-item">
                  <span className="in-dot success sm" />
                  DB Operativo
                </span>
                <span className="in-mock-status-faint">LATENCIA 27 ms</span>
                <span className="in-mock-status-faint">TZ UTC-4</span>
                <span className="in-mock-status-faint end">BUILD v1.0.4-prod</span>
              </div>
            </div>

            <div className="in-float-chip success">
              <span className="in-float-ring">
                <span className="in-float-ring-core" />
                <span className="in-float-ring-pulse" />
              </span>
              <span className="in-float-chip-label">Contrato firmado</span>
            </div>

            <div className="in-float-chip warning">IA analizando cláusula...</div>
          </div>
        </div>
      </section>

      {/* ══════════ FUNCIONAMIENTO ══════════ */}
      <section id="funcionamiento" className="in-funcionamiento in-reveal">
        <div className="in-section-inner">
          <div className="in-section-head">
            <p className="in-eyebrow">Cómo funciona</p>
            <h2 className="in-section-title">Míralo en acción</h2>
            <p className="in-section-desc">De la redacción a la firma, sin salir de la plataforma.</p>
          </div>

          <div className="in-demo-window">
            <div className="in-demo-titlebar">
              <span className="in-demo-dot danger" />
              <span className="in-demo-dot warning" />
              <span className="in-demo-dot success" />
              <span className="in-demo-url">app.clmkyo.com/dashboard</span>
            </div>
            <div className="in-demo-body">
              <Play size={44} strokeWidth={1.4} style={{ opacity: 0.35 }} />
              <p>Video demostrativo próximamente</p>
            </div>
          </div>

          <div className="in-feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="in-feature">
                <p className="in-feature-title">{f.title}</p>
                <p className="in-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ NOTICIAS — changelog timeline ══════════ */}
      <section id="noticias" className="in-noticias in-reveal">
        <div className="in-news-wrap">
          <div className="in-news-grid">
            <div className="in-news-aside">
              <p className="in-eyebrow">Últimas noticias</p>
              <h2 className="in-news-heading">CLM‑Kyo sigue creciendo</h2>
              <p className="in-news-lead">Cada versión suma capacidades reales. Este es el registro de lo más reciente.</p>
              <span className="in-news-version">
                <span className="in-dot success" />
                v1.0.4‑prod · en desarrollo activo
              </span>
            </div>

            <div className="in-timeline">
              <div className="in-timeline-line" />
              {NEWS_DATA.map((item) => (
                <div key={item.title} className="in-timeline-item">
                  <span className="in-timeline-node"><span /></span>
                  <div className="in-timeline-meta">
                    <span className={`in-news-badge ${item.badgeClass}`}>{item.badgeLabel}</span>
                    <span className="in-news-date">{item.date}</span>
                  </div>
                  <div className="in-news-card">
                    <h3 className="in-news-title">{item.title}</h3>
                    <p className="in-news-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ EQUIPO ══════════ */}
      <footer id="equipo" className="in-footer in-reveal">
        <div className="in-footer-inner">
          <p className="in-eyebrow">Quién lo construye</p>
          <h2 className="in-footer-title">El equipo detrás de CLM‑Kyo</h2>

          <div className="in-team">
            <div className="in-team-avatar-wrap">
              <span className="in-team-orbit" />
              <div className="in-team-avatar">FF</div>
            </div>
            <div>
              <p className="in-team-name">Francisco Fuentelba</p>
              <p className="in-team-role">Developer</p>
            </div>
          </div>

          <p className="in-footer-copy">© 2026 Grivyzom — hecho con dedicación, una línea de código a la vez.</p>
        </div>
      </footer>
    </div>
  );
}
