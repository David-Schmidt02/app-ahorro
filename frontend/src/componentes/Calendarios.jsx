import { useState } from 'react';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import Icono from './Icono';

/** El enlace .ics de la app, para suscribirse desde el calendario del teléfono. */
export function Suscripcion() {
  const { avisar } = useApp();
  const { datos } = useApi('/calendario/suscripcion');
  const [mostrarEnlace, setMostrarEnlace] = useState(false);
  if (!datos) return null;

  const enlace = `${window.location.origin}${datos.ruta}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      avisar('Enlace copiado');
    } catch {
      setMostrarEnlace(true);
    }
  };

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Vencimientos en el teléfono</h2>
      <p className="tenue">
        Los pagos y cobros programados y los eventos de la app aparecen en el calendario del teléfono, con un aviso el día anterior a las 9 para
        los pagos. Se actualiza solo cada algunas horas.
      </p>
      <div className="acciones acciones--inicio">
        <a className="boton boton--chico" href={enlace.replace(/^https?:/, 'webcal:')}>
          <Icono nombre="suscribir" tamano={18} /> Suscribirme
        </a>
        <button type="button" className="boton boton--chico" onClick={copiar}>
          <Icono nombre="copiar" tamano={18} /> Copiar enlace
        </button>
      </div>
      {mostrarEnlace && <input className="enlace-visible" readOnly value={enlace} aria-label="Enlace del calendario" onFocus={(e) => e.target.select()} />}
      <p className="tenue">
        En iPhone, «Suscribirme» lo agrega directo. En Google Calendar, desde la compu: Otros calendarios → + → Desde URL, y pegá el enlace.
        Quien tenga el enlace ve los vencimientos: no lo compartas.
      </p>
    </section>
  );
}

/** Calendarios de afuera (Google, iCloud…) cuyos eventos se ven en el Calendario de la app. */
export function Externos() {
  const { refrescar, avisar } = useApp();
  const { datos: calendarios } = useApi('/calendarios-externos');
  const [nombre, setNombre] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('Poné un nombre, por ejemplo «Google de Ana»');
    setGuardando(true);
    setError(null);
    try {
      await api('/calendarios-externos', { method: 'POST', body: { nombre: nombre.trim(), url: url.trim() } });
      setNombre('');
      setUrl('');
      refrescar();
      avisar(`${nombre.trim()} agregado al Calendario`);
    } catch (err) {
      setError(err.message);
    }
    setGuardando(false);
  };

  const quitar = async (calendario) => {
    try {
      await api(`/calendarios-externos/${calendario.id}`, { method: 'DELETE' });
      refrescar();
      avisar(`${calendario.nombre} quitado`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="tarjeta formulario" onSubmit={agregar}>
      <h2 className="tarjeta__titulo">Eventos de otro calendario</h2>
      <p className="tenue">
        Para ver en el Calendario de la app los cumpleaños y eventos que tienen anotados en Google Calendar. En Google, desde la compu:
        Configuración → tu calendario → Integrar el calendario → «Dirección secreta en formato iCal».
      </p>
      {calendarios?.length > 0 && (
        <ul className="renglones">
          {calendarios.map((c) => (
            <li key={c.id} className="renglon">
              <span className="icono-categoria" aria-hidden="true">
                <Icono nombre="externo" tamano={18} />
              </span>
              <span className="renglon__texto">
                <span className="renglon__titulo">{c.nombre}</span>
                <span className="renglon__detalle">{c.origen}</span>
              </span>
              <button type="button" className="boton-icono" onClick={() => quitar(c)} aria-label={`Quitar ${c.nombre}`}>
                <Icono nombre="borrar" tamano={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="campo">
        <span>Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej.: Google de Ana" />
      </label>
      <label className="campo">
        <span>Dirección iCal</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          inputMode="url"
          required
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        <button type="submit" className="boton boton--principal" disabled={guardando}>
          {guardando ? 'Leyendo el calendario…' : 'Agregar calendario'}
        </button>
      </div>
    </form>
  );
}
