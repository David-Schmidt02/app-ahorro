import { Link } from 'react-router-dom';
import { diaCorto, diaLargo, diasDelMes } from '../lib/fechas';
import { dinero } from '../lib/formato';
import { IconoCategoria } from './Icono';

const diasEntre = (desde, hasta) => Math.round((new Date(hasta) - new Date(desde)) / 864e5);

function Cupo({ c, desde, hasta, esUltimaDelMes }) {
  const pasados = c.restante < 0;
  const tope = Math.max(c.disponible, c.gastado, 1);

  const notas = [];
  if (c.arrastre < 0) {
    notas.push({
      texto: `La semana pasada se pasaron por ${dinero(-c.arrastre)}: esta semana tienen ${dinero(c.disponible)} en lugar de ${dinero(c.cupo)}.`,
      clase: 'es-aviso',
    });
  } else if (c.arrastre > 0) {
    notas.push({ texto: `La semana pasada les sobraron ${dinero(c.arrastre)}: van al ahorro.`, clase: 'es-bien' });
  }
  if (diasEntre(desde, hasta) < 6) {
    notas.push({ texto: `Semana corta por el cambio de mes: corresponden ${dinero(c.cupo)}.`, clase: '' });
  }
  if (pasados) {
    notas.push({
      texto: esUltimaDelMes
        ? `Se pasaron por ${dinero(-c.restante)}: sale del ahorro del mes.`
        : `Se pasaron por ${dinero(-c.restante)}: se descuenta de la semana que viene.`,
      clase: 'es-alerta',
    });
  }

  return (
    <li className="cupo">
      <IconoCategoria icono={c.categoria.icono} color={c.categoria.color} />
      <div className="cupo__texto">
        <p className="cupo__nombre">{c.categoria.nombre}</p>
        <p className="renglon__detalle">
          Gastaron {dinero(c.gastado)} de {dinero(c.disponible)}
        </p>
      </div>
      <p className={`cupo__resto${pasados ? ' es-alerta' : ''}`}>
        <strong>{dinero(Math.abs(c.restante))}</strong>
        <span>{pasados ? 'pasados' : 'quedan'}</span>
      </p>
      <div className={`mini-barra cupo__barra${pasados ? ' es-pasada' : ''}`} style={{ '--color': c.categoria.color }} aria-hidden="true">
        <span style={{ width: `${(Math.min(c.gastado, tope) / tope) * 100}%` }} />
      </div>
      {notas.map((n) => (
        <p key={n.texto} className={`cupo__nota renglon__detalle ${n.clase}`}>
          {n.texto}
        </p>
      ))}
    </li>
  );
}

/** Cupos semanales del mes en curso: cuánto queda esta semana en cada categoría con cupo. */
export default function Cupos({ cupos, conEnlace = false }) {
  if (!cupos?.cupos.length) return null;
  const { desde, hasta } = cupos;
  const esUltimaDelMes = Number(hasta.slice(8)) === diasDelMes(hasta.slice(0, 7));

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">Cupos de la semana</h2>
        <span className="tenue" title={`Del ${diaLargo(desde)} al ${diaLargo(hasta)}`}>
          {diaCorto(desde)} al {diaCorto(hasta)}
          {conEnlace && (
            <>
              {' · '}
              <Link to="/plan/cupos">Ver el mes</Link>
            </>
          )}
        </span>
      </header>
      <ul className="cupos">
        {cupos.cupos.map((c) => (
          <Cupo key={c.categoria.id} c={c} desde={desde} hasta={hasta} esUltimaDelMes={esUltimaDelMes} />
        ))}
      </ul>
      <p className="tenue cupos__pie">Lo que no gasten de acá al domingo va derecho al ahorro.</p>
    </section>
  );
}
