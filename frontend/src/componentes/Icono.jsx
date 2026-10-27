import { ICONO_CATEGORIA_POR_DEFECTO, ICONOS_CATEGORIA, ICONOS_UI, TIPOS_EVENTO } from '../lib/iconos';

/** Ícono de la interfaz por nombre de función ("borrar", "calendario"…). */
export default function Icono({ nombre, tamano = 22, grosor = 1.8, className }) {
  const Componente = ICONOS_UI[nombre];
  return <Componente size={tamano} strokeWidth={grosor} className={className} aria-hidden="true" />;
}

/** Ícono de una categoría sobre un fondo de su color. `icono` es la clave guardada en la base. */
export function IconoCategoria({ icono, color, tamano = 'normal' }) {
  const Componente = ICONOS_CATEGORIA[icono] ?? ICONOS_CATEGORIA[ICONO_CATEGORIA_POR_DEFECTO];
  return (
    <span className={`icono-categoria icono-categoria--${tamano}`} style={{ '--color': color }} aria-hidden="true">
      <Componente size={tamano === 'chico' ? 14 : 19} strokeWidth={2} />
    </span>
  );
}

export function IconoEvento({ tipo }) {
  const Componente = (TIPOS_EVENTO.find((t) => t.valor === tipo) ?? TIPOS_EVENTO.at(-1)).icono;
  return (
    <span className="icono-categoria icono-categoria--evento" aria-hidden="true">
      <Componente size={19} strokeWidth={2} />
    </span>
  );
}
