import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import BarraMes from '../componentes/BarraMes';
import CierreMes from '../componentes/CierreMes';
import Estado from '../componentes/Estado';
import Evolucion from '../componentes/Evolucion';
import Icono, { IconoCategoria } from '../componentes/Icono';
import SelectorMes from '../componentes/SelectorMes';
import Torta from '../componentes/Torta';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { cuandoVence, diaCorto, diasHasta, mesActual, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero, tituloVencimiento } from '../lib/formato';

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

const textoVencimiento = (v) =>
  v.tipo === 'ingreso' ? cuandoVence(v.fecha).replace('vence', 'se cobra').replace('venció', 'se cobraba') : cuandoVence(v.fecha);

function Vencimiento({ v }) {
  const { abrirPago } = useApp();
  const vencido = !v.pagado && v.tipo === 'gasto' && diasHasta(v.fecha) < 0;
  return (
    <li className="renglon renglon--tabla">
      {v.pagado ? (
        <span className="marca-pago es-hecha" aria-hidden="true">
          <Icono nombre="check" tamano={16} grosor={2.6} />
        </span>
      ) : (
        <button
          type="button"
          className={`marca-pago${v.tipo === 'ingreso' ? ' es-ingreso' : ''}`}
          onClick={() => abrirPago(v)}
          aria-label={`${v.tipo === 'ingreso' ? 'Registrar cobro de' : 'Registrar pago de'} ${v.nombre}`}
        />
      )}
      <span className="renglon__texto">
        <span className="renglon__titulo" title={tituloVencimiento(v)}>
          {tituloVencimiento(v)}
        </span>
        <span className={`renglon__detalle${vencido ? ' es-alerta' : ''}`}>{v.pagado ? 'Registrado' : textoVencimiento(v)}</span>
      </span>
      <span className="renglon__columna">
        <IconoCategoria icono={v.categoria.icono} color={v.categoria.color} tamano="chico" />
        {v.categoria.nombre}
      </span>
      <span className="renglon__columna">{diaCorto(v.fecha)}</span>
      <span className={`importe${v.moneda === 'USD' ? ' es-usd' : ''}${v.tipo === 'ingreso' && !v.pagado ? ' es-ingreso' : ''}`}>
        {dinero(v.monto, v.moneda, { signo: v.tipo === 'ingreso' })}
      </span>
    </li>
  );
}

function Pendientes({ vencimientos }) {
  const [verPagados, setVerPagados] = useState(false);
  const pendientes = vencimientos.filter((v) => !v.pagado);
  const pagados = vencimientos.filter((v) => v.pagado);
  if (!vencimientos.length) return null;

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">
          Pagos y cobros del mes{' '}
          {pendientes.length > 0 && (
            <span className="tenue">
              · {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        {pagados.length > 0 && (
          <button type="button" className="enlace-boton" onClick={() => setVerPagados((x) => !x)} aria-expanded={verPagados}>
            {verPagados ? 'Ocultar' : 'Ver'} {pagados.length} ya registrado
            {pagados.length > 1 ? 's' : ''}
          </button>
        )}
      </header>
      {pendientes.length === 0 && <p className="tenue">Todo lo programado para este mes ya está registrado.</p>}
      <ul className="renglones">
        {pendientes.map((v) => (
          <Vencimiento key={v.programado_id} v={v} />
        ))}
      </ul>
      {verPagados && (
        <ul className="renglones es-hecho">
          {pagados.map((v) => (
            <Vencimiento key={v.programado_id} v={v} />
          ))}
        </ul>
      )}
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
  const navegar = useNavigate();
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
          <div className="tablero tablero--parejo pantalla">
            <div className="tablero__columna">
              <section className="tarjeta tarjeta--mes" style={{ '--orden': 1, '--orden-escritorio': 1 }}>
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
              <div className="tablero__celda tablero__celda--ancho" style={{ '--orden': 4, '--orden-escritorio': 3 }}>
                <Evolucion />
              </div>
            </div>
            <div className="tablero__columna">
              <div className="tablero__celda tablero__celda--ancho" style={{ '--orden': 0, '--orden-escritorio': 0 }}>
                <CierreMes />
              </div>
              <div className="tablero__celda" style={{ '--orden': 3, '--orden-escritorio': 2 }}>
                <Torta categorias={resumen.categorias} onElegir={(id) => id && navegar(`/movimientos?categoria=${id}`)} />
              </div>
              <div className="tablero__celda tablero__celda--ancho" style={{ '--orden': 2, '--orden-escritorio': 4 }}>
                <Pendientes vencimientos={resumen.vencimientos} />
              </div>
              {resumen.gastos_mes_anterior > 0 && (
                <p className="pie tablero__celda--ancho" style={{ '--orden': 5, '--orden-escritorio': 5 }}>
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
