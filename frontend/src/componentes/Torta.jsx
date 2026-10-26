import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { avanceDelMes } from '../lib/fechas';
import { dinero } from '../lib/formato';
import Icono, { IconoCategoria } from './Icono';

const MAX_PORCIONES = 6;
const LADO = 176;
const RADIO = 80;
const GROSOR = 24;
// Antes de este día el ritmo del mes todavía no dice nada
const DIA_MINIMO_RITMO = 5;
const porcentaje = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 });

const fila = (c) => ({
  clave: c.categoria.id,
  categoria: c.categoria,
  valor: c.gastado,
  programado: c.gastado_programado,
  pendiente: c.pendiente,
  presupuesto: c.presupuesto,
});

/**
 * Resumido: las 5 con más gasto y el resto agrupado (más de 6 porciones ya no se leen).
 * Todas: cada categoría con gasto es una porción, y en la lista también las que solo tienen presupuesto o pendientes.
 */
function armarFilas(categorias, todas) {
  const conGasto = categorias.filter((c) => c.gastado > 0).sort((a, b) => b.gastado - a.gastado);
  if (todas) {
    const sinGasto = categorias.filter((c) => c.gastado === 0 && (c.presupuesto || c.pendiente));
    return { porciones: conGasto.map(fila), filas: [...conGasto, ...sinGasto].map(fila), agrupadas: 0 };
  }
  if (conGasto.length <= MAX_PORCIONES) return { porciones: conGasto.map(fila), filas: conGasto.map(fila), agrupadas: 0 };
  const visibles = conGasto.slice(0, MAX_PORCIONES - 1).map(fila);
  const resto = conGasto.slice(MAX_PORCIONES - 1);
  const filaResto = {
    clave: 'resto',
    categoria: null,
    nombre: `Resto (${resto.length})`,
    valor: resto.reduce((suma, c) => suma + c.gastado, 0),
    programado: 0,
    pendiente: 0,
    presupuesto: null,
  };
  return { porciones: [...visibles, filaResto], filas: [...visibles, filaResto], agrupadas: resto.length };
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

const colorDe = (f) => f.categoria?.color ?? 'var(--tinta-3)';
const nombreDe = (f) => f.categoria?.nombre ?? f.nombre;

/** Cierre estimado: los pagos programados cuentan una vez; el resto sigue el ritmo de los días que pasaron. */
function proyectar(f, avance) {
  if (!avance || !f.presupuesto || avance.dia < DIA_MINIMO_RITMO) return null;
  const variable = f.valor - f.programado;
  return f.programado + f.pendiente + (variable / avance.dia) * avance.dias;
}

function Presupuesto({ f, avance }) {
  if (!f.presupuesto && !f.pendiente) return null;
  const usado = f.valor + f.pendiente;
  const tope = Math.max(f.presupuesto || 0, usado, 1);
  const pasado = f.presupuesto && usado > f.presupuesto;
  const proyectado = proyectar(f, avance);
  const seVaAPasar = !pasado && proyectado > f.presupuesto;
  return (
    <div className="torta-fila__presupuesto">
      {f.presupuesto ? (
        <div className={`mini-barra${pasado ? ' es-pasada' : ''}`} style={{ '--color': colorDe(f) }} aria-hidden="true">
          <span style={{ width: `${(f.valor / tope) * 100}%` }} />
          <span className="mini-barra__pendiente" style={{ width: `${(f.pendiente / tope) * 100}%` }} />
        </div>
      ) : null}
      <span className={`renglon__detalle${pasado ? ' es-alerta' : ''}`}>
        {[
          f.presupuesto && `de ${dinero(f.presupuesto)}`,
          f.pendiente > 0 && `${dinero(f.pendiente)} por pagar`,
          pasado && `se pasa por ${dinero(usado - f.presupuesto)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      {seVaAPasar && <span className="renglon__detalle es-aviso">A este ritmo llegan a {dinero(Math.round(proyectado / 100) * 100)}</span>}
    </div>
  );
}

/** Reparto del gasto del mes por categoría, con presupuesto y pendientes de cada una. */
export default function Torta({ categorias, titulo = 'En qué se va la plata', elegida = null, onElegir = null }) {
  const [activa, setActiva] = useState(null);
  const [todas, setTodas] = useState(false);
  const avance = avanceDelMes(useApp().mes);
  const { porciones, filas, agrupadas } = armarFilas(categorias, todas);
  const total = porciones.reduce((suma, p) => suma + p.valor, 0);
  if (!filas.length) return null;

  // 2px de separación medidos sobre el radio medio
  const separacion = porciones.length > 1 ? 2 / (RADIO - GROSOR / 2) : 0;
  const acumulados = porciones.map((_, i) => porciones.slice(0, i).reduce((suma, p) => suma + p.valor, 0));
  const segmentos = porciones.map((p, i) => ({
    ...p,
    desde: (acumulados[i] / total) * 2 * Math.PI + separacion / 2,
    hasta: ((acumulados[i] + p.valor) / total) * 2 * Math.PI - separacion / 2,
  }));
  const enFoco = filas.find((f) => f.clave === activa);
  const puedeExpandir = todas || agrupadas > 0 || categorias.some((c) => c.gastado === 0 && (c.presupuesto || c.pendiente));

  return (
    <section className="tarjeta grafico-torta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">{titulo}</h2>
        {puedeExpandir && (
          <button type="button" className="enlace-boton" onClick={() => setTodas((x) => !x)} aria-pressed={todas}>
            {todas ? 'Resumir' : 'Ver todas'}
          </button>
        )}
      </header>
      <div className="grafico-torta__cuerpo">
        {total > 0 && (
          <svg
            viewBox={`0 0 ${LADO} ${LADO}`}
            width={LADO}
            height={LADO}
            className="grafico-torta__svg"
            role="img"
            aria-label="Gasto por categoría (detalle en la lista)"
          >
            {segmentos.length === 1 ? (
              <circle cx={LADO / 2} cy={LADO / 2} r={RADIO - GROSOR / 2} fill="none" stroke={colorDe(segmentos[0])} strokeWidth={GROSOR} />
            ) : (
              segmentos.map((s) => (
                <path
                  key={s.clave}
                  d={arco(s.desde, s.hasta)}
                  fill={colorDe(s)}
                  className={activa && activa !== s.clave ? 'es-tenue' : ''}
                  onPointerEnter={() => setActiva(s.clave)}
                  onPointerLeave={() => setActiva(null)}
                />
              ))
            )}
            <text x={LADO / 2} y={LADO / 2 - 4} textAnchor="middle" className="grafico-torta__total">
              {dinero(enFoco ? enFoco.valor : total)}
            </text>
            <text x={LADO / 2} y={LADO / 2 + 16} textAnchor="middle" className="grafico-torta__rotulo">
              {enFoco ? nombreDe(enFoco) : 'gastado'}
            </text>
          </svg>
        )}
        <ul className="torta-filas">
          {filas.map((f) => (
            <li
              key={f.clave}
              className={`torta-fila${activa === f.clave || elegida === f.clave ? ' es-activa' : ''}`}
              onPointerEnter={() => setActiva(f.clave)}
              onPointerLeave={() => setActiva(null)}
            >
              <span className="muestra" style={{ background: colorDe(f) }} aria-hidden="true" />
              {f.categoria ? (
                <IconoCategoria icono={f.categoria.icono} color={f.categoria.color} tamano="chico" />
              ) : (
                <span className="icono-categoria icono-categoria--chico" aria-hidden="true">
                  <Icono nombre="resto" tamano={14} />
                </span>
              )}
              {onElegir && f.categoria ? (
                <button
                  type="button"
                  className="torta-fila__nombre torta-fila__filtro"
                  aria-pressed={elegida === f.clave}
                  onClick={() => onElegir(elegida === f.clave ? null : f.clave)}
                >
                  {nombreDe(f)}
                </button>
              ) : (
                <span className="torta-fila__nombre">{nombreDe(f)}</span>
              )}
              <span className="torta-fila__parte">{total ? porcentaje.format(f.valor / total) : '—'}</span>
              <span className="importe">{dinero(f.valor)}</span>
              <Presupuesto f={f} avance={avance} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
