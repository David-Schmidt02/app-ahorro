import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Marco from './componentes/Marco';
import { useSesion } from './estado/contextos';
import ProveedorApp from './estado/ProveedorApp';
import Ajustes from './paginas/Ajustes';
import Calendario from './paginas/Calendario';
import Fijos from './paginas/Fijos';
import Ingreso from './paginas/Ingreso';
import Inicio from './paginas/Inicio';
import Movimientos from './paginas/Movimientos';
import PlanCupos from './paginas/PlanCupos';

export default function App() {
  const { usuario } = useSesion();

  if (usuario === undefined) return <div className="arranque" aria-busy="true" />;
  if (usuario === null) return <Ingreso />;

  return (
    <BrowserRouter>
      <ProveedorApp>
        <Routes>
          <Route element={<Marco />}>
            <Route index element={<Inicio />} />
            <Route path="movimientos" element={<Movimientos />} />
            <Route path="plan">
              <Route index element={<Navigate to="fijos" replace />} />
              <Route path="fijos" element={<Fijos />} />
              <Route path="cupos" element={<PlanCupos />} />
            </Route>
            <Route path="fijos" element={<Navigate to="/plan/fijos" replace />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ProveedorApp>
    </BrowserRouter>
  );
}
