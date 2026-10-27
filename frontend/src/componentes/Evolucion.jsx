import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useAncho } from '../estado/useAncho';
import { useApi } from '../estado/useApi';
import { nombreMes, nombreMesSolo } from '../lib/fechas';
import { dinero } from '../lib/formato';

const SERIES = [
  { clave: 'ingresos', nombre: 'Ingresos' },
  { clave: 'gastos', nombre: 'Gastos' },
  { clave: 'ahorro', nombre: 'Ahorro' },
];
const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 16, abajo: 28, izquierda: 64 };
const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** Marcas redondas del eje: 0, 500 mil, 1 M… */
function marcas(minimo, maximo) {
  const rango = Math.max(maximo - minimo, 1);
  const crudo = rango / 4;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= crudo);
  const desde = Math.floor(minimo / paso) * paso;
  const hasta = Math.ceil(maximo / paso) * paso;
  const lista = [];
  for (let v = desde; v <= hasta + paso / 2; v += paso) lista.push(Math.round(v));
  return lista;
}

const mesCorto = (mes) => nombreMesSolo(mes).slice(0, 3);

function Grafico({ datos, mesElegido }) {
  const [ref, ancho] = useAncho();
  const [indice, setIndice] = useState(null);
  const { meses, objetivo_ars: objetivo } = datos;

  const valores = meses.flatMap((m) => SERIES.map((s) => m[s.clave]));
  if (objetivo) valores.push(objetivo);
  const ejes = marcas(Math.min(0, ...valores), Math.max(...valores, 1));
  const [yMin, yMax] = [ejes[0], ejes[ejes.length - 1]];

  const anchoUtil = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 100);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (i) => MARGEN.izquierda + (meses.length === 1 ? anchoUtil / 2 : (i / (meses.length - 1)) * anchoUtil);
  const y = (v) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin)) * altoUtil;

  const elegirPorPuntero = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const relativo = (e.clientX - caja.left - MARGEN.izquierda) / anchoUtil;
    setIndice(Math.max(0, Math.min(meses.length - 1, Math.round(relativo * (meses.length - 1)))));
  };

  const moverConTeclado = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const actual = indice ?? meses.length - 1;
    setIndice(Math.max(0, Math.min(meses.length - 1, actual + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const punto = indice !== null ? meses[indice] : null;
  const tooltipIzquierda = indice !== null ? Math.min(Math.max(x(indice) - 90, 0), ancho - 180) : 0;

  return (
    <div className="grafico-lineas" ref={ref}>
      <svg
        width={ancho}
        height={ALTO}
        role="img"
        aria-label="Ingresos, gastos y ahorro por mes. Usá las flechas para recorrer los meses; el detalle también está en la tabla."
        tabIndex={0}
        onPointerMove={elegirPorPuntero}
        onPointerLeave={() => setIndice(null)}
        onKeyDown={moverConTeclado}
        onBlur={() => setIndice(null)}
      >
        {ejes.map((v) => (
          <g key={v}>
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(v)} y2={y(v)} className={v === 0 ? 'eje-cero' : 'eje-guia'} />
            <text x={MARGEN.izquierda - 10} y={y(v)} dy="0.32em" textAnchor="end" className="eje-texto">
              {v === 0 ? '$ 0' : `$ ${compacto.format(v)}`}
            </text>
          </g>
        ))}
        {meses.map((m, i) => (
          <text key={m.mes} x={x(i)} y={ALTO - 8} textAnchor="middle" className={`eje-texto${m.mes === mesElegido ? ' es-elegido' : ''}`}>
            {mesCorto(m.mes)}
          </text>
        ))}
        {objetivo ? (
          <g>
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(objetivo)} y2={y(objetivo)} className="linea-objetivo" />
            <text x={ancho - MARGEN.derecha} y={y(objetivo) - 6} textAnchor="end" className="eje-texto">
              objetivo de ahorro
            </text>
          </g>
        ) : null}
        {indice !== null && <line x1={x(indice)} x2={x(indice)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="mira" />}
        {SERIES.map((s) => (
          <g key={s.clave} className={`serie serie--${s.clave}`}>
            <polyline points={meses.map((m, i) => `${x(i)},${y(m[s.clave])}`).join(' ')} />
            {meses.map((m, i) => (
              <circle key={m.mes} cx={x(i)} cy={y(m[s.clave])} r={indice === i ? 5.5 : 4} />
            ))}
          </g>
        ))}
      </svg>
      {punto && (
        <div className="tooltip" style={{ left: tooltipIzquierda }} role="status">
          <p className="tooltip__titulo">{nombreMes(punto.mes)}</p>
          {SERIES.map((s) => (
            <p key={s.clave} className="tooltip__fila">
              <span className={`clave-linea serie--${s.clave}`} aria-hidden="true" />
              <strong>{dinero(punto[s.clave])}</strong>
              <span>{s.nombre}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Evolución mensual: ingresos, gastos y ahorro de los últimos meses hasta el mes elegido. */
export default function Evolucion() {
  const { mes } = useApp();
  const [cantidad, setCantidad] = useState(6);
  const { datos } = useApi(`/evolucion?hasta=${mes}&meses=${cantidad}`);
  const conMovimientos = datos?.meses.filter((m) => m.ingresos || m.gastos).length ?? 0;

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">Cómo vienen los meses</h2>
        <div className="segmentado segmentado--chico" role="group" aria-label="Período">
          {[6, 12].map((n) => (
            <button key={n} type="button" aria-pressed={cantidad === n} onClick={() => setCantidad(n)}>
              {n} meses
            </button>
          ))}
        </div>
      </header>
      <ul className="leyenda-series" aria-hidden="true">
        {SERIES.map((s) => (
          <li key={s.clave}>
            <span className={`clave-linea serie--${s.clave}`} />
            {s.nombre}
          </li>
        ))}
      </ul>
      {!datos && <div className="grafico-lineas grafico-lineas--cargando" />}
      {datos && conMovimientos < 2 && <p className="tenue">Con dos meses cargados aparece acá la comparación.</p>}
      {datos && conMovimientos >= 2 && (
        <>
          <Grafico datos={datos} mesElegido={mes} />
          <details className="tabla-datos">
            <summary>Ver como tabla</summary>
            <table>
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  {SERIES.map((s) => (
                    <th key={s.clave} scope="col">
                      {s.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.meses.map((m) => (
                  <tr key={m.mes}>
                    <th scope="row">{nombreMes(m.mes)}</th>
                    {SERIES.map((s) => (
                      <td key={s.clave} className="importe">
                        {dinero(m[s.clave])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
