import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminCategorias from '../componentes/AdminCategorias';
import Estado from '../componentes/Estado';
import Icono, { IconoCategoria } from '../componentes/Icono';
import SelectorMes from '../componentes/SelectorMes';
import Torta from '../componentes/Torta';
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

const enDolares = (m) => (m.moneda === 'USD' ? `${dinero(m.monto_ars)} a ${dinero(m.cotizacion)}` : null);

function Renglon({ m, onEditar }) {
  const origen = m.programado_id ? 'Pago programado' : enDolares(m);
  return (
    <li>
      <button type="button" className="renglon renglon--boton renglon--tabla" onClick={() => onEditar(m)}>
        <IconoCategoria icono={m.categoria.icono} color={m.categoria.color} />
        <span className="renglon__texto">
          <span className="renglon__titulo">{m.descripcion || m.categoria.nombre}</span>
          <span className="renglon__detalle renglon__detalle--compacto">
            {[m.descripcion && m.categoria.nombre, enDolares(m)].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="renglon__columna">{m.categoria.nombre}</span>
        <span className="renglon__columna">
          {m.programado_id && <Icono nombre="repetir" tamano={14} />} {origen ?? ''}
        </span>
        <span className={`importe${m.moneda === 'USD' ? ' es-usd' : ''}${m.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>
          {dinero(m.monto, m.moneda, { signo: m.tipo === 'ingreso' })}
        </span>
      </button>
    </li>
  );
}

function Libreta() {
  const { mes, abrirCarga } = useApp();
  const [parametros, setParametros] = useSearchParams();
  const [tipo, setTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const categoriaId = Number(parametros.get('categoria')) || null;

  const setCategoriaId = (id) => {
    setParametros(
      (prev) => {
        const siguiente = new URLSearchParams(prev);
        if (id) siguiente.set('categoria', String(id));
        else siguiente.delete('categoria');
        return siguiente;
      },
      { replace: true },
    );
  };

  const { datos: movimientos, error, reintentar } = useApi(conParams('/movimientos', { mes, tipo, categoria_id: categoriaId }));
  const { datos: resumen } = useApi(`/resumen?mes=${mes}`);
  const filtrada = resumen?.categorias.find((c) => c.categoria.id === categoriaId)?.categoria;
  const categoriasChip = (resumen?.categorias ?? []).filter((c) => c.gastado > 0 || c.categoria.id === categoriaId);
  const nombreTipo = tipo === 'ingreso' ? 'ingresos' : tipo === 'gasto' ? 'gastos' : 'movimientos';
  const termino = busqueda.trim().toLowerCase();
  const visibles = (movimientos ?? []).filter(
    (m) => !termino || (m.descripcion ?? '').toLowerCase().includes(termino) || m.categoria.nombre.toLowerCase().includes(termino),
  );

  const elegirTipo = (valor) => {
    setTipo(valor);
    if (valor === 'ingreso') setCategoriaId(null);
  };

  return (
    <div className="dos-columnas pantalla">
      <div className="pila">
        <div className="libreta-controles">
          <div className="segmentado segmentado--filtro" role="group" aria-label="Filtrar">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" aria-pressed={tipo === f.valor} onClick={() => elegirTipo(f.valor)}>
                {f.nombre}
              </button>
            ))}
          </div>
          <div className="buscador">
            <Icono nombre="buscar" tamano={18} className="buscador__icono" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar movimiento…"
              aria-label="Buscar movimientos"
            />
            {busqueda && (
              <button type="button" className="boton-icono buscador__limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                <Icono nombre="cerrar" tamano={16} />
              </button>
            )}
          </div>
        </div>
        {tipo !== 'ingreso' && categoriasChip.length > 0 && (
          <div className="chips chips--libreta solo-celular" role="group" aria-label="Filtrar por categoría">
            <button type="button" className="chip chip--chico" aria-pressed={categoriaId === null} onClick={() => setCategoriaId(null)}>
              Todas
            </button>
            {categoriasChip.map(({ categoria: c }) => (
              <button
                key={c.id}
                type="button"
                className="chip chip--chico"
                style={{ '--chip': c.color }}
                aria-pressed={categoriaId === c.id}
                onClick={() => setCategoriaId(categoriaId === c.id ? null : c.id)}
              >
                <IconoCategoria icono={c.icono} color={c.color} tamano="chico" />
                {c.nombre}
              </button>
            ))}
          </div>
        )}
        {filtrada && (
          <p className="filtro-activo">
            <IconoCategoria icono={filtrada.icono} color={filtrada.color} tamano="chico" />
            Solo {filtrada.nombre}
            <button type="button" className="enlace-boton" onClick={() => setCategoriaId(null)}>
              Ver todo
            </button>
          </p>
        )}
        <Estado datos={movimientos} error={error} reintentar={reintentar}>
          {movimientos?.length === 0 ? (
            <div className="tarjeta vacio">
              <p>No hay {nombreTipo} cargados en este mes.</p>
              <button type="button" className="boton boton--principal" onClick={() => abrirCarga({ tipo: tipo || 'gasto' })}>
                Cargar {tipo === 'ingreso' ? 'un ingreso' : 'un gasto'}
              </button>
            </div>
          ) : visibles.length === 0 ? (
            <div className="tarjeta vacio">
              <p>No hay movimientos que coincidan con «{busqueda.trim()}».</p>
              <button type="button" className="boton boton--chico" onClick={() => setBusqueda('')}>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="libreta">
              {agruparPorDia(visibles).map(([fecha, delDia]) => {
                const gastadoDia = delDia.filter((m) => m.tipo === 'gasto').reduce((total, m) => total + m.monto_ars, 0);
                return (
                  <section key={fecha} className="libreta__dia">
                    <h2 className="libreta__fecha">
                      <span>{diaLargo(fecha)}</span>
                      {gastadoDia > 0 && delDia.length > 1 && <span className="importe tenue">{dinero(gastadoDia)}</span>}
                    </h2>
                    <ul className="renglones">
                      {delDia.map((m) => (
                        <Renglon key={m.id} m={m} onEditar={(movimiento) => abrirCarga({ movimiento })} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </Estado>
      </div>
      {resumen && (
        <aside className="lateral pila">
          <dl className="tarjeta cifras">
            <div>
              <dt>Entró</dt>
              <dd className="es-ingreso">{dinero(resumen.ingresos)}</dd>
            </div>
            <div>
              <dt>Salió</dt>
              <dd>{dinero(resumen.gastos)}</dd>
            </div>
            <div>
              <dt>Ahorrado</dt>
              <dd className={resumen.ahorro < 0 ? 'es-alerta' : ''}>{dinero(resumen.ahorro)}</dd>
            </div>
          </dl>
          <Torta
            categorias={resumen.categorias}
            titulo="Filtrar por categoría"
            elegida={categoriaId}
            onElegir={(id) => {
              setCategoriaId(id);
              if (id && tipo === 'ingreso') setTipo('');
            }}
          />
        </aside>
      )}
    </div>
  );
}

export default function Movimientos() {
  const [vista, setVista] = useState('libreta');

  return (
    <>
      <header className="cabecera">
        <SelectorMes />
        <div className="segmentado segmentado--pestanas" role="tablist" aria-label="Vista">
          <button type="button" role="tab" aria-selected={vista === 'libreta'} onClick={() => setVista('libreta')}>
            <Icono nombre="lista" tamano={18} /> Libreta
          </button>
          <button type="button" role="tab" aria-selected={vista === 'categorias'} onClick={() => setVista('categorias')}>
            <Icono nombre="categorias" tamano={18} /> Categorías
          </button>
        </div>
      </header>
      {vista === 'libreta' ? <Libreta /> : <AdminCategorias />}
    </>
  );
}
