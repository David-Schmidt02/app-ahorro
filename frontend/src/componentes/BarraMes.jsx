import { dinero } from '../lib/formato';

const pct = (valor, total) => `${Math.max(0, Math.min(100, (valor / total) * 100))}%`;

/**
 * El mes en una barra: el renglón es la plata del mes (lo cobrado, y punteado lo que falta cobrar);
 * encima, lo gastado en tinta, lo comprometido sin pagar rayado y lo que queda de los cupos semanales
 * con un rayado más suave. La marca es el objetivo de ahorro:
 * a su derecha está lo que hay que dejar sin tocar.
 */
export default function BarraMes({ resumen }) {
  const { ingresos, pendiente_ingresos: porCobrar, gastos, pendiente_gastos: porPagar, objetivo_ars: objetivo } = resumen;
  const cupos = resumen.reservado_cupos;
  const disponible = ingresos + porCobrar;
  const comprometido = gastos + porPagar + cupos;
  const total = Math.max(disponible, comprometido, 1);
  const libre = disponible - comprometido;

  const limite = objetivo && disponible > 0 ? Math.max(0, disponible - objetivo) : null;
  const enRiesgo = limite !== null && comprometido > limite;

  const descripcion = `Ingresos ${dinero(disponible)}, gastado ${dinero(gastos)}, por pagar ${dinero(porPagar)}${
    cupos > 0 ? `, por gastar de los cupos ${dinero(cupos)}` : ''
  }, libre ${dinero(libre)}`;

  return (
    <figure className="barra-mes">
      <div className="barra-mes__pista" role="img" aria-label={descripcion}>
        <div className="barra-mes__cobrado" style={{ width: pct(ingresos, total) }} />
        {porCobrar > 0 && <div className="barra-mes__por-cobrar" style={{ left: pct(ingresos, total), width: pct(porCobrar, total) }} />}
        <div className="barra-mes__gastado" style={{ width: pct(gastos, total) }} />
        {porPagar > 0 && <div className="barra-mes__por-pagar" style={{ left: pct(gastos, total), width: pct(porPagar, total) }} />}
        {cupos > 0 && <div className="barra-mes__cupos" style={{ left: pct(gastos + porPagar, total), width: pct(cupos, total) }} />}
        {limite !== null && (
          <div className={`barra-mes__objetivo${enRiesgo ? ' es-riesgo' : ''}`} style={{ left: pct(limite, total) }}>
            <span>ahorro</span>
          </div>
        )}
      </div>
      <figcaption className="barra-mes__leyenda">
        <span className="leyenda leyenda--gastado">Gastado {dinero(gastos)}</span>
        <span className="leyenda leyenda--por-pagar">Por pagar {dinero(porPagar)}</span>
        {cupos > 0 && <span className="leyenda leyenda--cupos">Cupos {dinero(cupos)}</span>}
        <span className="leyenda leyenda--libre">{libre >= 0 ? 'Libre' : 'Faltante'} {dinero(Math.abs(libre))}</span>
      </figcaption>
    </figure>
  );
}
