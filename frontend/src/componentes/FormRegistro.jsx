import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { hoy, mesActual, nombreMes, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';
import CampoMonto from './CampoMonto';
import Icono from './Icono';
import { SelectorCategoria, SelectorDia, SelectorFecha } from './Selectores';

const CLAVE_ULTIMA = 'ahorro.ultima-categoria';

/** Cuándo pasa: ya (un movimiento) o más adelante (un pago o cobro programado). */
const MODOS = [
  { valor: 'ahora', nombre: 'Ahora' },
  { valor: 'mensual', nombre: 'Mensual' },
  { valor: 'cuotas', nombre: 'En cuotas', soloGasto: true },
  { valor: 'unica', nombre: 'Más adelante' },
];

function ultimaCategoria(tipo) {
  try {
    return Number(localStorage.getItem(`${CLAVE_ULTIMA}.${tipo}`)) || null;
  } catch {
    return null;
  }
}

function recordarCategoria(tipo, id) {
  try {
    localStorage.setItem(`${CLAVE_ULTIMA}.${tipo}`, String(id));
  } catch {
    // Solo es una comodidad
  }
}

const modoDe = (programado) => (programado.cuotas ? 'cuotas' : programado.frecuencia === 'unica' ? 'unica' : 'mensual');

/**
 * Alta y edición de todo lo que se carga: un movimiento («Ahora») o un pago o cobro programado
 * (mensual, en cuotas o único). Con `movimiento` o `programado` edita; si no, da de alta.
 */
export default function FormRegistro({ movimiento, programado, tipoInicial = 'gasto', modoInicial = 'ahora', onListo }) {
  const { refrescar, avisar } = useApp();
  const { datos: categorias } = useApi('/categorias');
  const original = movimiento ?? programado;
  const editando = Boolean(original);

  const [tipo, setTipo] = useState(original?.tipo ?? tipoInicial);
  const [modo, setModo] = useState(programado ? modoDe(programado) : movimiento ? 'ahora' : modoInicial);
  const [monto, setMonto] = useState(montoATexto(original?.monto));
  const [moneda, setMoneda] = useState(original?.moneda ?? 'ARS');
  const [categoriaId, setCategoriaId] = useState(original?.categoria.id ?? ultimaCategoria(tipo));
  const [nombre, setNombre] = useState(movimiento?.descripcion ?? programado?.nombre ?? '');
  const [fecha, setFecha] = useState(movimiento?.fecha ?? programado?.fecha ?? hoy());
  const [dia, setDia] = useState(programado?.dia ?? Number(hoy().slice(8)));
  const [cuotas, setCuotas] = useState(programado?.cuotas ?? 6);
  // null = automático: este mes si el día todavía no pasó, si no el próximo
  const [desdeElegido, setDesdeElegido] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const ahora = modo === 'ahora';
  const enCuotas = modo === 'cuotas';
  const seRepite = modo === 'mensual' || enCuotas;
  const esGasto = tipo === 'gasto';
  const actual = mesActual();
  const desde = desdeElegido ?? (dia >= Number(hoy().slice(8)) ? actual : sumarMeses(actual, 1));

  const delTipo = (categorias ?? []).filter((c) => c.tipo === tipo);
  // Una categoría archivada no se ofrece para cargar, pero sí se muestra si lo editado ya la tiene
  if (categorias && editando && !delTipo.some((c) => c.id === original.categoria.id)) delTipo.push(original.categoria);
  const categoria = delTipo.find((c) => c.id === categoriaId);

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    setCategoriaId(ultimaCategoria(nuevo));
    if (nuevo === 'ingreso' && enCuotas) setModo('mensual');
  };

  const enviar = async (metodo, ruta, cuerpo, mensaje) => {
    setGuardando(true);
    setError(null);
    try {
      await api(ruta, { method: metodo, body: cuerpo });
      refrescar();
      avisar(mensaje);
      onListo();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    const valor = parsearMonto(monto);
    if (!valor) return setError('Ingresá un monto mayor a cero');
    if (!categoria) return setError('Elegí una categoría');
    if (enCuotas && !editando && !(Number(cuotas) >= 2 && Number(cuotas) <= 72)) return setError('Las cuotas van de 2 a 72');
    if (!editando) recordarCategoria(tipo, categoria.id);
    const comunes = { monto: valor, moneda, categoria_id: categoria.id };

    if (ahora) {
      const cuerpo = { ...comunes, descripcion: nombre.trim() || null, fecha };
      if (movimiento) return enviar('PATCH', `/movimientos/${movimiento.id}`, cuerpo, 'Cambios guardados');
      return enviar('POST', '/movimientos', { ...cuerpo, tipo }, esGasto ? 'Gasto guardado' : 'Ingreso guardado');
    }
    const titulo = nombre.trim() || categoria.nombre;
    const cuando = seRepite ? { dia } : { fecha };
    if (programado) return enviar('PATCH', `/programados/${programado.id}`, { ...comunes, nombre: titulo, ...cuando }, 'Cambios guardados');
    return enviar(
      'POST',
      '/programados',
      {
        ...comunes,
        ...cuando,
        nombre: titulo,
        tipo,
        frecuencia: seRepite ? 'mensual' : 'unica',
        ...(seRepite && { desde }),
        ...(enCuotas && { cuotas: Number(cuotas) }),
      },
      enCuotas ? `${titulo}: ${cuotas} cuotas programadas` : `${titulo} programado`,
    );
  };

  const borrar = () =>
    movimiento
      ? enviar('DELETE', `/movimientos/${movimiento.id}`, undefined, movimiento.programado_id ? 'Pago borrado: vuelve a figurar como pendiente' : 'Movimiento borrado')
      : enviar('DELETE', `/programados/${programado.id}`, undefined, `${programado.nombre} borrado`);
  const terminar = () =>
    enviar('PATCH', `/programados/${programado.id}`, { hasta: actual }, `${programado.nombre} termina en ${nombreMesSolo(actual)}`);
  const reactivar = () => enviar('PATCH', `/programados/${programado.id}`, { hasta: null }, `${programado.nombre} vuelve a estar vigente`);

  const valorCuota = parsearMonto(monto);
  const etiquetaMonto = enCuotas ? 'Monto de cada cuota' : modo === 'mensual' ? 'Monto estimado' : 'Monto';
  const etiquetaNombre = ahora ? 'Detalle (opcional)' : 'Nombre (opcional)';
  const ejemplo = { ahora: esGasto ? 'Ej.: verdulería' : 'Ej.: sueldo de octubre', mensual: esGasto ? 'Ej.: Alquiler' : 'Ej.: Sueldo', cuotas: 'Ej.: Heladera', unica: 'Ej.: Seguro del auto' }[modo];

  return (
    <form className="formulario" onSubmit={guardar}>
      {!editando && (
        <>
          <div className="segmentado" role="group" aria-label="Tipo">
            <button type="button" aria-pressed={esGasto} onClick={() => cambiarTipo('gasto')}>
              Gasto
            </button>
            <button type="button" aria-pressed={!esGasto} onClick={() => cambiarTipo('ingreso')}>
              Ingreso
            </button>
          </div>
          <div className="segmentado segmentado--chico segmentado--modos" role="group" aria-label="Cuándo">
            {MODOS.filter((m) => esGasto || !m.soloGasto).map((m) => (
              <button key={m.valor} type="button" aria-pressed={modo === m.valor} onClick={() => setModo(m.valor)}>
                {m.nombre}
              </button>
            ))}
          </div>
        </>
      )}

      <CampoMonto id="monto" etiqueta={etiquetaMonto} valor={monto} onCambio={setMonto} moneda={moneda} onMoneda={setMoneda} autoFocus={!editando} />

      {categorias ? <SelectorCategoria categorias={delTipo} valor={categoria?.id ?? null} onCambio={setCategoriaId} /> : <p className="tenue">Cargando…</p>}

      <label className="campo">
        <span>{etiquetaNombre}</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={ahora ? 120 : 60} placeholder={ejemplo} />
      </label>

      {ahora && <SelectorFecha valor={fecha} onCambio={setFecha} atajos />}
      {modo === 'unica' && <SelectorFecha etiqueta={esGasto ? 'Fecha del pago' : 'Fecha del cobro'} valor={fecha} onCambio={setFecha} />}
      {seRepite && <SelectorDia etiqueta={esGasto ? 'Vence' : 'Se cobra'} valor={dia} onCambio={setDia} />}

      {seRepite && !editando && (
        <div className="campos-en-fila">
          {enCuotas && (
            <label className="campo">
              <span>Cuotas</span>
              <input type="number" inputMode="numeric" min={2} max={72} value={cuotas} onChange={(e) => setCuotas(e.target.value)} />
            </label>
          )}
          <div className="campo">
            <span id="desde-etiqueta">{enCuotas ? 'Primera cuota' : 'Desde'}</span>
            <div className="segmentado segmentado--chico" role="group" aria-labelledby="desde-etiqueta">
              {[actual, sumarMeses(actual, 1)].map((m) => (
                <button key={m} type="button" aria-pressed={desde === m} onClick={() => setDesdeElegido(m)}>
                  {nombreMesSolo(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {enCuotas && !editando && valorCuota > 0 && Number(cuotas) >= 2 && (
        <p className="tenue">
          {cuotas} cuotas de {dinero(valorCuota, moneda)}: {dinero(valorCuota * Number(cuotas), moneda)} en total, la última en{' '}
          {nombreMes(sumarMeses(desde, Number(cuotas) - 1))}. Cada una aparece en Pagos y cobros para marcarla.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="acciones">
        {editando && (
          <button type="button" className="boton boton--peligro" onClick={borrar} disabled={guardando}>
            <Icono nombre="borrar" tamano={18} /> Borrar
          </button>
        )}
        <button type="submit" className="boton boton--principal" disabled={guardando}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : ahora ? `Guardar ${tipo}` : enCuotas ? 'Programar cuotas' : 'Programar'}
        </button>
      </div>

      {programado && enCuotas && (
        <p className="tenue">
          {programado.cuotas} cuotas, de {nombreMes(programado.desde)} a {nombreMes(programado.hasta)}.
        </p>
      )}
      {programado && modo === 'mensual' && (
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
                Terminarlo después de {nombreMesSolo(actual)}
              </button>{' '}
              (lo ya pagado se conserva).
            </>
          )}
        </p>
      )}
    </form>
  );
}
