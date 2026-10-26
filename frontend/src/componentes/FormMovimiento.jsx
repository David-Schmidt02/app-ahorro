import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { ayer, hoy, mesActual, mesDe, nombreMesSolo, sumarMeses } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';
import CampoMonto from './CampoMonto';
import ChipsCategorias from './ChipsCategorias';
import Icono from './Icono';

const CLAVE_ULTIMA = 'ahorro.ultima-categoria';

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

/** Alta rápida o edición de un movimiento. `movimiento` presente = edición. */
export default function FormMovimiento({ movimiento, tipoInicial = 'gasto', onListo }) {
  const { refrescar, avisar } = useApp();
  const { datos: categorias } = useApi('/categorias');
  const editando = Boolean(movimiento);

  const [tipo, setTipo] = useState(movimiento?.tipo ?? tipoInicial);
  const [monto, setMonto] = useState(montoATexto(movimiento?.monto));
  const [moneda, setMoneda] = useState(movimiento?.moneda ?? 'ARS');
  const [categoriaId, setCategoriaId] = useState(movimiento?.categoria.id ?? ultimaCategoria(tipoInicial));
  const [descripcion, setDescripcion] = useState(movimiento?.descripcion ?? '');
  const [fecha, setFecha] = useState(movimiento?.fecha ?? hoy());
  // Compra en cuotas: null = un solo pago; si no, cantidad de cuotas y mes de la primera
  const [cuotas, setCuotas] = useState(null);
  const [primeraCuota, setPrimeraCuota] = useState(sumarMeses(mesActual(), 1));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const delTipo = (categorias ?? []).filter((c) => c.tipo === tipo);
  // Una categoría archivada no se ofrece para cargar, pero sí se muestra si el movimiento ya la tiene
  if (categorias && editando && !delTipo.some((c) => c.id === movimiento.categoria.id)) delTipo.push(movimiento.categoria);
  const categoriaValida = delTipo.some((c) => c.id === categoriaId) ? categoriaId : null;
  const palabra = tipo === 'gasto' ? 'gasto' : 'ingreso';
  const enCuotas = cuotas !== null && tipo === 'gasto' && !editando;

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    setCategoriaId(ultimaCategoria(nuevo));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const valor = parsearMonto(monto);
    if (!valor) return setError('Ingresá un monto mayor a cero');
    if (!categoriaValida) return setError('Elegí una categoría');
    if (enCuotas && !(Number(cuotas) >= 2 && Number(cuotas) <= 72)) return setError('Las cuotas van de 2 a 72');
    setGuardando(true);
    setError(null);
    if (enCuotas) return guardarEnCuotas(valor);
    const cuerpo = { monto: valor, moneda, categoria_id: categoriaValida, descripcion: descripcion.trim() || null, fecha };
    try {
      if (editando) {
        await api(`/movimientos/${movimiento.id}`, { method: 'PATCH', body: cuerpo });
      } else {
        await api('/movimientos', { method: 'POST', body: { ...cuerpo, tipo } });
        recordarCategoria(tipo, categoriaValida);
      }
      refrescar();
      avisar(editando ? 'Cambios guardados' : `${palabra[0].toUpperCase()}${palabra.slice(1)} guardado`);
      onListo();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  /** Una compra en cuotas es un pago mensual que termina solo: aparece cada mes para marcarlo. */
  const guardarEnCuotas = async (valor) => {
    const nombre = descripcion.trim() || delTipo.find((c) => c.id === categoriaValida).nombre;
    try {
      await api('/programados', {
        method: 'POST',
        body: {
          nombre, tipo, monto: valor, moneda, categoria_id: categoriaValida, frecuencia: 'mensual',
          dia: Number(fecha.slice(8)), desde: primeraCuota, cuotas: Number(cuotas),
        },
      });
      recordarCategoria(tipo, categoriaValida);
      refrescar();
      avisar(`${nombre}: ${cuotas} cuotas programadas`);
      onListo();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const borrar = async () => {
    try {
      await api(`/movimientos/${movimiento.id}`, { method: 'DELETE' });
      refrescar();
      avisar(movimiento.programado_id ? 'Pago borrado: vuelve a figurar como pendiente' : 'Movimiento borrado');
      onListo();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      {!editando && (
        <div className="segmentado" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={tipo === 'gasto'} onClick={() => cambiarTipo('gasto')}>
            Gasto
          </button>
          <button type="button" aria-pressed={tipo === 'ingreso'} onClick={() => cambiarTipo('ingreso')}>
            Ingreso
          </button>
        </div>
      )}

      <CampoMonto
        id="monto"
        etiqueta={enCuotas ? 'Monto de cada cuota' : undefined}
        valor={monto}
        onCambio={setMonto}
        moneda={moneda}
        onMoneda={setMoneda}
        autoFocus={!editando}
      />

      {tipo === 'gasto' && !editando && (
        <fieldset className="campo">
          <legend>Cómo se paga</legend>
          <div className="fila-fecha">
            <button type="button" className="chip" aria-pressed={!enCuotas} onClick={() => setCuotas(null)}>
              En un pago
            </button>
            <button type="button" className="chip" aria-pressed={enCuotas} onClick={() => setCuotas(cuotas ?? 6)}>
              En cuotas
            </button>
            {enCuotas && (
              <input
                type="number"
                inputMode="numeric"
                aria-label="Cantidad de cuotas"
                className="campo-cuotas"
                min={2}
                max={72}
                value={cuotas}
                onChange={(e) => setCuotas(e.target.value)}
              />
            )}
          </div>
        </fieldset>
      )}

      <fieldset className="campo">
        <legend>Categoría</legend>
        {categorias ? <ChipsCategorias categorias={delTipo} seleccionada={categoriaValida} onElegir={setCategoriaId} /> : <p className="tenue">Cargando…</p>}
      </fieldset>

      <label className="campo">
        <span>Detalle (opcional)</span>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={120} placeholder={tipo === 'gasto' ? 'Ej.: verdulería' : 'Ej.: sueldo de octubre'} />
      </label>

      {enCuotas && (
        <label className="campo">
          <span>Primera cuota</span>
          <select value={primeraCuota} onChange={(e) => setPrimeraCuota(e.target.value)}>
            {[mesDe(fecha), sumarMeses(mesDe(fecha), 1)].map((m) => (
              <option key={m} value={m}>
                En {nombreMesSolo(m)}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="campo">
        <legend>{enCuotas ? 'Fecha de compra' : 'Fecha'}</legend>
        <div className="fila-fecha">
          <button type="button" className="chip" aria-pressed={fecha === hoy()} onClick={() => setFecha(hoy())}>
            Hoy
          </button>
          <button type="button" className="chip" aria-pressed={fecha === ayer()} onClick={() => setFecha(ayer())}>
            Ayer
          </button>
          <input type="date" aria-label="Otra fecha" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} required />
        </div>
      </fieldset>

      {enCuotas && parsearMonto(monto) > 0 && Number(cuotas) >= 2 && (
        <p className="tenue">
          {cuotas} cuotas de {dinero(parsearMonto(monto), moneda)}: {dinero(parsearMonto(monto) * Number(cuotas), moneda)} en total. Vencen el día de la compra de cada mes y aparecen en Pagos y
          cobros para marcarla cuando se paga.
        </p>
      )}

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
        <button type="submit" className="boton boton--principal" disabled={guardando}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : enCuotas ? 'Programar cuotas' : `Guardar ${palabra}`}
        </button>
      </div>
    </form>
  );
}
