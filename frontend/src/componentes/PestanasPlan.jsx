import { NavLink } from 'react-router-dom';
import Icono from './Icono';

/** Pestañas de Plan: el resumen del mes y lo que planean gastar, fijo (alquiler, servicios) o por semana (cupos). */
export default function PestanasPlan() {
  return (
    <nav className="segmentado segmentado--pestanas" aria-label="Plan">
      <NavLink to="/plan/resumen" className="pestana">
        <Icono nombre="lineas" tamano={18} /> Resumen
      </NavLink>
      <NavLink to="/plan/fijos" className="pestana">
        <Icono nombre="repetir" tamano={18} /> Fijos
      </NavLink>
      <NavLink to="/plan/cupos" className="pestana">
        <Icono nombre="calendario" tamano={18} /> Cupos
      </NavLink>
    </nav>
  );
}
