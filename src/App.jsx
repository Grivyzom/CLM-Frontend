import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

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

function RouteFallback() {
  return <div className="route-fallback" aria-busy="true" />;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/catalogo" element={<Catalogo />} />
                      <Route path="/ajustes" element={<Ajustes />} />
                      <Route path="/faq" element={<Faq />} />
                      <Route path="/auditoria" element={<AuditoriaLegal />} />
                      <Route path="/contratos" element={<Contratos />} />
                      <Route path="/contratos/new" element={<ContractEditor />} />
                      <Route path="/contratos/:id" element={<ContractDetail />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </ConfirmProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
