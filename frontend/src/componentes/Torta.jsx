import { useState } from 'react';
import { dinero } from '../lib/formato';

const MAX_PORCIONES = 6;
const LADO = 176;
const RADIO = 80;
const GROSOR = 24;
const porcentaje = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 });

/** Las 5 categorías con más gasto y el resto agrupado: más de 6 porciones ya no se leen. */
function porciones(categorias) {
  const conGasto = categorias.filter((c) => c.gastado > 0).sort((a, b) => b.gastado - a.gastado);
  const visibles = conGasto.length > MAX_PORCIONES ? conGasto.slice(0, MAX_PORCIONES - 1) : conGasto;
  const resto = conGasto.slice(visibles.length);
  const lista = visibles.map((c) => ({
    clave: c.categoria.id,
    nombre: c.categoria.nombre,
    icono: c.categoria.icono,
    color: c.categoria.color,
    valor: c.gastado,
  }));
  if (resto.length) {
    lista.push({
      clave: 'resto',
      nombre: `Resto (${resto.length})`,
      icono: '…',
      color: 'var(--tinta-3)',
      valor: resto.reduce((suma, c) => suma + c.gastado, 0),
    });
  }
  return lista;
}

function arco(desde, hasta) {
  const centro = LADO / 2;
  const radioInterno = RADIO - GROSOR;
  const punto = (radio, angulo) => [centro + radio * Math.sin(angulo), centro - radio * Math.cos(angulo)];
  const grande = hasta - desde > Math.PI ? 1 : 0;
  const [x1, y1] = punto(RADIO, desde);
  const [x2, y2] = punto(RADIO, hasta);
  const [x3, y3] = punto(radioInterno, hasta);
  const [x4, y4] = punto(radioInterno, desde);
  return `M${x1} ${y1}A${RADIO} ${RADIO} 0 ${grande} 1 ${x2} ${y2}L${x3} ${y3}A${radioInterno} ${radioInterno} 0 ${grande} 0 ${x4} ${y4}Z`;
}

/** Proporción del gasto del mes por categoría. */
export default function Torta({ categorias, titulo = 'Cómo se reparte el gasto', elegida = null, onElegir = null }) {
  const [activa, setActiva] = useState(null);
  const lista = porciones(categorias);
  const total = lista.reduce((suma, p) => suma + p.valor, 0);
  if (lista.length < 2) return null;

  // 2px de separación medidos sobre el radio medio
  const separacion = 2 / (RADIO - GROSOR / 2);
  const acumulados = lista.map((_, i) => lista.slice(0, i).reduce((suma, p) => suma + p.valor, 0));
  const segmentos = lista.map((p, i) => {
    const desde = (acumulados[i] / total) * 2 * Math.PI;
    const hasta = ((acumulados[i] + p.valor) / total) * 2 * Math.PI;
    return { ...p, desde: desde + separacion / 2, hasta: hasta - separacion / 2, parte: p.valor / total };
  });
  const enFoco = segmentos.find((s) => s.clave === activa);

  return (
    <section className="seccion grafico-torta">
      <h2 className="seccion__titulo">{titulo}</h2>
      <div className="grafico-torta__cuerpo">
        <svg
          viewBox={`0 0 ${LADO} ${LADO}`}
          width={LADO}
          height={LADO}
          className="grafico-torta__svg"
          role="img"
          aria-label="Gasto por categoría (detalle en la lista)"
        >
          {segmentos.map((s) => (
            <path
              key={s.clave}
              d={arco(s.desde, s.hasta)}
              fill={s.color}
              className={activa && activa !== s.clave ? 'es-tenue' : ''}
              onPointerEnter={() => setActiva(s.clave)}
              onPointerLeave={() => setActiva(null)}
            />
          ))}
          <text x={LADO / 2} y={LADO / 2 - 4} textAnchor="middle" className="grafico-torta__total">
            {dinero(enFoco ? enFoco.valor : total)}
          </text>
          <text x={LADO / 2} y={LADO / 2 + 16} textAnchor="middle" className="grafico-torta__rotulo">
            {enFoco ? enFoco.nombre : 'gastado'}
          </text>
        </svg>
        <ul className="grafico-torta__leyenda">
          {segmentos.map((s) => (
            <li
              key={s.clave}
              tabIndex={onElegir ? undefined : 0}
              className={activa === s.clave || elegida === s.clave ? 'es-activa' : ''}
              onPointerEnter={() => setActiva(s.clave)}
              onPointerLeave={() => setActiva(null)}
              onFocus={() => setActiva(s.clave)}
              onBlur={() => setActiva(null)}
            >
              <span className="muestra" style={{ background: s.color }} aria-hidden="true" />
              {onElegir && s.clave !== 'resto' ? (
                <button
                  type="button"
                  className="grafico-torta__nombre grafico-torta__filtro"
                  aria-pressed={elegida === s.clave}
                  onClick={() => onElegir(elegida === s.clave ? null : s.clave)}
                >
                  {s.icono} {s.nombre}
                </button>
              ) : (
                <span className="grafico-torta__nombre">
                  {s.icono} {s.nombre}
                </span>
              )}
              <span className="grafico-torta__parte">{porcentaje.format(s.parte)}</span>
              <span className="importe tenue">{dinero(s.valor)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
