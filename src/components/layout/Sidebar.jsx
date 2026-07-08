import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from '../../contexts/AuthContext';
import { apiLogout } from '../../api';
import './Sidebar.css';

gsap.registerPlugin(useGSAP);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONTEXTS = ['Administración Global', 'SoftTrack Pro v3', 'ContaLite v2.1'];

const NAV = [
  { id: 'dashboard', path: '/', label: 'Dashboard', paths: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'] },
  { id: 'clientes', path: '/clientes', label: 'Clientes', paths: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'], circles: [{ cx: 9, cy: 7, r: 4 }] },
  { id: 'catalogo', path: '/catalogo', label: 'Catálogo', paths: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z','M3.27 6.96 12 12.01l8.73-5.05','M12 22.08V12'] },
  { id: 'contratos', path: '/contratos', label: 'Contratos', paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8'], badge: { n: 3, type: 'warning' } },
  { id: 'auditoria', path: '/auditoria', label: 'Auditoría Legal', paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z','M9 12l2 2 4-4'], badge: { n: 12, type: 'danger' } },
  { id: 'analytics', path: '/analytics', label: 'Analytics (BI)', paths: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'] },
];

const Icon = ({ paths = [], circles = [], className = '' }) => (
  <svg 
    className={`sb-icon ${className}`} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.8" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {paths.map((d, i) => <path key={`p-${i}`} d={d} />)}
    {circles.map((c, i) => <circle key={`c-${i}`} cx={c.cx} cy={c.cy} r={c.r} />)}
  </svg>
);

export default function Sidebar() {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('clm_sidebar_preference');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isHovered, setIsHovered] = useState(false);
  
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [ctxIndex, setCtxIndex] = useState(0);
  const [dropOpen, setDropOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const sidebarRef = useRef(null);

  const isExpanded = isPinned || isHovered;
  const collapsed = !isExpanded;

  // Entrada inicial: stagger sutil de los items de navegación
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      '.sb-nav-item',
      { autoAlpha: 0, x: -10 },
      { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.1, clearProps: 'all' }
    );
  }, { scope: sidebarRef });

  // Al expandir: los textos entran con un leve desplazamiento en cascada
  useGSAP(() => {
    if (!isExpanded || prefersReducedMotion()) return;
    gsap.fromTo(
      '.sb-logo-text, .sb-context-info, .sb-nav-label, .sb-user-info, .sb-section-title',
      { autoAlpha: 0, x: -8 },
      { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.02, ease: 'power2.out', clearProps: 'all' }
    );
  }, { dependencies: [isExpanded], scope: sidebarRef, revertOnUpdate: true });

  // Apertura del selector de contexto
  useGSAP(() => {
    if (!dropOpen || collapsed || prefersReducedMotion()) return;
    gsap.fromTo(
      '.sb-context-wrapper .sb-context-dropdown',
      { autoAlpha: 0, y: -6, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out', clearProps: 'all' }
    );
    gsap.fromTo(
      '.sb-context-wrapper .sb-dropdown-item',
      { autoAlpha: 0, x: -6 },
      { autoAlpha: 1, x: 0, duration: 0.2, stagger: 0.03, ease: 'power2.out', delay: 0.05, clearProps: 'all' }
    );
  }, { dependencies: [dropOpen], scope: sidebarRef });

  // Apertura del menú de usuario (anclado abajo, sube)
  useGSAP(() => {
    if (!userMenuOpen || collapsed || prefersReducedMotion()) return;
    gsap.fromTo(
      '.sb-user-dropdown',
      { autoAlpha: 0, y: 6, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out', clearProps: 'all' }
    );
  }, { dependencies: [userMenuOpen], scope: sidebarRef });

  // Cambio de ruta: pop sutil del ícono activo
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      '.sb-nav-item.active .sb-icon',
      { scale: 0.8, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.4, ease: 'back.out(2.5)', clearProps: 'all' }
    );
  }, { dependencies: [location.pathname], scope: sidebarRef });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsPinned(false);
      } else {
        const saved = localStorage.getItem('clm_sidebar_preference');
        if (saved !== null) {
          setIsPinned(JSON.parse(saved));
        }
      }
    };
    
    handleResize(); 
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSidebarClick = () => {
    if (!isPinned && window.innerWidth >= 1024) {
      setIsPinned(true);
      localStorage.setItem('clm_sidebar_preference', JSON.stringify(true));
    }
  };

  const togglePin = (e) => {
    e.stopPropagation();
    const newValue = !isPinned;
    setIsPinned(newValue);
    if (window.innerWidth >= 1024) {
      localStorage.setItem('clm_sidebar_preference', JSON.stringify(newValue));
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setDropOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (_) {
      // Si el backend no responde, igual cerramos sesión en el cliente
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <>
      {/* Hitbox invisible en el borde de la pantalla */}
      {!isPinned && (
        <div 
          className="sb-hitbox"
          onMouseEnter={() => setIsHovered(true)}
        />
      )}
      <div
        ref={sidebarRef}
        className={`sidebar-proto ${collapsed ? 'collapsed' : 'expanded'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSidebarClick}
      >
      {/* Header / Selector de Contexto */}
      <div className="sb-header">
        <div className="sb-logo-section">
          <div className="sb-logo-icon">
            <span>E</span>
          </div>
          <div className="sb-logo-text">
            <div className="sb-logo-title">Enfoque</div>
            <div className="sb-logo-subtitle">Platform</div>
          </div>
          
          <button
            onClick={togglePin}
            className={`sb-pin-btn ${isPinned ? 'pinned' : ''}`}
            title={isPinned ? "Desanclar sidebar" : "Anclar sidebar"}
          >
            {isPinned ? (
              <PinOff size={16} strokeWidth={2} />
            ) : (
              <Pin size={16} strokeWidth={2} />
            )}
          </button>
        </div>

        {user && (
          <div className="sb-context-wrapper" ref={dropdownRef}>
            <button
              onClick={() => setDropOpen(!dropOpen)}
              className={`sb-context-btn ${dropOpen ? 'open' : ''}`}
              title={CONTEXTS[ctxIndex]}
              aria-haspopup="listbox"
              aria-expanded={dropOpen}
              aria-label="Seleccionar contexto activo"
            >
              <div className="sb-context-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </div>
              <div className="sb-context-info">
                <div className="sb-context-label">Vista activa</div>
                <div className="sb-context-value">{CONTEXTS[ctxIndex]}</div>
              </div>
              <svg className="sb-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {dropOpen && (
              <div 
                className={`sb-context-dropdown ${collapsed ? 'dropdown-collapsed' : ''}`}
                role="listbox"
              >
                {CONTEXTS.map((c, i) => (
                  <button
                    key={i}
                    role="option"
                    aria-selected={i === ctxIndex}
                    onClick={() => { setCtxIndex(i); setDropOpen(false); }}
                    className={`sb-dropdown-item ${i === ctxIndex ? 'active' : ''}`}
                    title={c}
                  >
                    {collapsed ? c.charAt(0) : c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sb-section-title">
        <span>Módulos</span>
      </div>

      {/* Navegación Principal */}
      <nav className="sb-nav-container" aria-label="Menú principal">
        {NAV.map((item) => {
          if (!user && item.id !== 'dashboard') return null;

          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`sb-nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="sb-icon-container">
                <Icon paths={item.paths} circles={item.circles} />
                {user && item.badge && (
                  <span className={`sb-badge-floating sb-badge-${item.badge.type} ${isActive ? 'badge-active' : ''}`}>
                    {item.badge.n}
                  </span>
                )}
              </div>
              
              <span className="sb-nav-label">
                {item.label}
              </span>

              {user && item.badge && (
                <span className={`sb-badge sb-badge-${item.badge.type} ${isActive ? 'badge-active' : ''}`}>
                  {item.badge.n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Usuario y Colapsar */}
      <div className="sb-footer">
        {user ? (
          <div className="sb-user-wrapper" ref={userMenuRef} style={{ position: 'relative' }}>
            <div
              className={`sb-user-profile ${userMenuOpen ? 'open' : ''}`}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setUserMenuOpen(!userMenuOpen);
                }
              }}
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title="Ver opciones"
              style={{ cursor: 'pointer' }}
            >
              <div className="sb-avatar">
                {user.initials}
              </div>
              <div className="sb-user-info">
                <div className="sb-user-name">{user.name}</div>
                <div className="sb-user-role">{user.role}</div>
              </div>
            </div>

            {userMenuOpen && (
              <div className={`sb-context-dropdown sb-user-dropdown ${collapsed ? 'dropdown-collapsed' : ''}`}>
                <button
                  className="sb-dropdown-item"
                  onClick={() => { setUserMenuOpen(false); navigate('/ajustes'); }}
                >
                  <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 8, opacity: 0.7 }}>
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  {collapsed ? 'A' : 'Ajustes'}
                </button>
                <button
                  className="sb-dropdown-item"
                  onClick={() => { setUserMenuOpen(false); navigate('/faq'); }}
                >
                  <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 8, opacity: 0.7 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  {collapsed ? '?' : 'FAQ'}
                </button>
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }}></div>
                <button
                  className="sb-dropdown-item"
                  onClick={handleLogout}
                  style={{ color: 'var(--danger)' }}
                >
                  <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 8, opacity: 0.7 }}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  {collapsed ? 'S' : 'Cerrar Sesión'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="sb-login-btn" onClick={() => navigate('/login')} title="Iniciar Sesión">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span className="sb-login-label">Iniciar sesión</span>
          </button>
        )}
      </div>
    </div>
    </>
  );
}
