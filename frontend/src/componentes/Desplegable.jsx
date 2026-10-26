import { useEffect, useId, useRef, useState } from 'react';
import Icono from './Icono';

/**
 * Campo que despliega su panel debajo, dentro del flujo: así no lo recorta la hoja que lo contiene.
 * `children` recibe `cerrar` para que el panel se cierre al elegir.
 */
export default function Desplegable({ etiqueta, resumen, icono, children }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return undefined;
    const afuera = (e) => !raiz.current?.contains(e.target) && setAbierto(false);
    document.addEventListener('pointerdown', afuera);
    return () => document.removeEventListener('pointerdown', afuera);
  }, [abierto]);

  const cerrar = () => {
    setAbierto(false);
    document.getElementById(`${id}-disparador`)?.focus();
  };

  return (
    <div
      className={`desplegable${abierto ? ' es-abierto' : ''}`}
      ref={raiz}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && abierto) {
          // Que el Escape no cierre también la hoja
          e.preventDefault();
          e.stopPropagation();
          cerrar();
        }
      }}
    >
      <span className="desplegable__etiqueta" id={`${id}-etiqueta`}>
        {etiqueta}
      </span>
      <button
        type="button"
        id={`${id}-disparador`}
        className="desplegable__disparador"
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-etiqueta ${id}-valor`}
        onClick={() => setAbierto((x) => !x)}
      >
        {icono}
        <span className="desplegable__valor" id={`${id}-valor`}>
          {resumen}
        </span>
        <Icono nombre="abajo" tamano={18} className="desplegable__flecha" />
      </button>
      {abierto && (
        <div className="desplegable__panel" id={`${id}-panel`}>
          {children(cerrar)}
        </div>
      )}
    </div>
  );
}
