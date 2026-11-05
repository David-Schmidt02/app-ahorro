import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { useRecordado } from '../estado/useRecordado';
import { conParams } from '../lib/api';
import { deISO, diaCorto, diaLargo, diasDelMes, hoy, mesActual, nombreMes, nombreMesSolo, sumarDias } from '../lib/fechas';
import { dinero } from '../lib/formato';
import Grafico, { Leyenda, SelectorTipo, Tabla } from './Grafico';

const SERIES_MESES = [
  { clave: 'ingresos', nombre: 'Ingresos' },
  { clave: 'gastos', nombre: 'Gastos' },
  { clave: 'ahorro', nombre: 'Ahorro' },
];
const SERIE_DIA = { clave: 'variable', nombre: 'Del día a día' };
const SERIE_FIJOS = { clave: 'fijos', nombre: 'Fijos' };
const PERIODOS_DIARIOS = ['30', 'mes'];

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

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
        <Leyenda
          items={[
            ...series,
            ...(promedio > 0 ? [{ clave: 'promedio', clase: 'clave-linea--referencia', nombre: `Promedio ${dinero(Math.round(promedio / 100) * 100)} por día` }] : []),
          ]}
        />
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
      <Leyenda
        items={[...SERIES_MESES, ...(datos?.objetivo_ars ? [{ clave: 'objetivo', clase: 'clave-linea--referencia', nombre: 'Objetivo de ahorro' }] : [])]}
      />
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
          <SelectorTipo tipo={tipo} onCambio={setTipo} />
        </div>
      </header>
      {porDia ? <PorDia periodo={periodo} tipo={tipo} mes={mes} /> : <PorMes cantidad={Number(periodo)} tipo={tipo} mes={mes} />}
    </section>
  );
}
