import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { api } from '../lib/api';
import { diaCorto, hoy, mesDe } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';
import CampoMonto from './CampoMonto';
import { IconoCategoria } from './Icono';

/** Marca un vencimiento como pagado (o cobrado), con el monto real. */
export default function FormPago({ vencimiento, onListo }) {
  const { refrescar, avisar } = useApp();
  const [monto, setMonto] = useState(montoATexto(vencimiento.monto));
  const [fecha, setFecha] = useState(hoy());
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const esIngreso = vencimiento.tipo === 'ingreso';

  const guardar = async (e) => {
    e.preventDefault();
    const valor = parsearMonto(monto);
    if (!valor) return setError('Ingresá un monto mayor a cero');
    setGuardando(true);
    try {
      await api(`/programados/${vencimiento.programado_id}/pagar`, {
        method: 'POST',
        body: { mes: mesDe(vencimiento.fecha), monto: valor, fecha },
      });
      refrescar();
      avisar(esIngreso ? `${vencimiento.nombre}: cobrado` : `${vencimiento.nombre}: pagado`);
      onListo();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      <p className="tenue con-icono">
        <IconoCategoria icono={vencimiento.categoria.icono} color={vencimiento.categoria.color} tamano="chico" />
        {vencimiento.categoria.nombre} · vence el {diaCorto(vencimiento.fecha)} · estimado{' '}
        {dinero(vencimiento.monto, vencimiento.moneda)}
      </p>
      <CampoMonto id="monto-pago" etiqueta={esIngreso ? 'Monto cobrado' : 'Monto pagado'} valor={monto} onCambio={setMonto} moneda={vencimiento.moneda} autoFocus />
      <label className="campo">
        <span>{esIngreso ? 'Fecha de cobro' : 'Fecha de pago'}</span>
        <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} required />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        <button type="submit" className="boton boton--principal" disabled={guardando}>
          {guardando ? 'Guardando…' : esIngreso ? 'Registrar cobro' : 'Registrar pago'}
        </button>
      </div>
    </form>
  );
}
