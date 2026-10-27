import Estado from '../componentes/Estado';
import Icono, { IconoCategoria } from '../componentes/Icono';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { diaCorto, diasHasta, mesActual, nombreMes, nombreMesSolo } from '../lib/fechas';
import { dinero } from '../lib/formato';

const ESTADOS = {
  pagado: { texto: 'Registrado', clase: 'es-bien' },
  pendiente: { texto: 'Pendiente', clase: '' },
  vencido: { texto: 'Vencido', clase: 'es-alerta' },
};

/** Estado de este mes según los vencimientos: registrado, pendiente, vencido o sin vencimiento. */
function estadoDelMes(programado, vencimientos) {
  const v = vencimientos.get(programado.id);
  if (!v) return null;
  if (v.pagado) return ESTADOS.pagado;
  return programado.tipo === 'gasto' && diasHasta(v.fecha) < 0 ? ESTADOS.vencido : { ...ESTADOS.pendiente, texto: `Pendiente · ${diaCorto(v.fecha)}` };
}

/** Estado de este mes; en las cuotas, con el número de cuota. */
const textoEstado = (estado, v) => (v.cuotas ? `Cuota ${v.cuota}/${v.cuotas} · ${estado.texto}` : estado.texto);

function Lista({ titulo, programados, vencimientos, onElegir, cuando, llena = false }) {
  if (!programados.length) return null;
  const total = programados.filter((p) => p.moneda === 'ARS').reduce((suma, p) => suma + p.monto, 0);
  return (
    <section className={`tarjeta${llena ? ' tarjeta--llena' : ''}`}>
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">{titulo}</h2>
        {total > 0 && <span className="importe tenue">{dinero(total)}</span>}
      </header>
      <ul className={`renglones${llena ? ' desplazable' : ''}`}>
        {programados.map((p) => {
          const estado = estadoDelMes(p, vencimientos);
          return (
            <li key={p.id}>
              <button type="button" className="renglon renglon--boton renglon--tabla" onClick={() => onElegir(p)}>
                <IconoCategoria icono={p.categoria.icono} color={p.categoria.color} />
                <span className="renglon__texto">
                  <span className="renglon__titulo">{p.nombre}</span>
                  <span className="renglon__detalle">
                    {cuando(p)}
                    {/* Con columnas, la categoría tiene la suya */}
                    <span className="renglon__detalle--compacto"> · {p.categoria.nombre}</span>
                  </span>
                </span>
                <span className="renglon__columna">{p.categoria.nombre}</span>
                <span className={`renglon__columna ${estado?.clase ?? ''}`} title={estado ? `${nombreMesSolo(mesActual())}: ${estado.texto}` : undefined}>
                  {estado ? textoEstado(estado, vencimientos.get(p.id)) : '—'}
                </span>
                <span className={`importe${p.moneda === 'USD' ? ' es-usd' : ''}${p.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>
                  {dinero(p.monto, p.moneda)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Fijos() {
  const { datos: programados, error, reintentar } = useApi('/programados');
  const { abrirCarga } = useApp();
  const actual = mesActual();

  const vigente = (p) => !p.hasta || p.hasta >= actual;
  const mensuales = (programados ?? []).filter((p) => p.frecuencia === 'mensual' && !p.cuotas && vigente(p));
  const enCuotas = (programados ?? []).filter((p) => p.cuotas && vigente(p));
  const unicos = (programados ?? []).filter((p) => p.frecuencia === 'unica' && diasHasta(p.fecha) >= -31);
  const terminados = (programados ?? []).filter((p) => p.frecuencia === 'mensual' && !vigente(p));
  const { datos: delMes } = useApi(`/programados/vencimientos?mes=${actual}`);
  const vencimientos = new Map((delMes ?? []).map((v) => [v.programado_id, v]));
  const elegir = (programado) => abrirCarga({ programado });
  const nuevo = () => abrirCarga({ modo: 'mensual' });
  const comunes = { vencimientos, onElegir: elegir };
  const mensual = (p) => `Todos los meses, día ${p.dia}`;

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Fijos</h1>
        <button type="button" className="boton boton--principal boton--chico" onClick={nuevo}>
          <Icono nombre="mas" tamano={18} grosor={2.4} /> Nuevo
        </button>
      </header>
      <p className="intro">
        Lo que se paga o se cobra todos los meses, las compras en cuotas y los pagos únicos que ya saben que vienen. Aparecen en Inicio y en el Calendario para
        marcarlos cuando se pagan.
      </p>
      <Estado datos={programados} error={error} reintentar={reintentar}>
        {programados?.length === 0 ? (
          <div className="tarjeta vacio">
            <p>Empiecen por el alquiler, las expensas, los servicios y el sueldo.</p>
            <button type="button" className="boton boton--principal" onClick={nuevo}>
              Programar el primero
            </button>
          </div>
        ) : (
          <div className="dos-columnas dos-columnas--parejas pantalla">
            <div className="pila">
              <Lista titulo="Pagos mensuales" programados={mensuales.filter((p) => p.tipo === 'gasto')} cuando={mensual} llena {...comunes} />
            </div>
            <div className="pila">
              <Lista titulo="Cobros mensuales" programados={mensuales.filter((p) => p.tipo === 'ingreso')} cuando={mensual} {...comunes} />
              <Lista titulo="En cuotas" programados={enCuotas} cuando={(p) => `${p.cuotas} cuotas, hasta ${nombreMes(p.hasta)}`} {...comunes} />
              <Lista titulo="Una sola vez" programados={unicos} cuando={(p) => `El ${diaCorto(p.fecha)}`} {...comunes} />
              <Lista titulo="Terminados" programados={terminados} cuando={(p) => `Terminó en ${nombreMes(p.hasta)}`} {...comunes} />
            </div>
          </div>
        )}
      </Estado>
    </>
  );
}
