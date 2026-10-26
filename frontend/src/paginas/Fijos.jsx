import { useState } from 'react';
import CampoMonto from '../componentes/CampoMonto';
import ChipsCategorias from '../componentes/ChipsCategorias';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono, { IconoCategoria } from '../componentes/Icono';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { diaCorto, diasHasta, hoy, mesActual, nombreMes, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';

function FormProgramado({ programado, onListo }) {
  const { refrescar, avisar } = useApp();
  const { datos: categorias } = useApi('/categorias');
  const editando = Boolean(programado);

  const [tipo, setTipo] = useState(programado?.tipo ?? 'gasto');
  const [nombre, setNombre] = useState(programado?.nombre ?? '');
  const [monto, setMonto] = useState(montoATexto(programado?.monto));
  const [moneda, setMoneda] = useState(programado?.moneda ?? 'ARS');
  // 'mensual', 'cuotas' (un mensual que termina solo) o 'unica'
  const [modo, setModo] = useState(programado?.cuotas ? 'cuotas' : (programado?.frecuencia ?? 'mensual'));
  const [cuotas, setCuotas] = useState(programado?.cuotas ?? 6);
  const [dia, setDia] = useState(programado?.dia ?? 10);
  const [fecha, setFecha] = useState(programado?.fecha ?? '');
  const [categoriaId, setCategoriaId] = useState(programado?.categoria.id ?? null);
  // null = automático: este mes si el día todavía no pasó, si no el próximo
  const [desdeElegido, setDesdeElegido] = useState(null);
  const [error, setError] = useState(null);

  const delTipo = (categorias ?? []).filter((c) => c.tipo === tipo);
  const mensual = modo !== 'unica';
  const enCuotas = modo === 'cuotas';
  const frecuencia = mensual ? 'mensual' : 'unica';
  const actual = mesActual();
  const desde = desdeElegido ?? (Number(dia) >= Number(hoy().slice(8)) ? actual : sumarMeses(actual, 1));

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    setCategoriaId(null);
    if (nuevo === 'ingreso' && enCuotas) setModo('mensual');
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
    if (enCuotas && !(Number(cuotas) >= 2 && Number(cuotas) <= 72)) return setError('Las cuotas van de 2 a 72');
    const cuerpo = {
      nombre: nombre.trim(),
      monto: valor,
      moneda,
      categoria_id: categoriaId,
      ...(mensual ? { dia: Number(dia) } : { fecha }),
    };
    if (editando) return enviar('PATCH', `/programados/${programado.id}`, cuerpo, 'Cambios guardados');
    const extra = { ...(mensual && { desde }), ...(enCuotas && { cuotas: Number(cuotas) }) };
    return enviar('POST', '/programados', { ...cuerpo, tipo, frecuencia, ...extra }, `${nombre.trim()} programado`);
  };

  const terminar = () =>
    enviar(
      'PATCH',
      `/programados/${programado.id}`,
      { hasta: mesActual() },
      `${programado.nombre} termina en ${nombreMesSolo(mesActual())}`,
    );
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
            <button type="button" aria-pressed={modo === 'mensual'} onClick={() => setModo('mensual')}>
              Todos los meses
            </button>
            {tipo === 'gasto' && (
              <button type="button" aria-pressed={enCuotas} onClick={() => setModo('cuotas')}>
                En cuotas
              </button>
            )}
            <button type="button" aria-pressed={!mensual} onClick={() => setModo('unica')}>
              Una sola vez
            </button>
          </div>
        </>
      )}
      <label className="campo">
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={60}
          placeholder={enCuotas ? 'Ej.: Heladera' : tipo === 'gasto' ? 'Ej.: Alquiler, Expensas, Luz' : 'Ej.: Sueldo'}
          autoFocus={!editando}
        />
      </label>
      <CampoMonto
        id="monto-programado"
        etiqueta={enCuotas ? 'Monto de cada cuota' : mensual ? 'Monto estimado' : 'Monto'}
        valor={monto}
        onCambio={setMonto}
        moneda={moneda}
        onMoneda={setMoneda}
      />
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
      {enCuotas && !editando && (
        <label className="campo">
          <span>Cantidad de cuotas</span>
          <input type="number" inputMode="numeric" min={2} max={72} value={cuotas} onChange={(e) => setCuotas(e.target.value)} />
        </label>
      )}
      {mensual && !editando && (
        <label className="campo">
          <span>{enCuotas ? 'Primera cuota' : 'Primer vencimiento'}</span>
          <select value={desde} onChange={(e) => setDesdeElegido(e.target.value)}>
            <option value={actual}>Desde {nombreMesSolo(actual)}</option>
            <option value={sumarMeses(actual, 1)}>Desde {nombreMesSolo(sumarMeses(actual, 1))}</option>
          </select>
        </label>
      )}
      {enCuotas && !editando && parsearMonto(monto) > 0 && Number(cuotas) >= 2 && (
        <p className="tenue">
          En total {dinero(parsearMonto(monto) * Number(cuotas), moneda)}; la última cuota vence en {nombreMes(sumarMeses(desde, Number(cuotas) - 1))}.
        </p>
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
      {editando && enCuotas && (
        <p className="tenue">
          {programado.cuotas} cuotas, de {nombreMes(programado.desde)} a {nombreMes(programado.hasta)}.
        </p>
      )}
      {editando && mensual && !enCuotas && (
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

const etiquetaMes = (v) => (v.cuotas ? `Cuota ${v.cuota}/${v.cuotas}` : nombreMesSolo(mesActual()));

function Lista({ titulo, programados, vencimientos, onElegir, cuando }) {
  if (!programados.length) return null;
  const total = programados.filter((p) => p.moneda === 'ARS').reduce((suma, p) => suma + p.monto, 0);
  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">{titulo}</h2>
        {total > 0 && <span className="importe tenue">{dinero(total)}</span>}
      </header>
      <ul className="renglones">
        {programados.map((p) => {
          const estado = estadoDelMes(p, vencimientos);
          return (
            <li key={p.id}>
              <button type="button" className="renglon renglon--boton renglon--tabla" onClick={() => onElegir(p)}>
                <IconoCategoria icono={p.categoria.icono} color={p.categoria.color} />
                <span className="renglon__texto">
                  <span className="renglon__titulo">{p.nombre}</span>
                  <span className="renglon__detalle">
                    {cuando(p)} · {p.categoria.nombre}
                  </span>
                </span>
                <span className="renglon__columna">{p.hasta ? `Hasta ${nombreMesSolo(p.hasta)}` : cuando(p)}</span>
                <span className={`renglon__columna ${estado?.clase ?? ''}`}>{estado ? `${etiquetaMes(vencimientos.get(p.id))}: ${estado.texto}` : '—'}</span>
                <span className={`importe${p.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>{dinero(p.monto, p.moneda)}</span>
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
  const [hoja, setHoja] = useState(null);
  const actual = mesActual();

  const vigente = (p) => !p.hasta || p.hasta >= actual;
  const mensuales = (programados ?? []).filter((p) => p.frecuencia === 'mensual' && !p.cuotas && vigente(p));
  const enCuotas = (programados ?? []).filter((p) => p.cuotas && vigente(p));
  const unicos = (programados ?? []).filter((p) => p.frecuencia === 'unica' && diasHasta(p.fecha) >= -31);
  const terminados = (programados ?? []).filter((p) => p.frecuencia === 'mensual' && !vigente(p));
  const { datos: delMes } = useApi(`/programados/vencimientos?mes=${actual}`);
  const vencimientos = new Map((delMes ?? []).map((v) => [v.programado_id, v]));
  const elegir = (p) => setHoja({ id: p.id, programado: p });
  const comunes = { vencimientos, onElegir: elegir };
  const mensual = (p) => `Todos los meses, día ${p.dia}`;

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Fijos</h1>
        <button type="button" className="boton boton--principal boton--chico" onClick={() => setHoja({ id: Date.now() })}>
          <Icono nombre="mas" tamano={18} grosor={2.4} /> Nuevo
        </button>
      </header>
      <p className="intro">
        Lo que se paga o se cobra todos los meses, las compras en cuotas y los pagos únicos que ya saben que vienen. Aparecen en Inicio y en el Calendario para
        marcarlos cuando se pagan.
      </p>
      <Estado datos={programados} error={error} reintentar={reintentar}>
        {programados?.length === 0 && (
          <div className="tarjeta vacio">
            <p>Empiecen por el alquiler, las expensas, los servicios y el sueldo.</p>
            <button type="button" className="boton boton--principal" onClick={() => setHoja({ id: Date.now() })}>
              Programar el primero
            </button>
          </div>
        )}
        <Lista titulo="Cobros mensuales" programados={mensuales.filter((p) => p.tipo === 'ingreso')} cuando={mensual} {...comunes} />
        <Lista titulo="Pagos mensuales" programados={mensuales.filter((p) => p.tipo === 'gasto')} cuando={mensual} {...comunes} />
        <Lista titulo="En cuotas" programados={enCuotas} cuando={(p) => `${p.cuotas} cuotas, hasta ${nombreMes(p.hasta)}`} {...comunes} />
        <Lista titulo="Una sola vez" programados={unicos} cuando={(p) => `El ${diaCorto(p.fecha)}`} {...comunes} />
        <Lista titulo="Terminados" programados={terminados} cuando={mensual} {...comunes} />
      </Estado>
      <Hoja
        titulo={hoja?.programado ? hoja.programado.nombre : 'Nuevo pago o cobro'}
        abierta={Boolean(hoja)}
        onCerrar={() => setHoja(null)}
      >
        {hoja && <FormProgramado key={hoja.id} programado={hoja.programado} onListo={() => setHoja(null)} />}
      </Hoja>
    </>
  );
}
