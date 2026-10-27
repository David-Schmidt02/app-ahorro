import { useApp } from '../estado/contextos';
import { mesActual, nombreMes, sumarMeses } from '../lib/fechas';
import Icono from './Icono';

export default function SelectorMes() {
  const { mes, setMes } = useApp();
  const esActual = mes === mesActual();

  return (
    <div className="selector-mes">
      <button type="button" className="boton-icono" onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior" title="Mes anterior (Alt + ←)">
        <Icono nombre="izquierda" />
      </button>
      <h1 className="selector-mes__nombre">{nombreMes(mes)}</h1>
      <button type="button" className="boton-icono" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente" title="Mes siguiente (Alt + →)">
        <Icono nombre="derecha" />
      </button>
      {!esActual && (
        <button type="button" className="selector-mes__hoy" onClick={() => setMes(mesActual())} title="Volver a hoy (H)">
          Volver a hoy
        </button>
      )}
    </div>
  );
}
