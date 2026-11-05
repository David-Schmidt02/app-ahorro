import { useState } from 'react';
import { useAncho } from '../estado/useAncho';
import { dinero } from '../lib/formato';
import Icono from './Icono';

const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 16, abajo: 28, izquierda: 64 };
const ANCHO_ETIQUETA = 34;
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

const definido = (v) => v !== null && v !== undefined;

/** Áreas entre dos líneas donde `arriba` supera a `abajo`, cortando en los cruces. */
function areasDeExceso(tramos) {
  const areas = [];
  for (let k = 0; k < tramos.length - 1; k++) {
    const [a, b] = [tramos[k], tramos[k + 1]];
    const [d0, d1] = [a.arriba - a.abajo, b.arriba - b.abajo];
    if (d0 <= 0 && d1 <= 0) continue;
    if (d0 > 0 && d1 > 0) {
      areas.push([[a.x, a.yArriba], [b.x, b.yArriba], [b.x, b.yAbajo], [a.x, a.yAbajo]]);
      continue;
    }
    const t = d0 / (d0 - d1);
    const cruce = [a.x + t * (b.x - a.x), a.yAbajo + t * (b.yAbajo - a.yAbajo)];
    areas.push(d0 > 0 ? [[a.x, a.yArriba], cruce, [a.x, a.yAbajo]] : [cruce, [b.x, b.yArriba], [b.x, b.yAbajo]]);
  }
  return areas;
}

/**
 * Barras o líneas sobre una escala por bandas, así cambiar de tipo no mueve los puntos.
 * `puntos`: [{ clave, eje, titulo, valores: { [serie]: monto | null }, futuro, estimado, resaltado }]. Los `futuro` no se
 * dibujan; los `estimado` (proyección) van más claros o punteados.
 * `series`: [{ clave, nombre, nombreEstimado, forma }]; con `forma: 'linea'` es línea también en barras (ej. el plan).
 * `apilado`: las series se suman en una sola barra (gasto del día a día + fijos).
 * `referencia`: monto de la línea horizontal (objetivo o promedio); su nombre va en la leyenda.
 * `exceso`: { serie, limite }: lo que `serie` pasa por encima de `limite` va en rojo.
 */
export default function Grafico({ puntos, series, tipo, apilado = false, referencia = null, exceso = null, descripcion }) {
  const [ref, ancho] = useAncho();
  const [indice, setIndice] = useState(null);
  const n = puntos.length;
  const apilables = series.filter((s) => s.forma !== 'linea');
  const fijas = series.filter((s) => s.forma === 'linea');
  const total = (p) => apilables.reduce((suma, s) => suma + (p.valores[s.clave] ?? 0), 0);

  const valores = [
    ...(apilado ? puntos.map(total) : puntos.flatMap((p) => apilables.map((s) => p.valores[s.clave]))),
    ...puntos.flatMap((p) => fijas.map((s) => p.valores[s.clave])),
  ].filter(definido);
  if (referencia) valores.push(referencia);
  const ejes = marcas(Math.min(0, ...valores), Math.max(...valores, 1));
  const [yMin, yMax] = [ejes[0], ejes[ejes.length - 1]];

  const anchoUtil = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 100);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const banda = anchoUtil / n;
  const centro = (i) => MARGEN.izquierda + banda * (i + 0.5);
  const y = (v) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin)) * altoUtil;
  const cadaEtiqueta = Math.ceil(n / Math.max(1, Math.floor(anchoUtil / ANCHO_ETIQUETA)));

  // Las etiquetas comunes se corren si pisan la del día resaltado (hoy o el mes elegido)
  const resaltados = puntos.flatMap((p, i) => (p.resaltado ? [i] : []));
  const cercaDeResaltado = (i) => resaltados.some((r) => r !== i && Math.abs(r - i) < Math.ceil(cadaEtiqueta / 2));

  const anchoGrupo = Math.min(banda * 0.7, apilado || apilables.length === 1 ? 26 : 48);
  const anchoBarra = apilado ? anchoGrupo : anchoGrupo / apilables.length;
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

  const limiteDe = (p) => (exceso ? p.valores[exceso.limite] : null);

  const barra = (clave, x, ancho_, desde, hasta, clase) => {
    const [arriba, abajo] = [y(Math.max(desde, hasta)), y(Math.min(desde, hasta))];
    if (abajo - arriba < 0.5) return null;
    return <rect key={clave} x={x} y={arriba} width={Math.max(ancho_ - separacion, 1)} height={abajo - arriba} rx={Math.min(3, ancho_ / 4)} className={clase} />;
  };

  /** La barra de una serie; si pasa el límite, la parte de arriba va en rojo. */
  const barraConExceso = (p, s, x, ancho_, desde, hasta) => {
    const clase = `barra serie--${s.clave}${p.estimado ? ' es-estimada' : ''}`;
    const limite = exceso?.serie === s.clave ? limiteDe(p) : null;
    if (!definido(limite) || hasta <= limite) return [barra(`${p.clave}-${s.clave}`, x, ancho_, desde, hasta, clase)];
    return [
      barra(`${p.clave}-${s.clave}`, x, ancho_, desde, limite, clase),
      barra(`${p.clave}-${s.clave}-exceso`, x, ancho_, limite, hasta, `barra serie--exceso${p.estimado ? ' es-estimada' : ''}`),
    ];
  };

  const barras = puntos.flatMap((p, i) => {
    if (p.futuro) return [];
    const izquierda = centro(i) - anchoGrupo / 2;
    if (apilado) {
      let base = 0;
      return apilables.flatMap((s) => {
        const desde = base;
        base += p.valores[s.clave] ?? 0;
        return barraConExceso(p, s, izquierda, anchoBarra, desde, base);
      });
    }
    return apilables.flatMap((s, j) =>
      definido(p.valores[s.clave]) ? barraConExceso(p, s, izquierda + j * anchoBarra, anchoBarra, 0, p.valores[s.clave]) : [],
    );
  });

  // En líneas, lo apilado se dibuja como una sola línea con el total
  const lineasApilables = apilado ? [{ ...apilables[0], valor: total }] : apilables.map((s) => ({ ...s, valor: (p) => p.valores[s.clave] }));
  const lineas = [...(tipo === 'lineas' ? lineasApilables : []), ...fijas.map((s) => ({ ...s, valor: (p) => p.valores[s.clave] }))];
  const conPuntos = n <= 15;

  const recorrido = (s) =>
    puntos
      .map((p, i) => ({ p, i, v: p.futuro ? null : s.valor(p) }))
      .filter(({ v }) => definido(v));

  const areas =
    tipo === 'lineas' && exceso
      ? areasDeExceso(
          puntos
            .map((p, i) => ({ p, i, arriba: p.futuro ? null : p.valores[exceso.serie], abajo: limiteDe(p) }))
            .filter(({ arriba, abajo }) => definido(arriba) && definido(abajo))
            .map(({ i, arriba, abajo }) => ({ x: centro(i), arriba, abajo, yArriba: y(arriba), yAbajo: y(abajo) })),
        )
      : [];

  const punto = indice !== null ? puntos[indice] : null;
  const pasadoEnPunto = punto && exceso && definido(punto.valores[exceso.serie]) && definido(limiteDe(punto)) ? punto.valores[exceso.serie] - limiteDe(punto) : 0;
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
          (i % cadaEtiqueta === 0 && !cercaDeResaltado(i)) || p.resaltado ? (
            <text key={p.clave} x={centro(i)} y={ALTO - 8} textAnchor="middle" className={`eje-texto${p.resaltado ? ' es-elegido' : ''}`}>
              {p.eje}
            </text>
          ) : null,
        )}
        {tipo === 'barras' && barras}
        {areas.map((area) => (
          <polygon key={area.map((par) => par.join(',')).join(' ')} points={area.map((par) => par.join(',')).join(' ')} className="area-exceso" />
        ))}
        {referencia && (
          <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(referencia)} y2={y(referencia)} className="linea-objetivo" />
        )}
        {indice !== null && tipo === 'lineas' && (
          <line x1={centro(indice)} x2={centro(indice)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="mira" />
        )}
        {lineas.map((s) => {
          const tramo = recorrido(s);
          // Las líneas fijas (el plan) no tienen proyección: van enteras
          const estimado = (p) => p.estimado && s.forma !== 'linea';
          const reales = tramo.filter(({ p }) => !estimado(p));
          // La proyección sale del último punto real para que la línea no se corte
          const estimados = [...reales.slice(-1), ...tramo.filter(({ p }) => estimado(p))];
          const aPuntos = (lista) => lista.map(({ i, v }) => `${centro(i)},${y(v)}`).join(' ');
          return (
            <g key={s.clave} className={`serie serie--${s.clave}${s.forma === 'linea' ? ' serie--fija' : ''}`}>
              {reales.length > 0 && <polyline points={aPuntos(reales)} />}
              {estimados.length > 1 && <polyline points={aPuntos(estimados)} className="es-estimada" />}
              {tramo.map(({ p, i, v }) =>
                (conPuntos && s.forma !== 'linea') || indice === i ? <circle key={p.clave} cx={centro(i)} cy={y(v)} r={indice === i ? 5.5 : 4} /> : null,
              )}
            </g>
          );
        })}
      </svg>
      {punto && (
        <div className="tooltip" style={{ left: tooltipIzquierda }} role="status">
          <p className="tooltip__titulo">{punto.titulo}</p>
          {series
            .filter((s) => definido(punto.valores[s.clave]))
            .map((s) => (
              <p key={s.clave} className="tooltip__fila">
                <span className={`clave-linea serie--${s.clave}`} aria-hidden="true" />
                <strong>{dinero(punto.valores[s.clave])}</strong>
                <span>{punto.estimado && s.nombreEstimado ? s.nombreEstimado : s.nombre}</span>
              </p>
            ))}
          {apilado && apilables.length > 1 && (
            <p className="tooltip__fila">
              <span className="clave-linea" aria-hidden="true" />
              <strong>{dinero(total(punto))}</strong>
              <span>Total</span>
            </p>
          )}
          {pasadoEnPunto > 0 && (
            <p className="tooltip__fila es-alerta">
              <span className="clave-linea serie--exceso" aria-hidden="true" />
              <strong>{dinero(pasadoEnPunto)}</strong>
              <span>Pasados</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Leyenda del gráfico: `items` [{ clave, clase, nombre }]; `clase` agrega estilos a la muestra (punteada, referencia…). */
export function Leyenda({ items }) {
  return (
    <ul className="leyenda-series" aria-hidden="true">
      {items.map((item) => (
        <li key={item.clave}>
          <span className={`clave-linea ${item.clase ?? `serie--${item.clave}`}`} />
          {item.nombre}
        </li>
      ))}
    </ul>
  );
}

/** El mismo dato del gráfico como tabla, plegada. */
export function Tabla({ puntos, series, rotulo }) {
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
                    {definido(p.valores[s.clave]) ? dinero(p.valores[s.clave]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </details>
  );
}

/** Botones para elegir barras o líneas. */
export function SelectorTipo({ tipo, onCambio }) {
  return (
    <div className="segmentado segmentado--chico" role="group" aria-label="Tipo de gráfico">
      {[
        { valor: 'barras', nombre: 'Barras' },
        { valor: 'lineas', nombre: 'Líneas' },
      ].map((t) => (
        <button key={t.valor} type="button" aria-pressed={tipo === t.valor} onClick={() => onCambio(t.valor)} aria-label={t.nombre} title={t.nombre}>
          <Icono nombre={t.valor} tamano={16} />
        </button>
      ))}
    </div>
  );
}
