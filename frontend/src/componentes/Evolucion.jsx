import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useAncho } from '../estado/useAncho';
import { useApi } from '../estado/useApi';
import { conParams } from '../lib/api';
import { deISO, diaCorto, diaLargo, diasDelMes, hoy, mesActual, nombreMes, nombreMesSolo, sumarDias } from '../lib/fechas';
import { dinero } from '../lib/formato';
import Icono from './Icono';

const SERIES_MESES = [
  { clave: 'ingresos', nombre: 'Ingresos' },
  { clave: 'gastos', nombre: 'Gastos' },
  { clave: 'ahorro', nombre: 'Ahorro' },
];
const SERIE_DIA = { clave: 'variable', nombre: 'Del día a día' };
const SERIE_FIJOS = { clave: 'fijos', nombre: 'Fijos' };
const PERIODOS_DIARIOS = ['30', 'mes'];

const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 16, abajo: 28, izquierda: 64 };
const ANCHO_ETIQUETA = 34;
const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** Elección guardada en el dispositivo (tipo de gráfico, período…). */
function useRecordado(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      return localStorage.getItem(clave) ?? inicial;
    } catch {
      return inicial;
    }
  });
  const guardar = (nuevo) => {
    setValor(nuevo);
    try {
      localStorage.setItem(clave, nuevo);
    } catch {
      // sin almacenamiento: la elección dura lo que la pantalla
    }
  };
  return [valor, guardar];
}

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

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Barras o líneas sobre una escala por bandas, así cambiar de tipo no mueve los puntos.
 * `puntos`: [{ clave, eje, titulo, valores: { [serie]: monto }, futuro, resaltado }].
 * `apilado`: las series se suman en una sola barra (gasto del día a día + fijos).
 * `referencia`: monto de la línea horizontal (objetivo o promedio); su nombre va en la leyenda.
 */
function Grafico({ puntos, series, tipo, apilado, referencia, descripcion }) {
  const [ref, ancho] = useAncho();
  const [indice, setIndice] = useState(null);
  const n = puntos.length;
  const total = (p) => series.reduce((suma, s) => suma + p.valores[s.clave], 0);

  const valores = apilado ? puntos.map(total) : puntos.flatMap((p) => series.map((s) => p.valores[s.clave]));
  if (referencia) valores.push(referencia);
  const ejes = marcas(Math.min(0, ...valores), Math.max(...valores, 1));
  const [yMin, yMax] = [ejes[0], ejes[ejes.length - 1]];

  const anchoUtil = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 100);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const banda = anchoUtil / n;
  const centro = (i) => MARGEN.izquierda + banda * (i + 0.5);
  const y = (v) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin)) * altoUtil;
  const cadaEtiqueta = Math.ceil(n / Math.max(1, Math.floor(anchoUtil / ANCHO_ETIQUETA)));

  const anchoGrupo = Math.min(banda * 0.7, apilado ? 26 : 48);
  const anchoBarra = apilado ? anchoGrupo : anchoGrupo / series.length;
  const separacion = !apilado && anchoBarra > 6 ? 1.5 : 0;

  const elegirPorPuntero = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    setIndice(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - caja.left - MARGEN.izquierda) / banda))));
  };

  const moverConTeclado = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const actual = indice ?? n - 1;
    setIndice(Math.max(0, Math.min(n - 1, actual + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const barra = (clave, x, ancho_, desde, hasta, clase) => {
    const [arriba, abajo] = [y(Math.max(desde, hasta)), y(Math.min(desde, hasta))];
    if (abajo - arriba < 0.5) return null;
    return <rect key={clave} x={x} y={arriba} width={Math.max(ancho_ - separacion, 1)} height={abajo - arriba} rx={Math.min(3, ancho_ / 4)} className={clase} />;
  };

  const barras = puntos.flatMap((p, i) => {
    if (p.futuro) return [];
    const izquierda = centro(i) - anchoGrupo / 2;
    if (apilado) {
      let base = 0;
      return series.map((s) => {
        const desde = base;
        base += p.valores[s.clave];
        return barra(`${p.clave}-${s.clave}`, izquierda, anchoBarra, desde, base, `barra serie--${s.clave}`);
      });
    }
    return series.map((s, j) => barra(`${p.clave}-${s.clave}`, izquierda + j * anchoBarra, anchoBarra, 0, p.valores[s.clave], `barra serie--${s.clave}`));
  });

  // En líneas, lo apilado se dibuja como una sola línea con el total
  const lineas = apilado ? [{ ...series[0], valor: total }] : series.map((s) => ({ ...s, valor: (p) => p.valores[s.clave] }));
  const conPuntos = n <= 15;
  const punto = indice !== null ? puntos[indice] : null;
  const tooltipIzquierda = indice !== null ? Math.min(Math.max(centro(indice) - 90, 0), ancho - 180) : 0;

  return (
    <div className="grafico-lineas" ref={ref}>
      <svg
        width={ancho}
        height={ALTO}
        role="img"
        aria-label={`${descripcion} Usá las flechas para recorrerlo; el detalle también está en la tabla.`}
        tabIndex={0}
        onPointerMove={elegirPorPuntero}
        onPointerLeave={() => setIndice(null)}
        onKeyDown={moverConTeclado}
        onBlur={() => setIndice(null)}
      >
        {indice !== null && tipo === 'barras' && (
          <rect x={centro(indice) - banda / 2} y={MARGEN.arriba} width={banda} height={altoUtil} className="banda-elegida" />
        )}
        {ejes.map((v) => (
          <g key={v}>
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(v)} y2={y(v)} className={v === 0 ? 'eje-cero' : 'eje-guia'} />
            <text x={MARGEN.izquierda - 10} y={y(v)} dy="0.32em" textAnchor="end" className="eje-texto">
              {v === 0 ? '$ 0' : `$ ${compacto.format(v)}`}
            </text>
          </g>
        ))}
        {puntos.map((p, i) =>
          i % cadaEtiqueta === 0 || p.resaltado ? (
            <text key={p.clave} x={centro(i)} y={ALTO - 8} textAnchor="middle" className={`eje-texto${p.resaltado ? ' es-elegido' : ''}`}>
              {p.eje}
            </text>
          ) : null,
        )}
        {tipo === 'barras' && barras}
        {referencia && (
          <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(referencia)} y2={y(referencia)} className="linea-objetivo" />
        )}
        {indice !== null && tipo === 'lineas' && (
          <line x1={centro(indice)} x2={centro(indice)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="mira" />
        )}
        {tipo === 'lineas' &&
          lineas.map((s) => {
            const conDatos = puntos.map((p, i) => ({ p, i })).filter(({ p }) => !p.futuro);
            return (
              <g key={s.clave} className={`serie serie--${s.clave}`}>
                <polyline points={conDatos.map(({ p, i }) => `${centro(i)},${y(s.valor(p))}`).join(' ')} />
                {conDatos.map(({ p, i }) =>
                  conPuntos || indice === i ? <circle key={p.clave} cx={centro(i)} cy={y(s.valor(p))} r={indice === i ? 5.5 : 4} /> : null,
                )}
              </g>
            );
          })}
      </svg>
      {punto && (
        <div className="tooltip" style={{ left: tooltipIzquierda }} role="status">
          <p className="tooltip__titulo">{punto.titulo}</p>
          {series.map((s) => (
            <p key={s.clave} className="tooltip__fila">
              <span className={`clave-linea serie--${s.clave}`} aria-hidden="true" />
              <strong>{dinero(punto.valores[s.clave])}</strong>
              <span>{s.nombre}</span>
            </p>
          ))}
          {apilado && series.length > 1 && (
            <p className="tooltip__fila">
              <span className="clave-linea" aria-hidden="true" />
              <strong>{dinero(total(punto))}</strong>
              <span>Total</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Leyenda({ series, referencia }) {
  return (
    <ul className="leyenda-series" aria-hidden="true">
      {series.map((s) => (
        <li key={s.clave}>
          <span className={`clave-linea serie--${s.clave}`} />
          {s.nombre}
        </li>
      ))}
      {referencia && (
        <li>
          <span className="clave-linea clave-linea--referencia" />
          {referencia}
        </li>
      )}
    </ul>
  );
}

function Tabla({ puntos, series, rotulo }) {
  return (
    <details className="tabla-datos">
      <summary>Ver como tabla</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{rotulo}</th>
            {series.map((s) => (
              <th key={s.clave} scope="col">
                {s.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {puntos
            .filter((p) => !p.futuro)
            .map((p) => (
              <tr key={p.clave}>
                <th scope="row">{p.titulo}</th>
                {series.map((s) => (
                  <td key={s.clave} className="importe">
                    {dinero(p.valores[s.clave])}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </details>
  );
}

/** Rango de días del período: los últimos 30 días hasta hoy (o hasta el fin del mes elegido) o el mes entero. */
function rangoDiario(periodo, mes) {
  const finDelMes = `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`;
  if (periodo === 'mes') return { desde: `${mes}-01`, hasta: finDelMes };
  const hasta = mes === mesActual() ? hoy() : finDelMes;
  return { desde: sumarDias(hasta, -29), hasta };
}

function PorDia({ periodo, tipo, mes }) {
  const [conFijos, setConFijos] = useRecordado('ahorro.grafico.fijos', 'no');
  const { desde, hasta } = rangoDiario(periodo, mes);
  const { datos } = useApi(conParams('/diario', { desde, hasta }));
  const incluirFijos = conFijos === 'si';
  const series = incluirFijos ? [SERIE_DIA, SERIE_FIJOS] : [SERIE_DIA];
  const hoyISO = hoy();

  const puntos = (datos?.dias ?? []).map((d) => ({
    clave: d.fecha,
    eje: String(deISO(d.fecha).getDate()),
    titulo: capitalizar(`${diaLargo(d.fecha)} de ${nombreMesSolo(d.fecha.slice(0, 7))}`),
    valores: { variable: d.gastos - d.fijos, fijos: d.fijos },
    futuro: d.fecha > hoyISO,
    resaltado: d.fecha === hoyISO,
  }));
  const pasados = puntos.filter((p) => !p.futuro);
  const sumaDia = (p) => p.valores.variable + (incluirFijos ? p.valores.fijos : 0);
  const promedio = pasados.length ? pasados.reduce((suma, p) => suma + sumaDia(p), 0) / pasados.length : 0;
  const hayFijos = puntos.some((p) => p.valores.fijos > 0);

  return (
    <>
      <div className="grafico-pie-controles">
        <Leyenda series={series} referencia={promedio > 0 ? `Promedio ${dinero(Math.round(promedio / 100) * 100)} por día` : null} />
        {(hayFijos || incluirFijos) && (
          <button type="button" className="chip chip--chico" aria-pressed={incluirFijos} onClick={() => setConFijos(incluirFijos ? 'no' : 'si')}>
            Sumar los fijos
          </button>
        )}
      </div>
      {!datos && <div className="grafico-lineas grafico-lineas--cargando" />}
      {datos && promedio === 0 && (
        <p className="tenue">
          No hay gastos {incluirFijos ? '' : 'del día a día '}cargados del {diaCorto(desde)} al {diaCorto(hasta)}.
        </p>
      )}
      {datos && promedio > 0 && (
        <>
          <Grafico
            puntos={puntos}
            series={series}
            tipo={tipo}
            apilado
            referencia={promedio}
            descripcion={`Gasto de cada día del ${diaCorto(desde)} al ${diaCorto(hasta)}${incluirFijos ? ', con los pagos fijos' : ', sin los pagos fijos'}.`}
          />
          <Tabla puntos={puntos} series={series} rotulo="Día" />
        </>
      )}
    </>
  );
}

function PorMes({ cantidad, tipo, mes }) {
  const { datos } = useApi(`/evolucion?hasta=${mes}&meses=${cantidad}`);
  const conMovimientos = datos?.meses.filter((m) => m.ingresos || m.gastos).length ?? 0;
  const puntos = (datos?.meses ?? []).map((m) => ({
    clave: m.mes,
    eje: nombreMesSolo(m.mes).slice(0, 3),
    titulo: capitalizar(nombreMes(m.mes)),
    valores: m,
    resaltado: m.mes === mes,
  }));

  return (
    <>
      <Leyenda series={SERIES_MESES} referencia={datos?.objetivo_ars ? 'Objetivo de ahorro' : null} />
      {!datos && <div className="grafico-lineas grafico-lineas--cargando" />}
      {datos && conMovimientos < 2 && <p className="tenue">Con dos meses cargados aparece acá la comparación.</p>}
      {datos && conMovimientos >= 2 && (
        <>
          <Grafico
            puntos={puntos}
            series={SERIES_MESES}
            tipo={tipo}
            referencia={datos.objetivo_ars}
            descripcion="Ingresos, gastos y ahorro por mes."
          />
          <Tabla puntos={puntos} series={SERIES_MESES} rotulo="Mes" />
        </>
      )}
    </>
  );
}

/**
 * Cómo viene el gasto: día por día (los gastos chicos, sin que los fijos los tapen) o mes a mes
 * (ingresos, gastos y ahorro), en barras o líneas. Las elecciones quedan guardadas en el dispositivo.
 */
export default function Evolucion() {
  const { mes } = useApp();
  const [periodo, setPeriodo] = useRecordado('ahorro.grafico.periodo', '30');
  const [tipo, setTipo] = useRecordado('ahorro.grafico.tipo', 'barras');
  const porDia = PERIODOS_DIARIOS.includes(periodo);
  const periodos = [
    { valor: '30', nombre: '30 días' },
    { valor: 'mes', nombre: mes === mesActual() ? 'Este mes' : capitalizar(nombreMesSolo(mes)) },
    { valor: '6', nombre: '6 meses' },
    { valor: '12', nombre: '12 meses' },
  ];

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">{porDia ? 'Gasto de cada día' : 'Cómo vienen los meses'}</h2>
        <div className="grafico-controles">
          <div className="segmentado segmentado--chico" role="group" aria-label="Período">
            {periodos.map((p) => (
              <button key={p.valor} type="button" aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>
                {p.nombre}
              </button>
            ))}
          </div>
          <div className="segmentado segmentado--chico" role="group" aria-label="Tipo de gráfico">
            {[
              { valor: 'barras', nombre: 'Barras' },
              { valor: 'lineas', nombre: 'Líneas' },
            ].map((t) => (
              <button key={t.valor} type="button" aria-pressed={tipo === t.valor} onClick={() => setTipo(t.valor)} aria-label={t.nombre} title={t.nombre}>
                <Icono nombre={t.valor} tamano={16} />
              </button>
            ))}
          </div>
        </div>
      </header>
      {porDia ? <PorDia periodo={periodo} tipo={tipo} mes={mes} /> : <PorMes cantidad={Number(periodo)} tipo={tipo} mes={mes} />}
    </section>
  );
}
