import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import BarraMes from '../componentes/BarraMes';
import Estado from '../componentes/Estado';
import Evolucion from '../componentes/Evolucion';
import Icono from '../componentes/Icono';
import SelectorMes from '../componentes/SelectorMes';
import Torta from '../componentes/Torta';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { cuandoVence, diasHasta, mesActual, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero } from '../lib/formato';

function Titular({ resumen, esActual }) {
  const { proyeccion, objetivo_ars: objetivo, ingresos, pendiente_ingresos: porCobrar } = resumen;
  if (ingresos + porCobrar === 0) {
    return (
      <div className="titular">
        <p className="titular__rotulo">Todavía no hay ingresos este mes</p>
        <p className="titular__nota">Cargá el sueldo (o programalo en Fijos) para ver cuánto les queda.</p>
      </div>
    );
  }
  const faltante = objetivo ? objetivo - proyeccion : null;
  const textoObjetivo = resumen.objetivo_moneda === 'USD' ? `${dinero(resumen.objetivo, 'USD')} (${dinero(objetivo)})` : dinero(objetivo);
  return (
    <div className="titular">
      <p className="titular__rotulo">{esActual ? 'Si se paga todo lo programado, les quedan' : 'Al cierre del mes quedan'}</p>
      <p className={`titular__monto${proyeccion < 0 ? ' es-negativo' : ''}`}>{dinero(proyeccion)}</p>
      {objetivo ? (
        <p className={`titular__nota ${faltante > 0 ? 'es-alerta' : 'es-bien'}`}>
          {faltante > 0
            ? `Faltan ${dinero(faltante)} para el objetivo de ahorro de ${textoObjetivo}.`
            : `Cumplen el objetivo de ahorro de ${textoObjetivo}${faltante < 0 ? ` y sobran ${dinero(-faltante)}` : ''}.`}
        </p>
      ) : (
        <p className="titular__nota">
          <Link to="/ajustes">Definí un objetivo de ahorro mensual</Link> para seguirlo acá.
        </p>
      )}
    </div>
  );
}

function Pendientes({ vencimientos }) {
  const { abrirPago } = useApp();
  const [verPagados, setVerPagados] = useState(false);
  const pendientes = vencimientos.filter((v) => !v.pagado);
  const pagados = vencimientos.filter((v) => v.pagado);
  if (!vencimientos.length) return null;

  return (
    <section className="seccion">
      <h2 className="seccion__titulo">Pagos y cobros del mes</h2>
      {pendientes.length === 0 && <p className="tenue">Todo lo programado para este mes ya está registrado.</p>}
      <ul className="renglones">
        {pendientes.map((v) => {
          const vencido = v.tipo === 'gasto' && diasHasta(v.fecha) < 0;
          return (
            <li key={v.programado_id} className="renglon">
              <button
                type="button"
                className={`marca-pago${v.tipo === 'ingreso' ? ' es-ingreso' : ''}`}
                onClick={() => abrirPago(v)}
                aria-label={`${v.tipo === 'ingreso' ? 'Registrar cobro de' : 'Registrar pago de'} ${v.nombre}`}
              />
              <div className="renglon__texto">
                <span className="renglon__titulo">{v.nombre}</span>
                <span className={`renglon__detalle${vencido ? ' es-alerta' : ''}`}>
                  {v.tipo === 'ingreso'
                    ? cuandoVence(v.fecha).replace('vence', 'se cobra').replace('venció', 'se cobraba')
                    : cuandoVence(v.fecha)}
                </span>
              </div>
              <span className={`importe${v.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>
                {dinero(v.monto, v.moneda, { signo: v.tipo === 'ingreso' })}
              </span>
            </li>
          );
        })}
      </ul>
      {pagados.length > 0 && (
        <>
          <button type="button" className="enlace-boton" onClick={() => setVerPagados((x) => !x)} aria-expanded={verPagados}>
            {verPagados ? 'Ocultar' : 'Ver'} {pagados.length} ya registrado{pagados.length > 1 ? 's' : ''}
          </button>
          {verPagados && (
            <ul className="renglones es-hecho">
              {pagados.map((v) => (
                <li key={v.programado_id} className="renglon">
                  <span className="marca-pago es-hecha" aria-hidden="true">
                    <Icono nombre="check" tamano={16} grosor={2.6} />
                  </span>
                  <div className="renglon__texto">
                    <span className="renglon__titulo">{v.nombre}</span>
                  </div>
                  <span className="importe">{dinero(v.monto, v.moneda)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Categorias({ categorias }) {
  if (!categorias.length) return null;
  // Sin presupuesto, la barra se compara con la categoría que más se llevó
  const mayor = Math.max(...categorias.map((c) => c.gastado + c.pendiente), 1);
  return (
    <section className="seccion">
      <h2 className="seccion__titulo">En qué se fue</h2>
      <ul className="categorias">
        {categorias.map(({ categoria, gastado, pendiente, presupuesto }) => {
          const tope = presupuesto ? Math.max(presupuesto, gastado + pendiente) : mayor;
          const pasado = presupuesto && gastado + pendiente > presupuesto;
          return (
            <li key={categoria.id} className="categoria-fila" style={{ '--color': categoria.color }}>
              <span className="categoria-fila__icono" aria-hidden="true">
                {categoria.icono}
              </span>
              <div className="categoria-fila__cuerpo">
                <div className="categoria-fila__encabezado">
                  <span>{categoria.nombre}</span>
                  <span className="importe">
                    {dinero(gastado)}
                    {presupuesto ? <span className="tenue"> / {dinero(presupuesto)}</span> : null}
                  </span>
                </div>
                <div className={`mini-barra${pasado ? ' es-pasada' : ''}`} aria-hidden="true">
                  <span style={{ width: `${(gastado / tope) * 100}%` }} />
                  <span className="mini-barra__pendiente" style={{ width: `${(pendiente / tope) * 100}%` }} />
                </div>
                {(pendiente > 0 || pasado) && (
                  <span className={`renglon__detalle${pasado ? ' es-alerta' : ''}`}>
                    {pendiente > 0 && `${dinero(pendiente)} por pagar`}
                    {pendiente > 0 && pasado && ' · '}
                    {pasado && `se pasa por ${dinero(gastado + pendiente - presupuesto)}`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Tira confeti la primera vez que se ve el objetivo cumplido en un mes. */
function useFestejo(resumen) {
  const festejado = useRef(new Set());
  useEffect(() => {
    if (!resumen?.objetivo_ars || resumen.ahorro < resumen.objetivo_ars) return;
    const clave = `ahorro.festejo.${resumen.mes}`;
    try {
      if (festejado.current.has(clave) || localStorage.getItem(clave)) return;
      localStorage.setItem(clave, '1');
    } catch {
      if (festejado.current.has(clave)) return;
    }
    festejado.current.add(clave);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.3 }, colors: ['#2443C4', '#16865A', '#D9434B', '#F0B04A'] });
    }
  }, [resumen]);
}

export default function Inicio() {
  const { mes } = useApp();
  const { datos: resumen, error, reintentar } = useApi(`/resumen?mes=${mes}`);
  const esActual = mes === mesActual();
  useFestejo(resumen);

  return (
    <>
      <header className="cabecera">
        <SelectorMes />
        <Link to="/ajustes" className="boton-icono solo-celular" aria-label="Ajustes">
          <Icono nombre="ajustes" />
        </Link>
      </header>
      <Estado datos={resumen} error={error} reintentar={reintentar}>
        {resumen && (
          <div className="tablero">
            <div className="tablero__columna">
              <section className="tarjeta-mes orden-1">
                <Titular resumen={resumen} esActual={esActual} />
                <BarraMes resumen={resumen} />
                <dl className="cifras">
                  <div>
                    <dt>Entró</dt>
                    <dd className="es-ingreso">{dinero(resumen.ingresos)}</dd>
                  </div>
                  <div>
                    <dt>Salió</dt>
                    <dd>{dinero(resumen.gastos)}</dd>
                  </div>
                  <div>
                    <dt>Ahorrado</dt>
                    <dd className={resumen.ahorro < 0 ? 'es-alerta' : ''}>{dinero(resumen.ahorro)}</dd>
                  </div>
                </dl>
              </section>
              <div className="orden-5">
                <Evolucion />
              </div>
              <div className="orden-4">
                <Categorias categorias={resumen.categorias} />
              </div>
            </div>
            <div className="tablero__columna tablero__columna--lateral">
              <div className="orden-2">
                <Pendientes vencimientos={resumen.vencimientos} />
              </div>
              <div className="orden-3">
                <Torta categorias={resumen.categorias} />
              </div>
              {resumen.gastos_mes_anterior > 0 && (
                <p className="pie orden-6">
                  En {nombreMesSolo(sumarMeses(mes, -1))} gastaron {dinero(resumen.gastos_mes_anterior)}.
                </p>
              )}
            </div>
          </div>
        )}
      </Estado>
    </>
  );
}
