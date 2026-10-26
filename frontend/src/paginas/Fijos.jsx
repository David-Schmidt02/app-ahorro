import { useState } from 'react';
import CampoMonto from '../componentes/CampoMonto';
import ChipsCategorias from '../componentes/ChipsCategorias';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono from '../componentes/Icono';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { diaCorto, diasHasta, hoy, mesActual, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';

function FormProgramado({ programado, onListo }) {
  const { refrescar, avisar } = useApp();
  const { datos: categorias } = useApi('/categorias');
  const editando = Boolean(programado);

  const [tipo, setTipo] = useState(programado?.tipo ?? 'gasto');
  const [nombre, setNombre] = useState(programado?.nombre ?? '');
  const [monto, setMonto] = useState(montoATexto(programado?.monto));
  const [moneda, setMoneda] = useState(programado?.moneda ?? 'ARS');
  const [frecuencia, setFrecuencia] = useState(programado?.frecuencia ?? 'mensual');
  const [dia, setDia] = useState(programado?.dia ?? 10);
  const [fecha, setFecha] = useState(programado?.fecha ?? '');
  const [categoriaId, setCategoriaId] = useState(programado?.categoria.id ?? null);
  // null = automático: este mes si el día todavía no pasó, si no el próximo
  const [desdeElegido, setDesdeElegido] = useState(null);
  const [error, setError] = useState(null);

  const delTipo = (categorias ?? []).filter((c) => c.tipo === tipo);
  const mensual = frecuencia === 'mensual';
  const actual = mesActual();
  const desde = desdeElegido ?? (Number(dia) >= Number(hoy().slice(8)) ? actual : sumarMeses(actual, 1));

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    setCategoriaId(null);
  };

  const enviar = async (metodo, ruta, cuerpo, mensaje) => {
    try {
      await api(ruta, { method: metodo, body: cuerpo });
      refrescar();
      avisar(mensaje);
      onListo();
    } catch (err) {
      setError(err.message);
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    const valor = parsearMonto(monto);
    if (!nombre.trim()) return setError('Poné un nombre, por ejemplo «Alquiler»');
    if (!valor) return setError('Ingresá un monto mayor a cero');
    if (!categoriaId) return setError('Elegí una categoría');
    if (!mensual && !fecha) return setError('Elegí la fecha');
    const cuerpo = {
      nombre: nombre.trim(),
      monto: valor,
      moneda,
      categoria_id: categoriaId,
      ...(mensual ? { dia: Number(dia) } : { fecha }),
    };
    if (editando) return enviar('PATCH', `/programados/${programado.id}`, cuerpo, 'Cambios guardados');
    return enviar('POST', '/programados', { ...cuerpo, tipo, frecuencia, ...(mensual && { desde }) }, `${nombre.trim()} programado`);
  };

  const terminar = () =>
    enviar('PATCH', `/programados/${programado.id}`, { hasta: mesActual() }, `${programado.nombre} termina en ${nombreMesSolo(mesActual())}`);
  const reactivar = () => enviar('PATCH', `/programados/${programado.id}`, { hasta: null }, `${programado.nombre} vuelve a estar vigente`);
  const borrar = () => enviar('DELETE', `/programados/${programado.id}`, undefined, `${programado.nombre} borrado`);

  return (
    <form className="formulario" onSubmit={guardar}>
      {!editando && (
        <>
          <div className="segmentado" role="group" aria-label="Tipo">
            <button type="button" aria-pressed={tipo === 'gasto'} onClick={() => cambiarTipo('gasto')}>
              Pago
            </button>
            <button type="button" aria-pressed={tipo === 'ingreso'} onClick={() => cambiarTipo('ingreso')}>
              Cobro
            </button>
          </div>
          <div className="segmentado" role="group" aria-label="Frecuencia">
            <button type="button" aria-pressed={mensual} onClick={() => setFrecuencia('mensual')}>
              Todos los meses
            </button>
            <button type="button" aria-pressed={!mensual} onClick={() => setFrecuencia('unica')}>
              Una sola vez
            </button>
          </div>
        </>
      )}
      <label className="campo">
        <span>Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder={tipo === 'gasto' ? 'Ej.: Alquiler, Expensas, Luz' : 'Ej.: Sueldo'} autoFocus={!editando} />
      </label>
      <CampoMonto id="monto-programado" etiqueta={mensual ? 'Monto estimado' : 'Monto'} valor={monto} onCambio={setMonto} moneda={moneda} onMoneda={setMoneda} />
      {mensual ? (
        <label className="campo">
          <span>{tipo === 'gasto' ? 'Vence el día' : 'Se cobra el día'}</span>
          <select value={dia} onChange={(e) => setDia(e.target.value)}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
                {d > 28 ? ' (o el último día del mes)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {mensual && !editando && (
        <label className="campo">
          <span>Primer vencimiento</span>
          <select value={desde} onChange={(e) => setDesdeElegido(e.target.value)}>
            <option value={actual}>Desde {nombreMesSolo(actual)}</option>
            <option value={sumarMeses(actual, 1)}>Desde {nombreMesSolo(sumarMeses(actual, 1))}</option>
          </select>
        </label>
      )}
      {!mensual && (
        <label className="campo">
          <span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
      )}
      <fieldset className="campo">
        <legend>Categoría</legend>
        {categorias && <ChipsCategorias categorias={delTipo} seleccionada={categoriaId} onElegir={setCategoriaId} />}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        {editando && (
          <button type="button" className="boton boton--peligro" onClick={borrar}>
            <Icono nombre="borrar" tamano={18} /> Borrar
          </button>
        )}
        <button type="submit" className="boton boton--principal">
          {editando ? 'Guardar cambios' : 'Programar'}
        </button>
      </div>
      {editando && mensual && (
        <p className="tenue">
          {programado.hasta ? (
            <>
              Termina en {nombreMesSolo(programado.hasta)}.{' '}
              <button type="button" className="enlace-boton" onClick={reactivar}>
                Volver a activarlo
              </button>
            </>
          ) : (
            <>
              ¿Ya no se paga?{' '}
              <button type="button" className="enlace-boton" onClick={terminar}>
                Terminarlo después de {nombreMesSolo(mesActual())}
              </button>{' '}
              (lo ya pagado se conserva).
            </>
          )}
        </p>
      )}
    </form>
  );
}

function Lista({ titulo, programados, onElegir, detalle }) {
  if (!programados.length) return null;
  const total = programados.filter((p) => p.moneda === 'ARS').reduce((suma, p) => suma + p.monto, 0);
  return (
    <section className="seccion">
      <h2 className="seccion__titulo">
        {titulo}
        {total > 0 && <span className="importe tenue">{dinero(total)}</span>}
      </h2>
      <ul className="renglones">
        {programados.map((p) => (
          <li key={p.id}>
            <button type="button" className="renglon renglon--boton" onClick={() => onElegir(p)}>
              <span className="renglon__icono" style={{ '--color': p.categoria.color }} aria-hidden="true">
                {p.categoria.icono}
              </span>
              <span className="renglon__texto">
                <span className="renglon__titulo">{p.nombre}</span>
                <span className="renglon__detalle">{detalle(p)}</span>
              </span>
              <span className={`importe${p.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>{dinero(p.monto, p.moneda)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Fijos() {
  const { datos: programados, error, reintentar } = useApi('/programados');
  const [hoja, setHoja] = useState(null);
  const actual = mesActual();

  const vigente = (p) => !p.hasta || p.hasta >= actual;
  const mensuales = (programados ?? []).filter((p) => p.frecuencia === 'mensual' && vigente(p));
  const unicos = (programados ?? []).filter((p) => p.frecuencia === 'unica' && diasHasta(p.fecha) >= -31);
  const terminados = (programados ?? []).filter((p) => p.frecuencia === 'mensual' && !vigente(p));
  const diaDe = (p) => `día ${p.dia} · ${p.categoria.nombre}${p.hasta ? ` · hasta ${nombreMesSolo(p.hasta)}` : ''}`;

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Fijos</h1>
        <button type="button" className="boton boton--principal boton--chico" onClick={() => setHoja({ id: Date.now() })}>
          <Icono nombre="mas" tamano={18} grosor={2.4} /> Nuevo
        </button>
      </header>
      <p className="intro">
        Lo que se paga o se cobra todos los meses, y los pagos únicos que ya saben que vienen. Aparecen en Inicio y en el
        Calendario para marcarlos cuando se pagan.
      </p>
      <Estado datos={programados} error={error} reintentar={reintentar}>
        {programados?.length === 0 && (
          <div className="vacio">
            <p>Empiecen por el alquiler, las expensas, los servicios y el sueldo.</p>
            <button type="button" className="boton boton--principal" onClick={() => setHoja({ id: Date.now() })}>
              Programar el primero
            </button>
          </div>
        )}
        <Lista titulo="Cobros mensuales" programados={mensuales.filter((p) => p.tipo === 'ingreso')} onElegir={(p) => setHoja({ id: p.id, programado: p })} detalle={diaDe} />
        <Lista titulo="Pagos mensuales" programados={mensuales.filter((p) => p.tipo === 'gasto')} onElegir={(p) => setHoja({ id: p.id, programado: p })} detalle={diaDe} />
        <Lista
          titulo="Una sola vez"
          programados={unicos}
          onElegir={(p) => setHoja({ id: p.id, programado: p })}
          detalle={(p) => `${diaCorto(p.fecha)} · ${p.categoria.nombre}`}
        />
        <Lista
          titulo="Terminados"
          programados={terminados}
          onElegir={(p) => setHoja({ id: p.id, programado: p })}
          detalle={diaDe}
        />
      </Estado>
      <Hoja titulo={hoja?.programado ? hoja.programado.nombre : 'Nuevo pago o cobro'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormProgramado key={hoja.id} programado={hoja.programado} onListo={() => setHoja(null)} />}
      </Hoja>
    </>
  );
}
