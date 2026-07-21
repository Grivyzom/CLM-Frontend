import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ActiveViewProvider } from './contexts/ActiveViewContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TourProvider } from './contexts/TourContext';
import ProtectedRoute, { RequireAccess } from './components/auth/ProtectedRoute';
import { routeChunks } from './routeChunks';

// Code splitting por ruta: cada página se descarga solo cuando se navega a ella.
// recharts (Dashboard/Analytics/Auditoría) y Catalogo quedan fuera del bundle inicial.
// Las vistas del sidebar usan los loaders de routeChunks para que el prefetch
// (hover + idle) comparta el mismo import() y el chunk ya esté caliente al navegar.
const Dashboard      = lazy(routeChunks['/']);
const ContractDetail = lazy(() => import('./pages/ContractDetail'));
const ContractEditor = lazy(() => import('./pages/ContractEditor'));
const Contratos      = lazy(routeChunks['/contratos']);
const Clientes       = lazy(routeChunks['/clientes']);
const Catalogo       = lazy(routeChunks['/catalogo']);
const Ajustes        = lazy(routeChunks['/ajustes']);
const Faq            = lazy(routeChunks['/faq']);
const AuditoriaLegal = lazy(routeChunks['/auditoria']);
const Analytics      = lazy(routeChunks['/analytics']);
const Login          = lazy(() => import('./pages/Login'));
const Recuperar      = lazy(() => import('./pages/Recuperar'));
const FirmarContrato = lazy(() => import('./pages/FirmarContrato'));
const Registro       = lazy(() => import('./pages/Registro'));
const Inicio         = lazy(() => import('./pages/Inicio'));
const Historial      = lazy(routeChunks['/historial']);
const Membresias     = lazy(routeChunks['/membresias']);
const Tarifas        = lazy(routeChunks['/tarifas']);
const Beneficios     = lazy(routeChunks['/membresias/beneficio']);
const Novedades      = lazy(routeChunks['/novedades']);
const Reporte        = lazy(routeChunks['/reportes']);
const ClienteWorkspace   = lazy(() => import('./pages/ClienteWorkspace'));
const ProductoWorkspace  = lazy(() => import('./pages/ProductoWorkspace'));
const Usuarios           = lazy(routeChunks['/usuarios']);
const GuestPortal        = lazy(() => import('./pages/GuestPortal'));

function RouteFallback() {
  return <div className="route-fallback" aria-busy="true" />;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
      <AuthProvider>
        <ActiveViewProvider>
        <ConfirmProvider>
          <TourProvider>
            <Layout>
            {/* Suspense DENTRO de Layout: el sidebar sigue montado mientras
                baja el chunk de la vista; antes toda la app se reemplazaba
                por el fallback en la primera visita a cada ruta lazy. */}
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/inicio" element={<Inicio />} />
                <Route path="/login" element={<Login />} />
                <Route path="/recuperar" element={<Recuperar />} />
                <Route path="/recuperar/confirmar/:uid/:token" element={<Recuperar />} />
                <Route path="/firmar/:token" element={<FirmarContrato />} />
                <Route path="/guest/:token" element={<GuestPortal />} />
                <Route path="/registro/:uid/:token" element={<Registro />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <Routes>
                      <Route path="/" element={
                        <RequireAccess require={(auth) => auth.hasFeature('contratos')}><Dashboard /></RequireAccess>
                      } />
                      <Route path="/clientes" element={
                        <RequireAccess require={(auth) => auth.canAccessClientes}><Clientes /></RequireAccess>
                      } />
                      <Route path="/clientes/:id" element={
                        <RequireAccess require={(auth) => auth.canAccessClientes}><ClienteWorkspace /></RequireAccess>
                      } />
                      <Route path="/catalogo" element={
                        <RequireAccess require={(auth) => auth.hasFeature('catalogo')}><Catalogo /></RequireAccess>
                      } />
                      <Route path="/catalogo/:id" element={
                        <RequireAccess require={(auth) => auth.hasFeature('catalogo')}><ProductoWorkspace /></RequireAccess>
                      } />
                      <Route path="/ajustes" element={<Ajustes />} />
                      <Route path="/faq" element={<Faq />} />
                      <Route path="/auditoria" element={
                        <RequireAccess require={(auth) => auth.hasFeature('legal')}><AuditoriaLegal /></RequireAccess>
                      } />
                      <Route path="/contratos" element={
                        <RequireAccess require={(auth) => auth.hasFeature('contratos')}><Contratos /></RequireAccess>
                      } />
                      <Route path="/contratos/new" element={
                        <RequireAccess require={(auth) => auth.hasFeature('contratos')}><ContractEditor /></RequireAccess>
                      } />
                      <Route path="/contratos/:id" element={
                        <RequireAccess require={(auth) => auth.hasFeature('contratos')}><ContractDetail /></RequireAccess>
                      } />
                      <Route path="/analytics" element={
                        <RequireAccess require={(auth) => auth.hasFeature('analytics')}><Analytics /></RequireAccess>
                      } />

                      <Route path="/historial" element={
                        <RequireAccess require={(auth) => auth.isClienteExterno || auth.user?.isSuperadmin || auth.isModerador}><Historial /></RequireAccess>
                      } />
                      <Route path="/membresias" element={
                        <RequireAccess require={(auth) => auth.isClienteExterno || auth.user?.isSuperadmin || auth.isModerador}><Membresias /></RequireAccess>
                      } />
                      <Route path="/membresias/beneficio" element={
                        <RequireAccess require={(auth) => auth.isClienteExterno || auth.user?.isSuperadmin || auth.isModerador}><Beneficios /></RequireAccess>
                      } />
                      <Route path="/novedades" element={
                        <RequireAccess require={(auth) => auth.isClienteExterno || auth.user?.isSuperadmin || auth.isModerador}><Novedades /></RequireAccess>
                      } />
                      <Route path="/tarifas" element={
                        <RequireAccess require={(auth) => auth.isClienteExterno || auth.user?.isSuperadmin || auth.isModerador}><Tarifas /></RequireAccess>
                      } />
                      <Route path="/reportes" element={
                        <RequireAccess require={(auth) => auth.isClienteExterno || auth.hasFeature('incidencias')}><Reporte /></RequireAccess>
                      } />
                      <Route path="/usuarios" element={
                        <RequireAccess require={(auth) => auth.user?.isSuperadmin || auth.isModerador}><Usuarios /></RequireAccess>
                      } />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
            </Layout>
          </TourProvider>
        </ConfirmProvider>
        </ActiveViewProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
