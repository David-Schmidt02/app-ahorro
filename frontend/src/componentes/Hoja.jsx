import { useEffect, useRef } from 'react';
import Icono from './Icono';

/** Panel modal: hoja que sube desde abajo en el celular, diálogo centrado en pantallas grandes. */
export default function Hoja({ titulo, abierta, onCerrar, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      className="hoja"
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      aria-label={titulo}
    >
      <div className="hoja__cuerpo">
        <header className="hoja__cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </header>
        {abierta && children}
      </div>
    </dialog>
  );
}
