import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveView } from '../../contexts/ActiveViewContext';
import { apiLogout, getClientes, getContratoStats, getAuditoria, getIncidencias, getIncidenciaStats, getClientesStats, getSoftwareList } from '../../api';
import { prefetchRoute, prefetchAllRoutesOnIdle } from '../../routeChunks';
import './Sidebar.css';

gsap.registerPlugin(useGSAP);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Etiqueta del modo global de la "Vista activa" (sin cliente seleccionado).
const GLOBAL_VIEW_LABEL = 'Administración Global';

// `feature` = clave de la matriz de planes (tenants/plans.py del backend).
// El sidebar oculta los módulos que el plan del tenant no incluye; el
// backend igual rechaza el acceso directo por URL (gating real).
const SYSTEM_NOTIFICATIONS = [
  { id: 1, type: 'info', tag: 'SISTEMA', text: 'Actualización v2.0 disponible', paths: ['M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'] },
  { id: 2, type: 'success', tag: 'ESTADO', text: 'Sistemas operativos al 100%', paths: ['M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'] },
  { id: 3, type: 'warning', tag: 'AVISO', text: 'Próximo mantenimiento en 2d', paths: ['M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'] }
];

const NAV_STAFF = [
  { id: 'inicio', path: '/inicio', label: 'Inicio', paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'] },
  { id: 'dashboard', path: '/', label: 'Dashboard', feature: 'contratos', paths: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'] },
  { id: 'contratos', path: '/contratos', label: 'Contratos', feature: 'contratos', paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8'] },
  { id: 'clientes', path: '/clientes', label: 'Clientes', feature: 'clientes', paths: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'], circles: [{ cx: 9, cy: 7, r: 4 }] },
  { id: 'catalogo', path: '/catalogo', label: 'Catálogo', feature: 'catalogo', paths: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z','M3.27 6.96 12 12.01l8.73-5.05','M12 22.08V12'] },
  { 
    id: 'gestion', 
    path: '#', 
    label: 'Gestión', 
    paths: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'],
    subItems: [
      { id: 'auditoria', path: '/auditoria', label: 'Auditoría', feature: 'legal' },
      { id: 'reportes', path: '/reportes', label: 'Reporte', feature: 'incidencias' },
      { id: 'analytics', path: '/analytics', label: 'Analytics', feature: 'analytics' },
      { id: 'tenants', path: '/tenants', label: 'Empresas' },
      { id: 'usuarios', path: '/usuarios', label: 'Usuarios' }
    ]
  },
  { id: 'integraciones', path: '/integraciones', label: 'Integraciones', paths: ['M12 22v-5', 'M9 8V2', 'M15 8V2', 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z'] },
];

const NAV_CLIENTE = [
  { id: 'dashboard', path: '/', label: 'Dashboard', paths: ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'] },
  { id: 'contratos', path: '/contratos', label: 'Mis Contratos', paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8'] },
  { 
    id: 'reportes', 
    path: '/reportes', 
    label: 'Soporte e Incidencias', 
    paths: ['M3 18v-6a9 9 0 0 1 18 0v6', 'M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z', 'M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z'] 
  },
  { 
    id: 'membresias', 
    path: '/membresias', 
    label: 'Membresía y Plan', 
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
    subItems: [
      { id: 'membresia_plan', path: '/membresias', label: 'Mi Plan y Facturación' },
      { id: 'beneficio', path: '/membresias/beneficio', label: 'Beneficios' },
      { id: 'tarifas', path: '/tarifas', label: 'Tarifas y Servicios' }
    ]
  },
  { id: 'historial', path: '/historial', label: 'Historial', paths: ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'], circles: [{ cx: 12, cy: 12, r: 10 }] },
  { id: 'novedades', path: '/novedades', label: 'Novedades', paths: ['M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4', 'M14 2v4a2 2 0 0 0 2 2h4', 'M3 15h6', 'M3 19h6'] },
  { id: 'integraciones', path: '/integraciones', label: 'Integraciones', paths: ['M12 22v-5', 'M9 8V2', 'M15 8V2', 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z'] },
  { id: 'faq', path: '/faq', label: 'Centro de Ayuda', paths: ['M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'], circles: [{ cx: 12, cy: 12, r: 10 }] },
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

const IntelligentMarquee = ({ text, collapsed }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current && !collapsed) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    checkOverflow();
    // Re-check on resize just in case
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, collapsed]);

  return (
    <div className="sb-notif-text-container" ref={containerRef}>
      <span 
        className={`sb-notif-text ${isOverflowing ? 'marquee' : ''}`} 
        ref={textRef}
      >
        {text}
      </span>
    </div>
  );
};

export default function Sidebar() {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('clm_sidebar_preference');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isHovered, setIsHovered] = useState(false);
  // Drawer móvil: abierto/cerrado vía botón de menú del topbar
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentNotifIndex, setCurrentNotifIndex] = useState(0);
  const [isHoveringNotif, setIsHoveringNotif] = useState(false);
  const [isNotifVisible, setIsNotifVisible] = useState(() => {
    const hiddenAt = localStorage.getItem('clm_notif_hidden_date');
    if (!hiddenAt) return true;
    // Vuelve a mostrar notificaciones si pasaron más de 12 horas desde que lo cerró
    const isOld = Date.now() - parseInt(hiddenAt, 10) > 1000 * 60 * 60 * 12; 
    if (isOld) {
      localStorage.removeItem('clm_notif_hidden_date');
      return true;
    }
    return false;
  });

  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (isHoveringNotif) return;
    const interval = setInterval(() => {
      setCurrentNotifIndex((prev) => (prev + 1) % SYSTEM_NOTIFICATIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHoveringNotif, currentNotifIndex]);

  const dismissNotif = (e) => {
    e.stopPropagation();
    setIsDismissing(true);
    setTimeout(() => {
      setIsNotifVisible(false);
      localStorage.setItem('clm_notif_hidden_date', Date.now().toString());
    }, 220);
  };

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

  const [clientesBadge, setClientesBadge] = useState(() => {
    const saved = localStorage.getItem('clm_clientes_badge');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [catalogoBadge, setCatalogoBadge] = useState(() => {
    const saved = localStorage.getItem('clm_catalogo_badge');
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

  // Ancho ajustable del sidebar (máximo 240px, mínimo 68px)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('clm_sidebar_width');
    if (saved !== null) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 68 && val <= 240) return val;
    }
    return 240;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const isExpanded = isPinned || isHovered || mobileOpen;
  const collapsed = !isExpanded;
  const isCompact = isExpanded && !mobileOpen && sidebarWidth < 120;

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isPinned && window.innerWidth >= 1024) {
      setIsPinned(true);
      localStorage.setItem('clm_sidebar_preference', JSON.stringify(true));
    }

    setIsResizing(true);
    isResizingRef.current = true;

    const startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const startW = sidebarWidth;
    let animationFrameId = null;
    let latestWidth = startW;

    const onPointerMove = (moveEvt) => {
      if (!isResizingRef.current) return;
      const currentX = moveEvt.type.startsWith('touch') ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const delta = currentX - startX;
      let nextW = Math.round(startW + delta);

      // Smart snapping at edges
      if (nextW > 225) nextW = 240;
      else if (nextW < 80) nextW = 68;

      latestWidth = nextW;

      // Actualización directa al compositor para máxima fluidez sin esperar re-render
      if (sidebarRef.current) {
        sidebarRef.current.style.setProperty('--current-sidebar-width', `${nextW}px`);
        if (nextW < 120) {
          sidebarRef.current.classList.add('is-compact');
        } else {
          sidebarRef.current.classList.remove('is-compact');
        }
      }

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          animationFrameId = null;
          setSidebarWidth(latestWidth);
        });
      }
    };

    const onPointerUp = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      isResizingRef.current = false;
      setIsResizing(false);
      setSidebarWidth(latestWidth);
      localStorage.setItem('clm_sidebar_width', latestWidth.toString());

      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      document.body.classList.remove('sb-is-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.classList.add('sb-is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  const handleResizeReset = (e) => {
    e.stopPropagation();
    setSidebarWidth(240);
    localStorage.setItem('clm_sidebar_width', '240');
    if (sidebarRef.current) {
      sidebarRef.current.style.setProperty('--current-sidebar-width', '240px');
      sidebarRef.current.classList.remove('is-compact');
    }
  };

  const handleResizeKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth((prev) => {
        const next = Math.max(68, prev - 12);
        localStorage.setItem('clm_sidebar_width', next.toString());
        return next;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth((prev) => {
        const next = Math.min(240, prev + 12);
        localStorage.setItem('clm_sidebar_width', next.toString());
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSidebarWidth(68);
      localStorage.setItem('clm_sidebar_width', '68');
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarWidth(240);
      localStorage.setItem('clm_sidebar_width', '240');
    }
  };

  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('clm_sidebar_width', sidebarWidth.toString());
    }
  }, [sidebarWidth, isResizing]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('sb-is-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

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

  // Con sesión iniciada, precarga los chunks de las demás vistas en idle:
  // el primer click a cada ruta deja de pagar la descarga del módulo.
  useEffect(() => {
    if (user) prefetchAllRoutesOnIdle();
  }, [user]);

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

      if (hasFeature('clientes') && canAccessClientes) {
        tasks.push((async () => {
          try {
            const stats = await getClientesStats();
            const count = stats.activos || 0;
            setClientesBadge(count);
            localStorage.setItem('clm_clientes_badge', count.toString());
          } catch (err) {}
        })());
      }

      if (hasFeature('catalogo')) {
        tasks.push((async () => {
          try {
            const list = await getSoftwareList();
            const count = list.length || 0;
            setCatalogoBadge(count);
            localStorage.setItem('clm_catalogo_badge', count.toString());
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

  // Al expandir o salir de modo compacto: los textos entran con un leve desplazamiento en cascada
  useGSAP(() => {
    if (!isExpanded || isCompact || prefersReducedMotion()) return;
    gsap.fromTo(
      '.sb-logo-text, .sb-context-info, .sb-nav-label, .sb-user-info, .sb-section-title',
      { autoAlpha: 0, x: -8 },
      { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.02, ease: 'power2.out', clearProps: 'all' }
    );
  }, { dependencies: [isExpanded, isCompact], scope: sidebarRef, revertOnUpdate: true });

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
    const activeNav = isClienteExterno ? NAV_CLIENTE : NAV_STAFF;
    const activeItem = activeNav.find(item => item.path === location.pathname || (item.path !== '/' && item.path !== '#' && location.pathname.startsWith(item.path)));
    if (activeItem && activeItem.subItems) {
      setOpenSubmenus(prev => ({ ...prev, [activeItem.id]: true }));
    } else {
      // Check in subItems too
      activeNav.forEach(item => {
        if (item.subItems) {
          const activeSub = item.subItems.find(sub => sub.path === location.pathname || (sub.path !== '/' && location.pathname.startsWith(sub.path)));
          if (activeSub) {
            setOpenSubmenus(prev => ({ ...prev, [item.id]: true }));
          }
        }
      });
    }
  }, [location.pathname, isClienteExterno]);

  const checkVisibility = (item) => {
    if (!user && item.id !== 'inicio') return false;
    if (user && item.id === 'inicio') return false;

    if (user && isClienteExterno) {
      return true;
    } else if (user) {
      // Usuarios normales/internos:
      if (item.id === 'clientes' && !canAccessClientes) return false;
      if (item.id === 'tenants' && !(user.isSuperadmin || isModerador)) return false;
      if (item.id === 'usuarios' && !(user.isSuperadmin || isModerador)) return false;
      if (item.id !== 'clientes' && item.id !== 'tenants' && item.feature && !hasFeature(item.feature)) return false;
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
        className={`sidebar-proto ${collapsed ? 'collapsed' : 'expanded'} ${isCompact ? 'is-compact' : ''} ${mobileOpen ? 'mobile-open' : ''} ${isResizing ? 'is-resizing' : ''}`}
        style={{
          '--current-sidebar-width': `${sidebarWidth}px`,
          width: isExpanded && !mobileOpen ? `${sidebarWidth}px` : undefined,
          minWidth: isExpanded && !mobileOpen ? `${sidebarWidth}px` : undefined,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!isResizingRef.current) setIsHovered(false);
        }}
        onClick={handleSidebarClick}
      >
      {/* Header / Selector de Contexto */}
      <div className="sb-header">
        <div className="sb-logo-section">
          <div 
            className="sb-logo-icon"
            onClick={(e) => {
              if (isCompact) {
                e.stopPropagation();
                setSidebarWidth(240);
                localStorage.setItem('clm_sidebar_width', '240');
              }
            }}
            title={isCompact ? "Clic para expandir a 240px" : undefined}
            style={isCompact ? { cursor: 'pointer' } : undefined}
          >
            <img src="/android-chrome-192x192.png" alt="Enfoque Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <div className="sb-logo-text">
            <div className="sb-logo-title">KyoCLM</div>
            <div className="sb-logo-subtitle">v0.3 Alpha</div>
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
        <span>{isClienteExterno ? 'Portal Cliente' : 'Módulos'}</span>
      </div>

      <nav className="sb-nav-container" aria-label="Menú principal">
        {(isClienteExterno ? NAV_CLIENTE : NAV_STAFF).map((item) => {
          if (!checkVisibility(item)) return null;

          let visibleSubItems = [];
          if (item.subItems) {
            visibleSubItems = item.subItems.filter(sub => checkVisibility(sub));
            if (visibleSubItems.length === 0 && item.id === 'gestion') return null;
          }

          const isActive = location.pathname === item.path || (item.path !== '/' && item.path !== '#' && location.pathname.startsWith(item.path)) || (visibleSubItems.some(sub => location.pathname === sub.path || (sub.path !== '/' && sub.path !== '/membresias' && location.pathname.startsWith(sub.path))));
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
          } else if (item.id === 'reportes' && incidenciasBadge > 0) {
            currentBadge = { n: incidenciasBadge, type: 'warning' };
          } else if (item.id === 'clientes' && clientesBadge > 0) {
            currentBadge = { n: clientesBadge, type: 'info' };
          } else if (item.id === 'catalogo' && catalogoBadge > 0) {
            currentBadge = { n: catalogoBadge, type: 'info' };
          }

          return (
            <div key={item.id} className="sb-nav-item-wrapper">
              {hasSub ? (
                <div
                  className={`sb-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed || isCompact ? item.label : undefined}
                  onClick={() => {
                    if (isCompact) {
                      setSidebarWidth(240);
                      localStorage.setItem('clm_sidebar_width', '240');
                      setOpenSubmenus(prev => ({ ...prev, [item.id]: true }));
                    } else {
                      setOpenSubmenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                    }
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

                  {!collapsed && !isCompact && (
                    <svg className="sb-chevron" style={{ transform: isSubOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', width: 14, opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  )}

                  {(collapsed || isCompact) && (
                    <div className="sb-tooltip">
                      {item.label}
                      {currentBadge && (
                        <span className={`sb-tooltip-badge ${currentBadge.type}`}>
                          {currentBadge.n}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`sb-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed || isCompact ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  onMouseEnter={() => prefetchRoute(item.path)}
                  onFocus={() => prefetchRoute(item.path)}
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

                  {(collapsed || isCompact) && (
                    <div className="sb-tooltip">
                      {item.label}
                      {currentBadge && (
                        <span className={`sb-tooltip-badge ${currentBadge.type}`}>
                          {currentBadge.n}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              )}

              {/* Renderizar Submenús */}
              {hasSub && isSubOpen && !collapsed && !isCompact && (
                <div className="sb-submenu-container" style={{ paddingLeft: '32px', marginTop: '4px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {visibleSubItems.map(sub => {
                    const isSubActive = location.pathname === sub.path || (sub.path !== '/' && sub.path !== '/membresias' && location.pathname.startsWith(sub.path));
                    return (
                      <Link 
                        key={sub.id}
                        to={sub.path}
                        className={`sb-submenu-item ${isSubActive ? 'active' : ''}`}
                        onMouseEnter={() => prefetchRoute(sub.path)}
                        onFocus={() => prefetchRoute(sub.path)}
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

      {/* Toast Notificaciones fijo sobre el card de perfil */}
      {user && isNotifVisible && (
        <div 
          className={`sb-notification-zone ${isDismissing ? 'dismissing' : ''}`} 
          onMouseEnter={() => setIsHoveringNotif(true)}
          onMouseLeave={() => setIsHoveringNotif(false)}
          onFocus={() => setIsHoveringNotif(true)}
          onBlur={() => setIsHoveringNotif(false)}
        >
          {isCompact ? (
            <div 
              className={`sb-toast-compact sb-toast-${SYSTEM_NOTIFICATIONS[currentNotifIndex].type}`}
              onClick={() => setCurrentNotifIndex((prev) => (prev + 1) % SYSTEM_NOTIFICATIONS.length)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCurrentNotifIndex((prev) => (prev + 1) % SYSTEM_NOTIFICATIONS.length);
                }
              }}
              role="button"
              tabIndex={0}
              title={`${SYSTEM_NOTIFICATIONS[currentNotifIndex].tag}: ${SYSTEM_NOTIFICATIONS[currentNotifIndex].text}`}
              aria-label={SYSTEM_NOTIFICATIONS[currentNotifIndex].text}
            >
              <div className="sb-toast-icon-wrap">
                <Icon paths={SYSTEM_NOTIFICATIONS[currentNotifIndex].paths} />
              </div>
              <span className="sb-toast-pulse-dot" />
              <div className="sb-tooltip">
                <div style={{ fontWeight: 700, fontSize: '9px', marginBottom: '2px', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.05em' }}>
                  {SYSTEM_NOTIFICATIONS[currentNotifIndex].tag}
                </div>
                {SYSTEM_NOTIFICATIONS[currentNotifIndex].text}
              </div>
            </div>
          ) : (
            <div className={`sb-toast-card sb-toast-${SYSTEM_NOTIFICATIONS[currentNotifIndex].type}`}>
              <div className="sb-toast-header">
                <div className="sb-toast-tag-badge">
                  <span className="sb-toast-dot" />
                  <span className="sb-toast-tag">{SYSTEM_NOTIFICATIONS[currentNotifIndex].tag}</span>
                </div>

                <div className="sb-toast-dots" aria-label="Selector de avisos">
                  {SYSTEM_NOTIFICATIONS.map((n, i) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`sb-toast-dot-indicator ${i === currentNotifIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentNotifIndex(i);
                      }}
                      title={`Aviso ${i + 1}: ${n.text}`}
                      aria-label={`Ver aviso ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="sb-toast-close"
                  onClick={dismissNotif}
                  aria-label="Cerrar notificación"
                  title="Ocultar (se reabrirá en 12h)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="sb-toast-body" key={SYSTEM_NOTIFICATIONS[currentNotifIndex].id}>
                <div className="sb-toast-icon-wrap">
                  <Icon paths={SYSTEM_NOTIFICATIONS[currentNotifIndex].paths} />
                </div>
                <div className="sb-toast-text-wrap" title={SYSTEM_NOTIFICATIONS[currentNotifIndex].text}>
                  <span className="sb-toast-text">{SYSTEM_NOTIFICATIONS[currentNotifIndex].text}</span>
                </div>
              </div>

              <div className="sb-toast-progress-track">
                <div key={currentNotifIndex} className="sb-toast-progress-bar" />
              </div>
            </div>
          )}
        </div>
      )}

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
                  onClick={() => { setUserMenuOpen(false); navigate('/integraciones'); }}
                >
                  <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 8, opacity: 0.7 }}>
                    <path d="M12 22v-5"></path>
                    <path d="M9 8V2"></path>
                    <path d="M15 8V2"></path>
                    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"></path>
                  </svg>
                  {collapsed ? 'I' : 'Integraciones'}
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

      {/* Drag Resize Handle (borde exterior derecho) */}
      {isExpanded && !mobileOpen && (
        <div
          className={`sb-resize-handle ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          onDoubleClick={handleResizeReset}
          onKeyDown={handleResizeKeyDown}
          tabIndex={0}
          title="Arrastrar para redimensionar (doble clic o Tecla End para 240px, Home para 68px, flechas ←/→)"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          aria-valuemin={68}
          aria-valuemax={240}
          aria-label="Ajustar ancho del sidebar"
        >
          <div className="sb-resize-handle-line" />
        </div>
      )}
    </div>
    </>
  );
}
