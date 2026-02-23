import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
// Páginas Pendientes
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ObjectiveDetail from './pages/ObjectiveDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Privadas / Plataforma */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/objetivo/:id" element={<ObjectiveDetail />} />
          </Route>
        </Route>
        
        {/* Redirección Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
