// Mapa único de import() por ruta: React.lazy (App.jsx) y el prefetch del
// Sidebar comparten la misma función, así el módulo se descarga una sola vez
// y la navegación posterior resuelve desde el caché del navegador.
export const routeChunks = {
  '/': () => import('./pages/Dashboard'),
  '/contratos': () => import('./pages/Contratos'),
  '/clientes': () => import('./pages/Clientes'),
  '/catalogo': () => import('./pages/Catalogo'),
  '/ajustes': () => import('./pages/Ajustes'),
  '/faq': () => import('./pages/Faq'),
  '/auditoria': () => import('./pages/AuditoriaLegal'),
  '/analytics': () => import('./pages/Analytics'),
  '/historial': () => import('./pages/Historial'),
  '/membresias': () => import('./pages/Membresias'),
  '/membresias/beneficio': () => import('./pages/Beneficios'),
  '/tarifas': () => import('./pages/Tarifas'),
  '/novedades': () => import('./pages/Novedades'),
  '/reportes': () => import('./pages/Reporte'),
  '/usuarios': () => import('./pages/Usuarios'),
};

const prefetched = new Set();

export function prefetchRoute(path) {
  const load = routeChunks[path];
  if (!load || prefetched.has(path)) return;
  prefetched.add(path);
  load().catch(() => prefetched.delete(path));
}

// Precarga el resto de vistas cuando el navegador queda ocioso tras el
// primer render, para que ningún primer click pague la descarga del chunk.
// Escalonado para no competir con los fetch de datos de la vista actual.
let idleScheduled = false;
export function prefetchAllRoutesOnIdle() {
  if (idleScheduled) return;
  idleScheduled = true;
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
  idle(() => {
    Object.keys(routeChunks).forEach((path, i) => {
      setTimeout(() => prefetchRoute(path), i * 200);
    });
  });
}
