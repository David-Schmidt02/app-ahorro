import { useState } from 'react';
import CampoMonto from '../componentes/CampoMonto';
import Cupos from '../componentes/Cupos';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono, { IconoCategoria } from '../componentes/Icono';
import PestanasPlan from '../componentes/PestanasPlan';
import { SelectorCategoria } from '../componentes/Selectores';
import SelectorMes from '../componentes/SelectorMes';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { diaCorto, nombreMesSolo } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';

const porcentaje = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 });
const sumar = (lista, campo) => lista.reduce((suma, x) => suma + x[campo], 0);

/** Lo de todas las categorías elegidas sumado semana por semana. */
function totalesPorSemana(datos, elegida) {
  const cupos = datos.cupos.filter((c) => elegida === null || c.categoria.id === elegida);
  return datos.semanas.map((semana, i) => {
    const deLaSemana = cupos.map((c) => c.semanas[i]);
    return { ...semana, cupo: sumar(deLaSemana, 'cupo'), disponible: sumar(deLaSemana, 'disponible'), gastado: sumar(deLaSemana, 'gastado') };
  });
}

const rango = (s) => (s.desde === s.hasta ? diaCorto(s.desde) : `${Number(s.desde.slice(8))} al ${diaCorto(s.hasta)}`);

function Aporte({ datos }) {
  const { aporte, objetivo_ars: objetivo } = datos;
  const semanas = totalesPorSemana(datos, null);
  const cupoMes = sumar(semanas, 'cupo');
  const gastado = sumar(semanas, 'gastado');
  const terminadas = datos.semanas.filter((s) => s.estado === 'pasada').length;

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Lo que aportan al ahorro en {nombreMesSolo(datos.mes)}</h2>
      {terminadas === 0 ? (
        <p className="tenue">Cuando termine la primera semana se ve acá lo que aportan.</p>
      ) : (
        <>
          <p className={`titular__monto${aporte < 0 ? ' es-negativo' : ''}`}>{dinero(aporte, 'ARS', { signo: aporte > 0 })}</p>
          <p className={`titular__nota ${aporte < 0 ? 'es-alerta' : 'es-bien'}`}>
            {aporte < 0
              ? 'Se pasaron en las semanas que terminaron: sale del ahorro.'
              : objetivo
                ? `${porcentaje.format(aporte / objetivo)} del objetivo de ahorro de ${dinero(objetivo)}.`
                : 'Es lo que les sobró en las semanas que terminaron.'}
          </p>
        </>
      )}
      <dl className="cifras cupos-cifras">
        <div>
          <dt>Cupo del mes</dt>
          <dd>{dinero(cupoMes)}</dd>
        </div>
        <div>
          <dt>Gastado</dt>
          <dd>{dinero(gastado)}</dd>
        </div>
        <div>
          <dt>{cupoMes >= gastado ? 'Queda' : 'Pasados'}</dt>
          <dd className={cupoMes < gastado ? 'es-alerta' : ''}>{dinero(Math.abs(cupoMes - gastado))}</dd>
        </div>
      </dl>
    </section>
  );
}

function Semanas({ datos }) {
  const [elegida, setElegida] = useState(null);
  const semanas = totalesPorSemana(datos, elegida);
  const tope = Math.max(...semanas.map((s) => Math.max(s.disponible, s.gastado, s.cupo)), 1);
  const ancho = (monto) => `${(Math.max(monto, 0) / tope) * 100}%`;

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Semana a semana</h2>
      {datos.cupos.length > 1 && (
        <div className="chips chips--libreta" role="group" aria-label="Ver una categoría">
          <button type="button" className="chip chip--chico" aria-pressed={elegida === null} onClick={() => setElegida(null)}>
            Todos
          </button>
          {datos.cupos.map(({ categoria: c }) => (
            <button
              key={c.id}
              type="button"
              className="chip chip--chico"
              style={{ '--chip': c.color }}
              aria-pressed={elegida === c.id}
              onClick={() => setElegida(elegida === c.id ? null : c.id)}
            >
              <IconoCategoria icono={c.icono} color={c.color} tamano="chico" />
              {c.nombre}
            </button>
          ))}
        </div>
      )}
      <ul className="semanas-cupo">
        {semanas.map((s) => {
          const resto = s.disponible - s.gastado;
          const futura = s.estado === 'futura';
          return (
            <li key={s.desde} className={`semana-cupo${s.estado === 'actual' ? ' es-actual' : ''}${futura ? ' es-futura' : ''}`}>
              <span className="semana-cupo__fecha">
                {rango(s)}
                {s.estado === 'actual' && <span className="semana-cupo__marca">esta semana</span>}
              </span>
              <span className={`semana-cupo__resultado ${futura ? 'tenue' : resto < 0 ? 'es-alerta' : 'es-bien'}`}>
                {futura ? `le tocan ${dinero(s.disponible)}` : resto < 0 ? `se pasaron ${dinero(-resto)}` : `${s.estado === 'actual' ? 'quedan' : 'sobraron'} ${dinero(resto)}`}
              </span>
              <span className="semana-cupo__pista" aria-hidden="true">
                <span className="semana-cupo__cupo" style={{ width: ancho(s.disponible) }} />
                {!futura && (
                  <span className={`semana-cupo__gastado${resto < 0 ? ' es-pasada' : ''}`} style={{ width: ancho(s.gastado) }} />
                )}
              </span>
              {!futura && (
                <span className="renglon__detalle semana-cupo__detalle">
                  Gastaron {dinero(s.gastado)} de {dinero(s.disponible)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FormCupo({ categoria, categorias, onListo }) {
  const { refrescar, avisar } = useApp();
  const [categoriaId, setCategoriaId] = useState(categoria?.id ?? null);
  const [monto, setMonto] = useState(montoATexto(categoria?.cupo_semanal));
  const [error, setError] = useState(null);
  const elegida = categoria ?? categorias.find((c) => c.id === categoriaId);

  const guardar = async (cupo, mensaje) => {
    try {
      await api(`/categorias/${elegida.id}`, { method: 'PATCH', body: { cupo_semanal: cupo, presupuesto: null } });
      refrescar();
      avisar(mensaje);
      onListo();
    } catch (err) {
      setError(err.message);
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    if (!elegida) return setError('Elegí una categoría');
    const valor = parsearMonto(monto);
    if (!valor) return setError('Poné cuánto por semana');
    return guardar(valor, 'Cupo guardado');
  };

  return (
    <form className="formulario" onSubmit={enviar}>
      {!categoria && <SelectorCategoria categorias={categorias} valor={categoriaId} onCambio={setCategoriaId} />}
      <CampoMonto id="cupo" etiqueta="Por semana" valor={monto} onCambio={setMonto} moneda="ARS" autoFocus={Boolean(categoria)} />
      {elegida?.presupuesto ? <p className="tenue">Reemplaza el presupuesto mensual de {dinero(elegida.presupuesto)}.</p> : null}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        {categoria && (
          <button type="button" className="boton boton--peligro" onClick={() => guardar(null, 'Cupo quitado')}>
            <Icono nombre="borrar" tamano={18} /> Quitar cupo
          </button>
        )}
        <button type="submit" className="boton boton--principal">
          {categoria ? 'Guardar' : 'Agregar cupo'}
        </button>
      </div>
    </form>
  );
}

function ListaCupos({ categorias, onEditar, onNuevo }) {
  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">Cupos</h2>
        <button type="button" className="boton boton--chico" onClick={onNuevo}>
          <Icono nombre="mas" tamano={16} grosor={2.4} /> Agregar
        </button>
      </header>
      <ul className="renglones">
        {categorias.map((c) => (
          <li key={c.id}>
            <button type="button" className="renglon renglon--boton" onClick={() => onEditar(c)}>
              <IconoCategoria icono={c.icono} color={c.color} />
              <span className="renglon__texto">
                <span className="renglon__titulo">{c.nombre}</span>
              </span>
              <span className="importe">{dinero(c.cupo_semanal)} por semana</span>
              <Icono nombre="editar" tamano={18} className="renglon__accion" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** La semana en curso con la forma de la tarjeta de Inicio. */
function semanaActual(datos) {
  const i = datos.semanas.findIndex((s) => s.estado === 'actual');
  if (i < 0) return null;
  const { desde, hasta } = datos.semanas[i];
  return { desde, hasta, cupos: datos.cupos.map((c) => ({ categoria: c.categoria, cupo_semanal: c.cupo_semanal, ...c.semanas[i] })) };
}

/** Plan › Cupos: la plata por semana de cada categoría, cómo viene cada semana del mes y lo que aportan al ahorro. */
export default function PlanCupos() {
  const { mes } = useApp();
  const { datos, error, reintentar } = useApi(`/cupos?mes=${mes}`);
  const { datos: categorias } = useApi('/categorias');
  const [hoja, setHoja] = useState(null);
  const deGasto = (categorias ?? []).filter((c) => c.tipo === 'gasto');
  const conCupo = deGasto.filter((c) => c.cupo_semanal != null);
  const sinCupo = deGasto.filter((c) => c.cupo_semanal == null);
  const nuevo = () => setHoja({ id: Date.now() });
  const editar = (c) => setHoja({ id: c.id, categoria: c });

  return (
    <>
      <header className="cabecera">
        <SelectorMes />
        <PestanasPlan />
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos?.cupos.length === 0 ? (
          <div className="tarjeta vacio">
            <p>Pongan un cupo por semana a lo que compran seguido, como el súper o las salidas.</p>
            <button type="button" className="boton boton--principal" onClick={nuevo}>
              Agregar un cupo
            </button>
          </div>
        ) : (
          datos && (
            <div className="dos-columnas dos-columnas--parejas pantalla">
              <div className="pila">
                <Aporte datos={datos} />
                <Cupos cupos={semanaActual(datos)} />
              </div>
              <div className="pila">
                <Semanas datos={datos} />
                <ListaCupos categorias={conCupo} onEditar={editar} onNuevo={nuevo} />
              </div>
            </div>
          )
        )}
      </Estado>
      <Hoja titulo={hoja?.categoria ? `Cupo de ${hoja.categoria.nombre}` : 'Nuevo cupo'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormCupo key={hoja.id} categoria={hoja.categoria} categorias={sinCupo} onListo={() => setHoja(null)} />}
      </Hoja>
    </>
  );
}
