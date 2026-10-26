import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { ayer, hoy } from '../lib/fechas';
import { montoATexto, parsearMonto } from '../lib/formato';
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
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const delTipo = (categorias ?? []).filter((c) => c.tipo === tipo);
  // Una categoría archivada no se ofrece para cargar, pero sí se muestra si el movimiento ya la tiene
  if (categorias && editando && !delTipo.some((c) => c.id === movimiento.categoria.id)) delTipo.push(movimiento.categoria);
  const categoriaValida = delTipo.some((c) => c.id === categoriaId) ? categoriaId : null;
  const palabra = tipo === 'gasto' ? 'gasto' : 'ingreso';

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    setCategoriaId(ultimaCategoria(nuevo));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const valor = parsearMonto(monto);
    if (!valor) return setError('Ingresá un monto mayor a cero');
    if (!categoriaValida) return setError('Elegí una categoría');
    setGuardando(true);
    setError(null);
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

      <CampoMonto id="monto" valor={monto} onCambio={setMonto} moneda={moneda} onMoneda={setMoneda} autoFocus={!editando} />

      <fieldset className="campo">
        <legend>Categoría</legend>
        {categorias ? <ChipsCategorias categorias={delTipo} seleccionada={categoriaValida} onElegir={setCategoriaId} /> : <p className="tenue">Cargando…</p>}
      </fieldset>

      <label className="campo">
        <span>Detalle (opcional)</span>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={120} placeholder={tipo === 'gasto' ? 'Ej.: verdulería' : 'Ej.: sueldo de octubre'} />
      </label>

      <fieldset className="campo">
        <legend>Fecha</legend>
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
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : `Guardar ${palabra}`}
        </button>
      </div>
    </form>
  );
}
