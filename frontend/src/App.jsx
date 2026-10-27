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
            <Route path="fijos" element={<Fijos />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ProveedorApp>
    </BrowserRouter>
  );
}
