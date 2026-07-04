import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ContractList from './pages/ContractList';
import ContractDetail from './pages/ContractDetail';
import ContractEditor from './pages/ContractEditor';
import Clientes from './pages/Clientes';
import Catalogo from './pages/Catalogo';
import Ajustes from './pages/Ajustes';
import Faq from './pages/Faq';

import Login from './pages/Login';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
            <Route path="/ajustes" element={<ProtectedRoute><Ajustes /></ProtectedRoute>} />
            <Route path="/faq" element={<ProtectedRoute><Faq /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><ContractList /></ProtectedRoute>} />
            <Route path="/contracts/new" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
            <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
