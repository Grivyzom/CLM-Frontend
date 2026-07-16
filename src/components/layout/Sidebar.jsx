import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveView } from '../../contexts/ActiveViewContext';
import { apiLogout, getClientes, getContratoStats, getAuditoria, getIncidencias, getIncidenciaStats } from '../../api';
import './Sidebar.css';

gsap.registerPlugin(useGSAP);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Etiqueta del modo global de la "Vista activa" (sin cliente seleccionado).
const GLOBAL_VIEW_LABEL = 'Administración Global';

// `feature` = clave de la matriz de planes (tenants/plans.py del backend).
// El sidebar oculta los módulos que el plan del tenant no incluye; el
// backend igual rechaza el acceso directo por URL (gating real).
const NAV = [
  { id: 'inicio', path: '/inicio', label: 'Inicio', paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'] },
  { id: 'dashboard', path: '/', label: 'Dashboard', feature: 'contratos', paths: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'] },
  { id: 'historial', path: '/historial', label: 'Historial', feature: 'contratos', paths: ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'] },
  { 
    id: 'membresias', 
    path: '/membresias', 
    label: 'Membresías', 
    feature: 'membresias', 
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
    subItems: [
      { id: 'beneficio', path: '/membresias/beneficio', label: 'Beneficio' }
    ]
  },
  { id: 'novedades', path: '/novedades', label: 'Novedades', feature: 'contratos', paths: ['M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4', 'M14 2v4a2 2 0 0 0 2 2h4', 'M3 15h6', 'M3 19h6'] },
  { id: 'tarifas', path: '/tarifas', label: 'Tarifas', feature: 'membresias', paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', 'M5 12h14', 'M12 5v14'] },
  { id: 'clientes', path: '/clientes', label: 'Clientes', feature: 'clientes', paths: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'], circles: [{ cx: 9, cy: 7, r: 4 }] },
  { id: 'catalogo', path: '/catalogo', label: 'Catálogo', feature: 'catalogo', paths: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z','M3.27 6.96 12 12.01l8.73-5.05','M12 22.08V12'] },
  { id: 'contratos', path: '/contratos', label: 'Contratos', feature: 'contratos', paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8'] },
  { 
    id: 'gestion', 
    path: '#', 
    label: 'Gestión', 
    paths: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'],
    subItems: [
      { id: 'auditoria', path: '/auditoria', label: 'Auditoría', feature: 'legal' },
      { id: 'reportes', path: '/reportes', label: 'Reporte', feature: 'incidencias' },
      { id: 'analytics', path: '/analytics', label: 'Analytics', feature: 'analytics' },
      { id: 'usuarios', path: '/usuarios', label: 'Usuarios' }
    ]
  },
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
  // Drawer móvil: abierto/cerrado vía botón de menú del topbar
  const [mobileOpen, setMobileOpen] = useState(false);

  const [contratosBadge, setContratosBadge] = useState(() => {
    const saved = localStorage.getItem('clm_contratos_badge');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [auditoriaBadge, setAuditoriaBadge] = useState(() => {
    const saved = localStorage.getItem('clm_auditoria_badge');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [incidenciasBadge, setIncidenciasBadge] = useState(() => {
    const saved = localStorage.getItem('clm_incidencias_badge');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  
  const { user, logout, hasFeature, canAccessClientes, isClienteExterno, isModerador } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Vista activa: Administración Global o un cliente puntual. La lista de
  // clientes se carga perezosamente la primera vez que se abre el selector.
  const { activeCliente, setClienteView, setGlobalView } = useActiveView();
  const [ctxClientes, setCtxClientes] = useState(null); // null = aún no cargado
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxSearch, setCtxSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});
  
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const sidebarRef = useRef(null);

  const isExpanded = isPinned || isHovered || mobileOpen;
  const collapsed = !isExpanded;

  // El botón hamburguesa del topbar (TopbarActions) emite este evento global
  useEffect(() => {
    const toggle = () => setMobileOpen(o => !o);
    window.addEventListener('clm:toggle-sidebar', toggle);
    return () => window.removeEventListener('clm:toggle-sidebar', toggle);
  }, []);

  // Cerrar drawer al navegar a otra ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Con drawer abierto: Escape cierra y se bloquea el scroll de fondo
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!user) return;
    // Los 3 bloques son independientes entre sí (badges distintos); antes se
    // esperaban en serie (3 round-trips seguidos), ahora corren en paralelo.
    const fetchBadge = async () => {
      const tasks = [];

      if (hasFeature('contratos') || isClienteExterno) {
        tasks.push((async () => {
          try {
            const stats = await getContratoStats();
            const count = stats.contratos_activos || 0;
            setContratosBadge(count);
            localStorage.setItem('clm_contratos_badge', count.toString());
          } catch (err) {}
        })());
      }

      if (hasFeature('legal') && !isClienteExterno) {
        tasks.push((async () => {
          try {
            const audData = await getAuditoria();
            const audCount = (audData.kpis?.pendingAudits || 0) + (audData.kpis?.highRiskContracts || 0);
            setAuditoriaBadge(audCount);
            localStorage.setItem('clm_auditoria_badge', audCount.toString());
          } catch (err) {}
        })());
      }

      if (hasFeature('incidencias') || isClienteExterno) {
        tasks.push((async () => {
          try {
            let count;
            if (isClienteExterno) {
              const [abiertas, enProgreso] = await Promise.all([
                getIncidencias({ estado: 'ABIERTO', page_size: 1 }),
                getIncidencias({ estado: 'EN_PROGRESO', page_size: 1 }),
              ]);
              count = (abiertas.count || 0) + (enProgreso.count || 0);
            } else {
              const incStats = await getIncidenciaStats();
              count = (incStats.abiertas || 0) + (incStats.en_progreso || 0);
            }
            setIncidenciasBadge(count);
            localStorage.setItem('clm_incidencias_badge', count.toString());
          } catch (err) {}
        })());
      }

      await Promise.all(tasks);
    };

    fetchBadge();
    const intervalId = setInterval(fetchBadge, 30000);
    return () => clearInterval(intervalId);
  }, [user, hasFeature, isClienteExterno]);

  // Carga de clientes para el selector de Vista activa (solo al abrirlo,
  // una sola vez). El ref evita re-disparos del efecto por sus propios
  // setState; si la petición falla se libera para reintentar al reabrir.
  const ctxFetchStartedRef = useRef(false);
  useEffect(() => {
    if (!dropOpen || ctxFetchStartedRef.current) return;
    ctxFetchStartedRef.current = true;
    setCtxLoading(true);
    getClientes({ page_size: 100, ordering: 'razon_social' })
      .then((res) => {
        setCtxClientes((res.results || []).map((c) => ({
          id: c.id,
          nombre: c.razon_social || c.nombre_comercial || `Cliente #${c.id}`,
        })));
      })
      .catch(() => {
        setCtxClientes(null);
        ctxFetchStartedRef.current = false;
      })
      .finally(() => setCtxLoading(false));
  }, [dropOpen]);

  const activeViewLabel = activeCliente?.nombre || GLOBAL_VIEW_LABEL;
  const ctxFiltered = (ctxClientes || []).filter((c) =>
    !ctxSearch.trim() || c.nombre.toLowerCase().includes(ctxSearch.trim().toLowerCase())
  );

  const selectGlobalView = () => {
    setGlobalView();
    setDropOpen(false);
    setCtxSearch('');
  };

  const selectClienteView = (cliente) => {
    setClienteView(cliente);
    setDropOpen(false);
    setCtxSearch('');
  };

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

  useEffect(() => {
    // Si navegamos y algún item con submenu está activo, lo abrimos automáticamente.
    const activeItem = NAV.find(item => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path)));
    if (activeItem && activeItem.subItems) {
      setOpenSubmenus(prev => ({ ...prev, [activeItem.id]: true }));
    } else {
      // Check in subItems too
      NAV.forEach(item => {
        if (item.subItems) {
          const activeSub = item.subItems.find(sub => sub.path === location.pathname || location.pathname.startsWith(sub.path));
          if (activeSub) {
            setOpenSubmenus(prev => ({ ...prev, [item.id]: true }));
          }
        }
      });
    }
  }, [location.pathname]);

  const checkVisibility = (item) => {
    if (!user && item.id !== 'inicio') return false;
    if (user && item.id === 'inicio') return false;

    if (user && isClienteExterno) {
      // El cliente externo solo puede ver Dashboard, Contratos, Membresias, Historial, Novedades, Tarifas, Reporte y Gestión
      if (!['dashboard', 'contratos', 'historial', 'membresias', 'novedades', 'tarifas', 'reportes', 'gestion'].includes(item.id) && item.id !== 'beneficio') return false;
    } else if (user) {
      // Usuarios normales/internos:
      if (['historial', 'novedades', 'membresias', 'tarifas'].includes(item.id)) return false;
      if (item.id === 'clientes' && !canAccessClientes) return false;
      if (item.id === 'tenants' && !user.isSuperadmin) return false;
      if (item.id === 'usuarios' && !(user.isSuperadmin || isModerador)) return false;
      if (item.id !== 'clientes' && item.id !== 'tenants' && item.feature && item.feature !== 'membresias' && !hasFeature(item.feature)) return false;
    }
    return true;
  };

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
      {mobileOpen && (
        <div
          className="sb-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        ref={sidebarRef}
        className={`sidebar-proto ${collapsed ? 'collapsed' : 'expanded'} ${mobileOpen ? 'mobile-open' : ''}`}
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

        {user && !isClienteExterno && canAccessClientes && (
          <div className="sb-context-wrapper" ref={dropdownRef}>
            <button
              onClick={() => setDropOpen(!dropOpen)}
              className={`sb-context-btn ${dropOpen ? 'open' : ''}`}
              title={activeViewLabel}
              aria-haspopup="listbox"
              aria-expanded={dropOpen}
              aria-label="Seleccionar vista activa"
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
                <div className="sb-context-value">{activeViewLabel}</div>
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
                <button
                  role="option"
                  aria-selected={!activeCliente}
                  onClick={selectGlobalView}
                  className={`sb-dropdown-item ${!activeCliente ? 'active' : ''}`}
                  title={GLOBAL_VIEW_LABEL}
                >
                  {collapsed ? GLOBAL_VIEW_LABEL.charAt(0) : GLOBAL_VIEW_LABEL}
                </button>

                {!collapsed && (ctxClientes?.length || 0) > 6 && (
                  <input
                    type="search"
                    className="sb-dropdown-search"
                    placeholder="Buscar cliente…"
                    value={ctxSearch}
                    onChange={(e) => setCtxSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Buscar cliente"
                  />
                )}

                <div className="sb-dropdown-list">
                  {ctxLoading && (
                    <div className="sb-dropdown-empty">Cargando clientes…</div>
                  )}
                  {!ctxLoading && ctxClientes !== null && ctxFiltered.length === 0 && (
                    <div className="sb-dropdown-empty">
                      {ctxSearch ? 'Sin coincidencias' : 'Sin clientes registrados'}
                    </div>
                  )}
                  {!ctxLoading && ctxFiltered.map((c) => (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={activeCliente?.id === c.id}
                      onClick={() => selectClienteView(c)}
                      className={`sb-dropdown-item ${activeCliente?.id === c.id ? 'active' : ''}`}
                      title={c.nombre}
                    >
                      {collapsed ? c.nombre.charAt(0).toUpperCase() : c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sb-section-title">
        <span>Módulos</span>
      </div>

      <nav className="sb-nav-container" aria-label="Menú principal">
        {NAV.map((item) => {
          if (!checkVisibility(item)) return null;

          let visibleSubItems = [];
          if (item.subItems) {
            visibleSubItems = item.subItems.filter(sub => checkVisibility(sub));
            if (visibleSubItems.length === 0 && item.id === 'gestion') return null;
          }

          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) || (visibleSubItems.some(sub => location.pathname.startsWith(sub.path)));
          const hasSub = visibleSubItems.length > 0;
          const isSubOpen = openSubmenus[item.id];

          let currentBadge = item.badge;
          if (item.id === 'contratos' && contratosBadge > 0) {
            currentBadge = { n: contratosBadge, type: 'warning' };
          } else if (item.id === 'gestion') {
            const sum = auditoriaBadge + incidenciasBadge;
            if (sum > 0) {
              currentBadge = { n: sum, type: 'warning' };
            }
          }

          return (
            <div key={item.id} className="sb-nav-item-wrapper">
              {hasSub ? (
                <div
                  className={`sb-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : ''}
                  onClick={() => {
                    setOpenSubmenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                    if (collapsed) {
                      handleSidebarClick();
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="sb-icon-container">
                    <Icon paths={item.paths} circles={item.circles} />
                    {user && currentBadge && (
                      <span className={`sb-badge-floating sb-badge-${currentBadge.type} ${isActive ? 'badge-active' : ''}`}>
                        {currentBadge.n}
                      </span>
                    )}
                  </div>
                  
                  <span className="sb-nav-label" style={{ flex: 1 }}>
                    {item.label}
                  </span>

                  {!collapsed && (
                    <svg className="sb-chevron" style={{ transform: isSubOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', width: 14, opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`sb-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : ''}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="sb-icon-container">
                    <Icon paths={item.paths} circles={item.circles} />
                    {user && currentBadge && (
                      <span className={`sb-badge-floating sb-badge-${currentBadge.type} ${isActive ? 'badge-active' : ''}`}>
                        {currentBadge.n}
                      </span>
                    )}
                  </div>
                  
                  <span className="sb-nav-label">
                    {item.label}
                  </span>

                  {user && currentBadge && (
                    <span className={`sb-badge sb-badge-${currentBadge.type} ${isActive ? 'badge-active' : ''}`}>
                      {currentBadge.n}
                    </span>
                  )}
                </Link>
              )}

              {/* Renderizar Submenús */}
              {hasSub && isSubOpen && !collapsed && (
                <div className="sb-submenu-container" style={{ paddingLeft: '32px', marginTop: '4px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {visibleSubItems.map(sub => {
                    const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path);
                    return (
                      <Link 
                        key={sub.id} 
                        to={sub.path} 
                        className={`sb-submenu-item ${isSubActive ? 'active' : ''}`}
                        style={{
                          fontSize: '13px',
                          color: isSubActive ? 'var(--primary)' : 'var(--text-muted)',
                          textDecoration: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isSubActive ? 'var(--primary-bg)' : 'transparent',
                          transition: 'all 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{sub.label}</span>
                        {user && sub.id === 'auditoria' && auditoriaBadge > 0 && (
                           <span className="sb-badge sb-badge-danger" style={{ position: 'static', transform: 'none', padding: '2px 6px', fontSize: '10px' }}>{auditoriaBadge}</span>
                        )}
                        {user && sub.id === 'reportes' && incidenciasBadge > 0 && (
                           <span className="sb-badge sb-badge-warning" style={{ position: 'static', transform: 'none', padding: '2px 6px', fontSize: '10px' }}>{incidenciasBadge}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
        ) : location.pathname !== '/login' && (
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
