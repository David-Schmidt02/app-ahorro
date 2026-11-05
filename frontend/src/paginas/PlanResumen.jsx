import Estado from '../componentes/Estado';
import Grafico, { Leyenda, SelectorTipo, Tabla } from '../componentes/Grafico';
import PestanasPlan from '../componentes/PestanasPlan';
import SelectorMes from '../componentes/SelectorMes';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { useRecordado } from '../estado/useRecordado';
import { deISO, diaLargo, hoy, nombreMesSolo } from '../lib/fechas';
import { dinero } from '../lib/formato';

const SERIES = [
  { clave: 'gastado', nombre: 'Gastado', nombreEstimado: 'Proyectado' },
  { clave: 'plan', nombre: 'Plan', forma: 'linea' },
];
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function Kpi({ titulo, monto, notas }) {
  return (
    <section className="tarjeta kpi">
      <h2 className="kpi__titulo">{titulo}</h2>
      <p className={`kpi__monto${monto < 0 ? ' es-negativo' : ''}`}>{monto === null ? '—' : dinero(monto)}</p>
      {notas.filter(Boolean).map((n) => (
        <p key={n.texto} className={`kpi__nota ${n.clase ?? 'tenue'}`}>
          {n.texto}
        </p>
      ))}
    </section>
  );
}

function Kpis({ datos }) {
  const { ahorro_plan: plan, ahorro_proyectado: proyectado, objetivo_ars: objetivo } = datos;
  const diferencia = proyectado === null ? null : proyectado - plan;
  const enCurso = datos.dias.some((d) => d.estimado) && proyectado !== null;
  return (
    <div className="kpis">
      <Kpi
        titulo="Ahorro según el plan"
        monto={plan}
        notas={[
          { texto: `Ingresos ${dinero(datos.ingresos)} menos el plan de ${dinero(datos.gasto_plan)}.` },
          objetivo && { texto: plan >= objetivo ? 'Alcanza el objetivo de ahorro.' : `${dinero(objetivo - plan)} abajo del objetivo.`, clase: plan >= objetivo ? 'es-bien' : 'es-alerta' },
        ]}
      />
      <Kpi
        titulo={enCurso ? 'Ahorro proyectado' : 'Ahorro logrado'}
        monto={proyectado}
        notas={
          proyectado === null
            ? [{ texto: 'Cuando empiece el mes se ve lo que van logrando.' }]
            : [
                { texto: `${enCurso ? 'A este ritmo gastan' : 'Gastaron'} ${dinero(datos.gasto_proyectado)}.` },
                diferencia !== 0 && {
                  texto: `${dinero(Math.abs(diferencia))} ${diferencia < 0 ? 'menos' : 'más'} que el plan.`,
                  clase: diferencia < 0 ? 'es-alerta' : 'es-bien',
                },
              ]
        }
      />
    </div>
  );
}

function PlanContraGastado({ datos }) {
  const [tipo, setTipo] = useRecordado('ahorro.plan.tipo', 'lineas');
  const hoyISO = hoy();
  const puntos = datos.dias.map((d) => ({
    clave: d.fecha,
    eje: String(deISO(d.fecha).getDate()),
    titulo: capitalizar(`${diaLargo(d.fecha)} de ${nombreMesSolo(d.fecha.slice(0, 7))}`),
    valores: { gastado: d.gastado, plan: d.plan },
    estimado: d.estimado,
    resaltado: d.fecha === hoyISO,
  }));
  const conProyeccion = datos.dias.some((d) => d.estimado && d.gastado !== null);
  const conGasto = datos.dias.some((d) => d.gastado !== null);

  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">El plan contra lo gastado</h2>
        <SelectorTipo tipo={tipo} onCambio={setTipo} />
      </header>
      <Leyenda
        items={[
          ...(conGasto ? [{ clave: 'gastado', nombre: 'Gastado' }] : []),
          ...(conProyeccion ? [{ clave: 'proyeccion', clase: 'serie--gastado clave-linea--punteada', nombre: 'Proyección' }] : []),
          { clave: 'plan', nombre: 'Plan' },
          ...(conGasto ? [{ clave: 'exceso', nombre: 'Por encima del plan' }] : []),
        ]}
      />
      <Grafico
        puntos={puntos}
        series={SERIES}
        tipo={tipo}
        exceso={{ serie: 'gastado', limite: 'plan' }}
        descripcion={`Lo gastado en ${nombreMesSolo(datos.mes)}, acumulado día a día, contra el plan${conProyeccion ? ', con la proyección desde hoy' : ''}.`}
      />
      <p className="tenue pie-grafico">Acumulado del mes{conProyeccion ? '; desde hoy, la proyección a este ritmo' : ''}.</p>
      <Tabla puntos={puntos} series={SERIES} rotulo="Día" />
    </section>
  );
}

/** Plan › Resumen: cuánto ahorrarían con el plan del mes y cuánto van logrando, con el plan contra lo gastado día a día. */
export default function PlanResumen() {
  const { mes } = useApp();
  const { datos, error, reintentar } = useApi(`/plan?mes=${mes}`);

  return (
    <>
      <header className="cabecera">
        <SelectorMes />
        <PestanasPlan />
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos && (
          <div className="pila pantalla plan-resumen">
            <Kpis datos={datos} />
            <PlanContraGastado datos={datos} />
          </div>
        )}
      </Estado>
    </>
  );
}
