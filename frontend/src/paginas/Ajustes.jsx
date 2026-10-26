import { useState } from 'react';
import CampoMonto from '../componentes/CampoMonto';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono from '../componentes/Icono';
import { useApp, useSesion } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';

const COLORES = ['#1BAF7A', '#2A78D6', '#EDA100', '#6250D6', '#E34948', '#EB6834', '#E87BA4', '#008300', '#B0478A', '#7A7F8A'];

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
    <form className="seccion formulario" onSubmit={guardar}>
      <h2 className="seccion__titulo">Objetivo de ahorro mensual</h2>
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

function FormCategoria({ categoria, tipoInicial, onListo }) {
  const { refrescar, avisar } = useApp();
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [icono, setIcono] = useState(categoria?.icono ?? '🏷️');
  const [color, setColor] = useState(categoria?.color ?? COLORES[0]);
  const [presupuesto, setPresupuesto] = useState(montoATexto(categoria?.presupuesto));
  const [error, setError] = useState(null);
  const tipo = categoria?.tipo ?? tipoInicial;

  const enviar = async (metodo, ruta, cuerpo, mensaje) => {
    try {
      await api(ruta, { method: metodo, body: cuerpo });
      refrescar();
      avisar(mensaje);
      onListo();
    } catch (err) {
      setError(err.message);
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('Poné un nombre');
    if (!icono.trim()) return setError('Elegí un emoji');
    const valor = presupuesto.trim() ? parsearMonto(presupuesto) : null;
    if (presupuesto.trim() && !valor) return setError('El presupuesto tiene que ser un monto válido');
    const cuerpo = { nombre: nombre.trim(), icono: icono.trim(), color, presupuesto: tipo === 'gasto' ? valor : null };
    if (categoria) return enviar('PATCH', `/categorias/${categoria.id}`, cuerpo, 'Categoría guardada');
    return enviar('POST', '/categorias', { ...cuerpo, tipo }, 'Categoría creada');
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      <div className="campos-en-fila campos-en-fila--emoji">
        <label className="campo">
          <span>Emoji</span>
          <input value={icono} onChange={(e) => setIcono(e.target.value)} maxLength={4} className="input-emoji" />
        </label>
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} autoFocus={!categoria} />
        </label>
      </div>
      <fieldset className="campo">
        <legend>Color</legend>
        <div className="colores" role="radiogroup">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              className="color"
              style={{ '--color': c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </fieldset>
      {tipo === 'gasto' && (
        <CampoMonto id="presupuesto" etiqueta="Presupuesto mensual (opcional)" valor={presupuesto} onCambio={setPresupuesto} moneda="ARS" />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        {categoria && (
          <button
            type="button"
            className="boton"
            onClick={() =>
              enviar(
                'PATCH',
                `/categorias/${categoria.id}`,
                { activa: !categoria.activa },
                categoria.activa ? 'Categoría archivada' : 'Categoría restaurada',
              )
            }
          >
            {categoria.activa ? 'Archivar' : 'Restaurar'}
          </button>
        )}
        <button type="submit" className="boton boton--principal">
          {categoria ? 'Guardar' : 'Crear categoría'}
        </button>
      </div>
    </form>
  );
}

function Categorias() {
  const { datos: categorias, error, reintentar } = useApi('/categorias?incluir_archivadas=true');
  const [hoja, setHoja] = useState(null);

  const grupo = (tipo, titulo) => {
    const lista = (categorias ?? []).filter((c) => c.tipo === tipo);
    return (
      <div className="grupo-categorias">
        <h3 className="subtitulo">
          {titulo}
          <button type="button" className="enlace-boton" onClick={() => setHoja({ id: Date.now(), tipo })}>
            + Nueva
          </button>
        </h3>
        <ul className="renglones">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`renglon renglon--boton${c.activa ? '' : ' es-archivada'}`}
                onClick={() => setHoja({ id: c.id, categoria: c })}
              >
                <span className="renglon__icono" style={{ '--color': c.color }} aria-hidden="true">
                  {c.icono}
                </span>
                <span className="renglon__texto">
                  <span className="renglon__titulo">{c.nombre}</span>
                  {!c.activa && <span className="renglon__detalle">Archivada</span>}
                </span>
                {c.presupuesto ? <span className="importe tenue">{dinero(c.presupuesto)}/mes</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <section className="seccion">
      <h2 className="seccion__titulo">Categorías</h2>
      <p className="tenue">Con presupuesto, en Inicio ven cuánto llevan gastado de cada una.</p>
      <Estado datos={categorias} error={error} reintentar={reintentar}>
        {grupo('gasto', 'De gastos')}
        {grupo('ingreso', 'De ingresos')}
      </Estado>
      <Hoja titulo={hoja?.categoria ? hoja.categoria.nombre : 'Nueva categoría'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormCategoria key={hoja.id} categoria={hoja.categoria} tipoInicial={hoja.tipo} onListo={() => setHoja(null)} />}
      </Hoja>
    </section>
  );
}

function Dolar() {
  const { datos, error } = useApi('/cotizacion');
  return (
    <section className="seccion">
      <h2 className="seccion__titulo">Dólar blue</h2>
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

export default function Ajustes() {
  const { usuario, salir } = useSesion();
  const { datos: preferencias, error, reintentar } = useApi('/preferencias');

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Ajustes</h1>
      </header>
      <div className="dos-columnas dos-columnas--parejas">
        <div className="pila">
          <Estado datos={preferencias} error={error} reintentar={reintentar}>
            {preferencias && <Objetivo preferencias={preferencias} />}
          </Estado>
          <Dolar />
          <section className="seccion">
            <h2 className="seccion__titulo">Cuenta</h2>
            <p>
              {usuario.nombre} <span className="tenue">· {usuario.email}</span>
            </p>
            <button type="button" className="boton" onClick={salir}>
              <Icono nombre="salir" tamano={18} /> Cerrar sesión
            </button>
          </section>
        </div>
        <Categorias />
      </div>
    </>
  );
}
