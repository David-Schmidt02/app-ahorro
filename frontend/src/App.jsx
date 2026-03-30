import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ObjectiveDetail from './pages/ObjectiveDetail';
import Gastos from './pages/Gastos';
import HorariosSemanales from './pages/HorariosSemanales';
import Calendario from './pages/Calendario';
import Propiedades from './pages/Propiedades';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas Privadas / Plataforma */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/objetivo/:id" element={<ObjectiveDetail />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/horarios" element={<HorariosSemanales />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/propiedades" element={<Propiedades />} />
          </Route>
        </Route>

        {/* Redirección Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
