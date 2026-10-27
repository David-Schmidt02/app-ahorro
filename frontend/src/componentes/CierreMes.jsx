import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { avanceDelMes, mesActual, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero } from '../lib/formato';

// Pasada la primera quincena el cierre ya no es noticia
const ULTIMO_DIA_VISIBLE = 15;
const porcentaje = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 });

const claveDescarte = (mes) => `ahorro.cierre.${mes}`;

function descartado(mes) {
  try {
    return Boolean(localStorage.getItem(claveDescarte(mes)));
  } catch {
    return false;
  }
}

/** La categoría cuyo gasto más subió respecto del mes anterior, o null si ninguna subió. */
function laQueMasCrecio(actual, anterior) {
  const antes = new Map(anterior.map((c) => [c.categoria.id, c.gastado]));
  const subas = actual.map((c) => ({ nombre: c.categoria.nombre, suba: c.gastado - (antes.get(c.categoria.id) ?? 0) }));
  const mayor = subas.sort((a, b) => b.suba - a.suba)[0];
  return mayor?.suba > 0 ? mayor : null;
}

function Datos({ cerrado, mes }) {
  const anterior = sumarMeses(mes, -1);
  const { datos: previo } = useApi(`/resumen?mes=${anterior}`);
  const numeroMes = Number(mes.slice(5));
  const { datos: evolucion } = useApi(`/evolucion?hasta=${mes}&meses=${Math.max(numeroMes, 2)}`);
  const anio = mes.slice(0, 4);
  const delAnio = evolucion?.meses.filter((m) => m.mes.startsWith(anio)).reduce((suma, m) => suma + m.ahorro, 0);
  const variacion = cerrado.gastos_mes_anterior ? cerrado.gastos / cerrado.gastos_mes_anterior - 1 : null;
  const crecio = previo && laQueMasCrecio(cerrado.categorias, previo.categorias);

  return (
    <ul className="cierre__datos">
      <li>
        Gastaron {dinero(cerrado.gastos)}
        {variacion !== null && Math.abs(variacion) >= 0.01
          ? `, ${porcentaje.format(Math.abs(variacion))} ${variacion > 0 ? 'más' : 'menos'} que en ${nombreMesSolo(anterior)}.`
          : '.'}
      </li>
      {crecio && (
        <li>
          Lo que más subió: {crecio.nombre}, {dinero(crecio.suba)} más que en {nombreMesSolo(anterior)}.
        </li>
      )}
      {delAnio !== undefined && numeroMes > 1 && (
        <li>
          En {anio} llevan ahorrado {dinero(delAnio)}.
        </li>
      )}
    </ul>
  );
}

/** En la primera quincena, el resumen del mes que terminó: ahorro contra el objetivo y qué cambió. */
export default function CierreMes() {
  const { mes, setMes } = useApp();
  const cerradoMes = sumarMeses(mesActual(), -1);
  const [oculto, setOculto] = useState(() => descartado(cerradoMes));
  const visible = mes === mesActual() && avanceDelMes(mes).dia <= ULTIMO_DIA_VISIBLE && !oculto;
  const { datos: cerrado } = useApi(visible ? `/resumen?mes=${cerradoMes}` : null);

  if (!visible || !cerrado || cerrado.ingresos + cerrado.gastos === 0) return null;

  const descartar = () => {
    try {
      localStorage.setItem(claveDescarte(cerradoMes), '1');
    } catch {
      // Sin almacenamiento vuelve a aparecer al recargar; no es grave
    }
    setOculto(true);
  };

  const objetivo = cerrado.objetivo_ars;
  const diferencia = objetivo ? cerrado.ahorro - objetivo : null;

  return (
    <section className="tarjeta tarjeta--cierre" aria-labelledby="cierre-titulo">
      <h2 id="cierre-titulo" className="tarjeta__titulo">
        Así cerró {nombreMesSolo(cerradoMes)}
      </h2>
      <div className="titular">
        <p className="titular__rotulo">{cerrado.ahorro < 0 ? 'Gastaron más de lo que entró' : 'Ahorraron'}</p>
        <p className={`titular__monto titular__monto--chico${cerrado.ahorro < 0 ? ' es-negativo' : ''}`}>{dinero(Math.abs(cerrado.ahorro))}</p>
        {diferencia !== null && (
          <p className={`titular__nota ${diferencia >= 0 ? 'es-bien' : 'es-alerta'}`}>
            {diferencia >= 0
              ? `Cumplieron el objetivo de ${dinero(objetivo)}${diferencia > 0 ? ` y sobraron ${dinero(diferencia)}` : ''}.`
              : `Faltaron ${dinero(-diferencia)} para el objetivo de ${dinero(objetivo)}.`}
          </p>
        )}
      </div>
      <Datos cerrado={cerrado} mes={cerradoMes} />
      <div className="acciones acciones--inicio">
        <button type="button" className="boton boton--chico" onClick={() => setMes(cerradoMes)}>
          Ver {nombreMesSolo(cerradoMes)}
        </button>
        <button type="button" className="boton boton--chico" onClick={descartar} aria-label={`Listo, ocultar el cierre de ${nombreMesSolo(cerradoMes)}`}>
          Listo
        </button>
      </div>
    </section>
  );
}
