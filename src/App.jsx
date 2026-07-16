import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ActiveViewProvider } from './contexts/ActiveViewContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute, { RequireAccess } from './components/auth/ProtectedRoute';

// Code splitting por ruta: cada página se descarga solo cuando se navega a ella.
// recharts (Dashboard/Analytics/Auditoría) y Catalogo quedan fuera del bundle inicial.
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const ContractDetail = lazy(() => import('./pages/ContractDetail'));
const ContractEditor = lazy(() => import('./pages/ContractEditor'));
const Contratos      = lazy(() => import('./pages/Contratos'));
const Clientes       = lazy(() => import('./pages/Clientes'));
const Catalogo       = lazy(() => import('./pages/Catalogo'));
const Ajustes        = lazy(() => import('./pages/Ajustes'));
const Faq            = lazy(() => import('./pages/Faq'));
const AuditoriaLegal = lazy(() => import('./pages/AuditoriaLegal'));
const Analytics      = lazy(() => import('./pages/Analytics'));
const Login          = lazy(() => import('./pages/Login'));
const Recuperar      = lazy(() => import('./pages/Recuperar'));
const Registro       = lazy(() => import('./pages/Registro'));
const Inicio         = lazy(() => import('./pages/Inicio'));
const Historial      = lazy(() => import('./pages/Historial'));
const Membresias     = lazy(() => import('./pages/Membresias'));
const Tarifas        = lazy(() => import('./pages/Tarifas'));
const Beneficios     = lazy(() => import('./pages/Beneficios'));
const Novedades      = lazy(() => import('./pages/Novedades'));
const Reporte        = lazy(() => import('./pages/Reporte'));
const ClienteWorkspace   = lazy(() => import('./pages/ClienteWorkspace'));
const ProductoWorkspace  = lazy(() => import('./pages/ProductoWorkspace'));
const Usuarios           = lazy(() => import('./pages/Usuarios'));

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
          <Suspense fallback={<RouteFallback />}>
            <Layout>
              <Routes>
                <Route path="/inicio" element={<Inicio />} />
                <Route path="/login" element={<Login />} />
                <Route path="/recuperar" element={<Recuperar />} />
                <Route path="/recuperar/confirmar/:uid/:token" element={<Recuperar />} />
                <Route path="/registro" element={<Registro />} />
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
            </Layout>
          </Suspense>
        </ConfirmProvider>
        </ActiveViewProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
