import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FormMovimiento from '../componentes/FormMovimiento';
import FormPago from '../componentes/FormPago';
import Hoja from '../componentes/Hoja';
import { mesActual } from '../lib/fechas';
import { tituloVencimiento } from '../lib/formato';
import { AppContexto } from './contextos';

/** Mes elegido, refresco de datos, las hojas de carga/pago y los avisos breves. */
export default function ProveedorApp({ children }) {
  const [mes, setMes] = useState(mesActual);
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState(null);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  const refrescar = useCallback(() => setVersion((v) => v + 1), []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const avisar = useCallback((texto) => {
    clearTimeout(temporizador.current);
    setAviso({ texto, id: Date.now() });
    temporizador.current = setTimeout(() => setAviso(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const valor = useMemo(
    () => ({
      mes,
      setMes,
      version,
      refrescar,
      avisar,
      /** Sin argumentos: carga rápida. Con { movimiento }: edición. Con { tipo }: tipo inicial. */
      abrirCarga: (opciones = {}) => setHoja({ clase: 'movimiento', id: Date.now(), ...opciones }),
      abrirPago: (vencimiento) => setHoja({ clase: 'pago', id: Date.now(), vencimiento }),
    }),
    [mes, version, refrescar, avisar],
  );

  const titulo =
    hoja?.clase === 'pago'
      ? tituloVencimiento(hoja.vencimiento)
      : hoja?.movimiento
        ? 'Editar movimiento'
        : 'Cargar movimiento';

  return (
    <AppContexto.Provider value={valor}>
      {children}
      <Hoja titulo={titulo} abierta={Boolean(hoja)} onCerrar={cerrarHoja}>
        {hoja?.clase === 'pago' && <FormPago key={hoja.id} vencimiento={hoja.vencimiento} onListo={cerrarHoja} />}
        {hoja?.clase === 'movimiento' && <FormMovimiento key={hoja.id} movimiento={hoja.movimiento} tipoInicial={hoja.tipo} onListo={cerrarHoja} />}
      </Hoja>
      <div className="aviso-zona" aria-live="polite">
        {aviso && (
          <p key={aviso.id} className="aviso">
            {aviso.texto}
          </p>
        )}
      </div>
    </AppContexto.Provider>
  );
}
