import { NavLink, Outlet } from 'react-router-dom';
import { MASCOTA_HABILITADA } from '../config/features';
import { useApp, useSesion } from '../estado/contextos';
import { TEMAS, useTema } from '../estado/tema';
import Icono from './Icono';
import Marca from './Marca';
import Mascota from './Mascota';

const SECCIONES = [
  { a: '/', icono: 'inicio', nombre: 'Inicio' },
  { a: '/movimientos', icono: 'lista', nombre: 'Movimientos' },
  { a: '/fijos', icono: 'repetir', nombre: 'Fijos' },
  { a: '/calendario', icono: 'calendario', nombre: 'Calendario' },
  { a: '/ajustes', icono: 'ajustes', nombre: 'Ajustes' },
];

function Enlace({ seccion, className = '' }) {
  return (
    <NavLink to={seccion.a} end={seccion.a === '/'} className={`nav__enlace ${className}`}>
      <Icono nombre={seccion.icono} />
      <span>{seccion.nombre}</span>
    </NavLink>
  );
}

/** Pie de la barra lateral (solo escritorio): tema y cuenta. En el celular están en Ajustes. */
function PieNav() {
  const { usuario, salir } = useSesion();
  const [tema, setTema] = useTema();
  return (
    <div className="nav__pie">
      <div className="segmentado segmentado--chico" role="group" aria-label="Tema">
        {TEMAS.map((t) => (
          <button key={t.valor} type="button" aria-pressed={tema === t.valor} onClick={() => setTema(t.valor)} aria-label={t.nombre} title={t.nombre}>
            <Icono nombre={t.icono} tamano={16} />
          </button>
        ))}
      </div>
      <div className="nav__cuenta">
        <span className="nav__usuario">
          <strong>{usuario.nombre}</strong>
          <span>{usuario.email}</span>
        </span>
        <button type="button" className="boton-icono" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icono nombre="salir" tamano={18} />
        </button>
      </div>
    </div>
  );
}

/** Navegación: barra inferior con el botón de carga al centro (celular) o columna lateral (escritorio). */
export default function Marco() {
  const { abrirCarga } = useApp();
  const cargar = (
    <button type="button" className="nav__cargar" onClick={() => abrirCarga()} aria-label="Cargar gasto o ingreso" title="Cargar (C)">
      <Icono nombre="mas" tamano={26} grosor={2.4} />
      <span>Cargar</span>
    </button>
  );

  return (
    <div className="marco">
      <nav className="nav" aria-label="Secciones">
        <p className="nav__marca">
          <Marca />
        </p>
        <Enlace seccion={SECCIONES[0]} />
        <Enlace seccion={SECCIONES[1]} />
        {cargar}
        <Enlace seccion={SECCIONES[2]} />
        <Enlace seccion={SECCIONES[3]} />
        {/* En el celular Ajustes se abre desde el engranaje de Inicio */}
        <Enlace seccion={SECCIONES[4]} className="solo-escritorio" />
        <PieNav />
      </nav>
      <main className="contenido">
        <Outlet />
      </main>
      {MASCOTA_HABILITADA && <Mascota />}
    </div>
  );
}
