import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ContractDetail from './pages/ContractDetail';
import ContractEditor from './pages/ContractEditor';
import Contratos from './pages/Contratos';
import Clientes from './pages/Clientes';
import Catalogo from './pages/Catalogo';
import Ajustes from './pages/Ajustes';
import Faq from './pages/Faq';
import AuditoriaLegal from './pages/AuditoriaLegal';
import Analytics from './pages/Analytics';

import Login from './pages/Login';

function App() {
  return (
    <Router>
      <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
            <Route path="/ajustes" element={<ProtectedRoute><Ajustes /></ProtectedRoute>} />
            <Route path="/faq" element={<ProtectedRoute><Faq /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute><AuditoriaLegal /></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
            <Route path="/contratos/new" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
            <Route path="/contratos/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Layout>
        </ConfirmProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
