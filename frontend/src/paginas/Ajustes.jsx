import { useState } from 'react';
import { Externos, Suscripcion } from '../componentes/Calendarios';
import CampoMonto from '../componentes/CampoMonto';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import { CALENDARIOS_CONECTADOS_HABILITADOS } from '../config/features';
import { useApp, useSesion } from '../estado/contextos';
import { TEMAS, useTema } from '../estado/tema';
import { useApi } from '../estado/useApi';
import { api, descargar } from '../lib/api';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';

function Objetivo({ preferencias }) {
  const { refrescar, avisar } = useApp();
  const [monto, setMonto] = useState(montoATexto(preferencias.objetivo));
  const [moneda, setMoneda] = useState(preferencias.objetivo_moneda);
  const [error, setError] = useState(null);

  const guardar = async (e) => {
    e.preventDefault();
    const valor = monto.trim() ? parsearMonto(monto) : null;
    if (monto.trim() && !valor) return setError('Ingresá un monto válido, o dejalo vacío para no tener objetivo');
    try {
      await api('/preferencias', { method: 'PUT', body: { objetivo: valor, objetivo_moneda: moneda } });
      setError(null);
      refrescar();
      avisar(valor ? 'Objetivo de ahorro guardado' : 'Objetivo de ahorro quitado');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta formulario" onSubmit={guardar}>
      <h2 className="tarjeta__titulo">Objetivo de ahorro mensual</h2>
      <p className="tenue">Lo que quieren que quede sin gastar cada mes. En Inicio se ve si llegan.</p>
      <CampoMonto id="objetivo" etiqueta="Por mes" valor={monto} onCambio={setMonto} moneda={moneda} onMoneda={setMoneda} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        <button type="submit" className="boton boton--principal">
          Guardar objetivo
        </button>
      </div>
    </form>
  );
}

/** En escritorio el tema y la cuenta están al pie de la barra lateral. */
function Apariencia() {
  const [tema, setTema] = useTema();
  return (
    <section className="tarjeta solo-celular">
      <h2 className="tarjeta__titulo">Apariencia</h2>
      <div className="segmentado" role="group" aria-label="Tema">
        {TEMAS.map((t) => (
          <button key={t.valor} type="button" aria-pressed={tema === t.valor} onClick={() => setTema(t.valor)}>
            <Icono nombre={t.icono} tamano={18} /> {t.nombre}
          </button>
        ))}
      </div>
      <p className="tenue">«Sistema» sigue el modo claro u oscuro del dispositivo.</p>
    </section>
  );
}

function Dolar() {
  const { datos, error } = useApi('/cotizacion');
  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Dólar blue</h2>
      {error && <p className="tenue">{error.message}</p>}
      {datos && (
        <p>
          Compra <strong className="importe">{dinero(datos.compra)}</strong> · Venta{' '}
          <strong className="importe">{dinero(datos.venta)}</strong>
          <br />
          <span className="tenue">
            Se usa la venta para pasar a pesos lo que se carga en dólares. Actualizada{' '}
            {new Date(`${datos.obtenida_en}Z`).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}.
          </span>
        </p>
      )}
    </section>
  );
}

function Respaldo() {
  const { avisar } = useApp();
  const [error, setError] = useState(null);
  const bajar = (ruta) =>
    descargar(ruta).then(
      () => {
        setError(null);
        avisar('Copia descargada');
      },
      (err) => setError(err.message),
    );

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Copia de seguridad</h2>
      <p className="tenue">
        Todo vive en un solo archivo en el servidor. Bajen una copia cada tanto: la base completa sirve para restaurar la app; el CSV abre los
        movimientos en una planilla.
      </p>
      <div className="acciones acciones--inicio">
        <button type="button" className="boton boton--chico" onClick={() => bajar('/respaldo/base')}>
          <Icono nombre="descargar" tamano={18} /> Base completa
        </button>
        <button type="button" className="boton boton--chico" onClick={() => bajar('/respaldo/movimientos.csv')}>
          <Icono nombre="descargar" tamano={18} /> Movimientos (CSV)
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default function Ajustes() {
  const { usuario, salir } = useSesion();
  const { datos: preferencias, error, reintentar } = useApi('/preferencias');

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Ajustes</h1>
      </header>
      <div className="dos-columnas dos-columnas--parejas pantalla">
        <div className="pila">
          <Estado datos={preferencias} error={error} reintentar={reintentar}>
            {preferencias && <Objetivo preferencias={preferencias} />}
          </Estado>
          <Apariencia />
          {CALENDARIOS_CONECTADOS_HABILITADOS && <Suscripcion />}
        </div>
        <div className="pila">
          {CALENDARIOS_CONECTADOS_HABILITADOS && <Externos />}
          <Dolar />
          <Respaldo />
          <section className="tarjeta solo-celular">
            <h2 className="tarjeta__titulo">Cuenta</h2>
            <p>
              {usuario.nombre} <span className="tenue">· {usuario.email}</span>
            </p>
            <button type="button" className="boton" onClick={salir}>
              <Icono nombre="salir" tamano={18} /> Cerrar sesión
            </button>
            <p className="tenue">Las categorías se editan en Movimientos → Categorías.</p>
          </section>
        </div>
      </div>
    </>
  );
}
