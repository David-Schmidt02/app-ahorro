import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FormPago from '../componentes/FormPago';
import FormRegistro from '../componentes/FormRegistro';
import Hoja from '../componentes/Hoja';
import { mesActual, sumarMeses } from '../lib/fechas';
import { esAtajo } from '../lib/teclado';
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

  // Atajos de escritorio: C carga, H vuelve al mes de hoy, Alt + flechas cambia de mes
  useEffect(() => {
    const alTeclear = (e) => {
      if (!esAtajo(e)) return;
      const tecla = e.key.toLowerCase();
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setMes((m) => sumarMeses(m, e.key === 'ArrowLeft' ? -1 : 1));
      } else if (!e.altKey && tecla === 'c') {
        e.preventDefault();
        setHoja({ clase: 'registro', id: Date.now() });
      } else if (!e.altKey && tecla === 'h') {
        setMes(mesActual());
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  const valor = useMemo(
    () => ({
      mes,
      setMes,
      version,
      refrescar,
      avisar,
      /** Sin argumentos: carga rápida. Con { movimiento } o { programado }: edición. Con { tipo, modo }: alta con esos valores. */
      abrirCarga: (opciones = {}) => setHoja({ clase: 'registro', id: Date.now(), ...opciones }),
      abrirPago: (vencimiento) => setHoja({ clase: 'pago', id: Date.now(), vencimiento }),
    }),
    [mes, version, refrescar, avisar],
  );

  const titulo =
    hoja?.clase === 'pago'
      ? tituloVencimiento(hoja.vencimiento)
      : hoja?.movimiento
        ? 'Editar movimiento'
        : hoja?.programado
          ? hoja.programado.nombre
          : 'Cargar';

  return (
    <AppContexto.Provider value={valor}>
      {children}
      <Hoja titulo={titulo} abierta={Boolean(hoja)} onCerrar={cerrarHoja}>
        {hoja?.clase === 'pago' && <FormPago key={hoja.id} vencimiento={hoja.vencimiento} onListo={cerrarHoja} />}
        {hoja?.clase === 'registro' && (
          <FormRegistro
            key={hoja.id}
            movimiento={hoja.movimiento}
            programado={hoja.programado}
            tipoInicial={hoja.tipo}
            modoInicial={hoja.modo}
            onListo={cerrarHoja}
          />
        )}
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
