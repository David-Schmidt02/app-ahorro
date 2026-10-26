import { useState } from 'react';
import Estado from '../componentes/Estado';
import SelectorMes from '../componentes/SelectorMes';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { conParams } from '../lib/api';
import { diaLargo } from '../lib/fechas';
import { dinero } from '../lib/formato';

const FILTROS = [
  { valor: '', nombre: 'Todo' },
  { valor: 'gasto', nombre: 'Gastos' },
  { valor: 'ingreso', nombre: 'Ingresos' },
];

function agruparPorDia(movimientos) {
  const grupos = new Map();
  for (const m of movimientos) {
    if (!grupos.has(m.fecha)) grupos.set(m.fecha, []);
    grupos.get(m.fecha).push(m);
  }
  return [...grupos.entries()];
}

export default function Movimientos() {
  const { mes, abrirCarga } = useApp();
  const [tipo, setTipo] = useState('');
  const { datos: movimientos, error, reintentar } = useApi(conParams('/movimientos', { mes, tipo }));

  return (
    <>
      <header className="cabecera">
        <SelectorMes />
      </header>
      <div className="segmentado segmentado--filtro" role="group" aria-label="Filtrar">
        {FILTROS.map((f) => (
          <button key={f.valor} type="button" aria-pressed={tipo === f.valor} onClick={() => setTipo(f.valor)}>
            {f.nombre}
          </button>
        ))}
      </div>
      <Estado datos={movimientos} error={error} reintentar={reintentar}>
        {movimientos?.length === 0 && (
          <div className="vacio">
            <p>No hay {tipo === 'ingreso' ? 'ingresos' : tipo === 'gasto' ? 'gastos' : 'movimientos'} cargados en este mes.</p>
            <button type="button" className="boton boton--principal" onClick={() => abrirCarga({ tipo: tipo || 'gasto' })}>
              Cargar {tipo === 'ingreso' ? 'un ingreso' : 'un gasto'}
            </button>
          </div>
        )}
        <div className="libreta">
          {agruparPorDia(movimientos ?? []).map(([fecha, delDia]) => {
            const gastadoDia = delDia.filter((m) => m.tipo === 'gasto').reduce((total, m) => total + m.monto_ars, 0);
            return (
              <section key={fecha} className="libreta__dia">
                <h2 className="libreta__fecha">
                  <span>{diaLargo(fecha)}</span>
                  {gastadoDia > 0 && delDia.length > 1 && <span className="importe tenue">{dinero(gastadoDia)}</span>}
                </h2>
                <ul className="renglones">
                  {delDia.map((m) => (
                    <li key={m.id}>
                      <button type="button" className="renglon renglon--boton" onClick={() => abrirCarga({ movimiento: m })}>
                        <span className="renglon__icono" style={{ '--color': m.categoria.color }} aria-hidden="true">
                          {m.categoria.icono}
                        </span>
                        <span className="renglon__texto">
                          <span className="renglon__titulo">{m.descripcion || m.categoria.nombre}</span>
                          <span className="renglon__detalle">
                            {[m.descripcion && m.categoria.nombre, m.moneda === 'USD' && `${dinero(m.monto_ars)} a ${dinero(m.cotizacion)}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <span className={`importe${m.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>
                          {dinero(m.monto, m.moneda, { signo: m.tipo === 'ingreso' })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Estado>
    </>
  );
}
