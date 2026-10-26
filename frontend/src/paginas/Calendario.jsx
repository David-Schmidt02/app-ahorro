import { useState } from 'react';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono, { IconoEvento } from '../componentes/Icono';
import SelectorMes from '../componentes/SelectorMes';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { DIAS_CORTOS, aISO, deISO, diaCorto, diaLargo, diasDelMes, hoy, mesDe, primerDiaSemana } from '../lib/fechas';
import { dinero } from '../lib/formato';
import { TIPOS_EVENTO } from '../lib/iconos';

function FormEvento({ evento, fechaInicial, onListo }) {
  const { refrescar, avisar } = useApp();
  const [titulo, setTitulo] = useState(evento?.titulo ?? '');
  const [tipo, setTipo] = useState(evento?.tipo ?? 'recordatorio');
  const [fecha, setFecha] = useState(evento?.fecha ?? fechaInicial);
  const [hora, setHora] = useState(evento?.hora ?? '');
  const [anual, setAnual] = useState(evento?.anual ?? false);
  const [error, setError] = useState(null);

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
    if (!titulo.trim()) return setError('Poné un título');
    const cuerpo = { titulo: titulo.trim(), tipo, fecha, hora: hora || null, anual };
    if (evento) return enviar('PUT', `/eventos/${evento.id}`, cuerpo, 'Evento guardado');
    return enviar('POST', '/eventos', cuerpo, 'Evento agregado');
  };

  const elegirTipo = (valor) => {
    setTipo(valor);
    if (valor === 'cumpleanos' || valor === 'aniversario') setAnual(true);
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      <label className="campo">
        <span>Título</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={80}
          placeholder="Ej.: Cumple de mamá"
          autoFocus={!evento}
        />
      </label>
      <fieldset className="campo">
        <legend>Tipo</legend>
        <div className="chips" role="radiogroup">
          {TIPOS_EVENTO.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="radio"
              aria-checked={tipo === t.valor}
              className="chip"
              onClick={() => elegirTipo(t.valor)}
            >
              <t.icono size={16} strokeWidth={2} aria-hidden="true" />
              {t.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="campos-en-fila">
        <label className="campo">
          <span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Hora (opcional)</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
      </div>
      <label className="interruptor">
        <input type="checkbox" checked={anual} onChange={(e) => setAnual(e.target.checked)} />
        <span>Se repite todos los años</span>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        {evento && (
          <button
            type="button"
            className="boton boton--peligro"
            onClick={() => enviar('DELETE', `/eventos/${evento.id}`, undefined, 'Evento borrado')}
          >
            <Icono nombre="borrar" tamano={18} /> Borrar
          </button>
        )}
        <button type="submit" className="boton boton--principal">
          {evento ? 'Guardar cambios' : 'Agregar evento'}
        </button>
      </div>
    </form>
  );
}

function Grilla({ mes, porDia, seleccionado, onElegir }) {
  const hoyIso = hoy();
  const huecos = primerDiaSemana(mes);
  const dias = Array.from({ length: diasDelMes(mes) }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);

  return (
    <div className="grilla" role="grid" aria-label="Días del mes">
      {DIAS_CORTOS.map((d, i) => (
        <span key={i} className="grilla__semana" aria-hidden="true">
          {d}
        </span>
      ))}
      {Array.from({ length: huecos }, (_, i) => (
        <span key={`hueco-${i}`} />
      ))}
      {dias.map((iso) => {
        const { vencimientos = [], eventos = [] } = porDia.get(iso) ?? {};
        const marcas = [
          ...vencimientos.map((v) => ({
            estado: v.pagado ? 'hecho' : v.tipo === 'ingreso' ? 'cobro' : iso < hoyIso ? 'vencido' : 'pago',
            texto: v.nombre,
          })),
          ...eventos.map((e) => ({ estado: 'evento', texto: e.titulo })),
        ];
        return (
          <button
            key={iso}
            type="button"
            className={`grilla__dia${iso === hoyIso ? ' es-hoy' : ''}`}
            aria-pressed={iso === seleccionado}
            aria-label={`${diaLargo(iso)}${marcas.length ? `, ${marcas.length} anotaciones` : ''}`}
            onClick={() => onElegir(iso)}
          >
            <span>{Number(iso.slice(8))}</span>
            <span className="grilla__marcas" aria-hidden="true">
              {marcas.slice(0, 4).map((m, i) => (
                <i key={i} className={`punto punto--${m.estado}`} />
              ))}
            </span>
            {/* En pantallas anchas se ven los nombres en lugar de los puntos */}
            <span className="grilla__etiquetas" aria-hidden="true">
              {marcas.slice(0, 3).map((m, i) => (
                <span key={i} className={`etiqueta etiqueta--${m.estado}`}>
                  {m.texto}
                </span>
              ))}
              {marcas.length > 3 && <span className="etiqueta-mas">+{marcas.length - 3} más</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Vencimientos y eventos como renglones; con `conFecha` agrega la fecha (para rangos de varios días). */
function Anotaciones({ vencimientos, eventos, conFecha = false, onEvento }) {
  const { abrirPago } = useApp();
  const fecha = (iso) => conFecha && <span className="renglon__columna renglon__columna--fecha">{diaCorto(iso)}</span>;
  return (
    <ul className="renglones">
      {vencimientos.map((v) => (
        <li key={`v-${v.programado_id}-${v.fecha}`} className="renglon">
          {v.pagado ? (
            <span className="marca-pago es-hecha" aria-hidden="true">
              <Icono nombre="check" tamano={16} grosor={2.6} />
            </span>
          ) : (
            <button
              type="button"
              className={`marca-pago${v.tipo === 'ingreso' ? ' es-ingreso' : ''}`}
              onClick={() => abrirPago(v)}
              aria-label={`Registrar ${v.tipo === 'ingreso' ? 'cobro' : 'pago'} de ${v.nombre}`}
            />
          )}
          <span className="renglon__texto">
            <span className="renglon__titulo">{v.nombre}</span>
            <span className="renglon__detalle">
              {[conFecha && diaLargo(v.fecha), v.pagado ? 'Registrado' : v.tipo === 'ingreso' ? 'A cobrar' : 'A pagar'].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className={`importe${v.tipo === 'ingreso' ? ' es-ingreso' : ''}`}>{dinero(v.monto, v.moneda)}</span>
        </li>
      ))}
      {eventos.map((e) => (
        <li key={`e-${e.id}-${e.dia}`}>
          <button type="button" className="renglon renglon--boton" onClick={() => onEvento(e)}>
            <IconoEvento tipo={e.tipo} />
            <span className="renglon__texto">
              <span className="renglon__titulo">{e.titulo}</span>
              <span className="renglon__detalle">
                {[conFecha && diaLargo(e.dia), e.hora, e.anual && 'todos los años'].filter(Boolean).join(' · ') || 'Evento'}
              </span>
            </span>
            {fecha(e.dia)}
          </button>
        </li>
      ))}
    </ul>
  );
}

const manana = () => {
  const fecha = deISO(hoy());
  fecha.setDate(fecha.getDate() + 1);
  return aISO(fecha);
};

/** Lo que viene en la semana, aunque cruce de mes. */
function Proximos({ onEvento }) {
  const { datos } = useApi(`/proximos?desde=${manana()}&dias=7`);
  if (!datos) return null;
  const vacio = !datos.vencimientos.length && !datos.eventos.length;
  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Próximos 7 días</h2>
      {vacio ? (
        <p className="tenue">Nada para pagar ni eventos hasta el {diaCorto(datos.hasta)}.</p>
      ) : (
        <Anotaciones vencimientos={datos.vencimientos} eventos={datos.eventos} conFecha onEvento={onEvento} />
      )}
    </section>
  );
}

export default function Calendario() {
  const { mes } = useApp();
  const { datos, error, reintentar } = useApi(`/calendario?mes=${mes}`);
  const [elegido, setElegido] = useState(hoy());
  const [hoja, setHoja] = useState(null);
  const seleccionado = mesDe(elegido) === mes ? elegido : `${mes}-01`;

  const porDia = new Map();
  for (const v of datos?.vencimientos ?? []) {
    if (!porDia.has(v.fecha)) porDia.set(v.fecha, { vencimientos: [], eventos: [] });
    porDia.get(v.fecha).vencimientos.push(v);
  }
  for (const e of datos?.eventos ?? []) {
    if (!porDia.has(e.dia)) porDia.set(e.dia, { vencimientos: [], eventos: [] });
    porDia.get(e.dia).eventos.push(e);
  }
  const delDia = porDia.get(seleccionado) ?? { vencimientos: [], eventos: [] };
  const vacio = !delDia.vencimientos.length && !delDia.eventos.length;
  const editarEvento = (e) => setHoja({ id: e.id, evento: e });

  return (
    <>
      <header className="cabecera">
        <SelectorMes />
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        <div className="dos-columnas">
          <div className="pila">
            <Grilla mes={mes} porDia={porDia} seleccionado={seleccionado} onElegir={setElegido} />
            <ul className="referencias" aria-label="Referencias">
              <li>
                <i className="punto punto--pago" /> A pagar
              </li>
              <li>
                <i className="punto punto--vencido" /> Vencido
              </li>
              <li>
                <i className="punto punto--cobro" /> A cobrar
              </li>
              <li>
                <i className="punto punto--hecho" /> Registrado
              </li>
              <li>
                <i className="punto punto--evento" /> Evento
              </li>
            </ul>
          </div>
          <div className="pila lateral-fijo">
            <section className="tarjeta">
              <header className="tarjeta__cabecera">
                <h2 className="tarjeta__titulo">{diaLargo(seleccionado)}</h2>
                <button type="button" className="boton boton--chico" onClick={() => setHoja({ id: Date.now() })}>
                  <Icono nombre="mas" tamano={16} grosor={2.4} /> Evento
                </button>
              </header>
              {vacio ? (
                <p className="tenue">Nada anotado para este día.</p>
              ) : (
                <Anotaciones vencimientos={delDia.vencimientos} eventos={delDia.eventos} onEvento={editarEvento} />
              )}
            </section>
            <Proximos onEvento={editarEvento} />
          </div>
        </div>
      </Estado>
      <Hoja titulo={hoja?.evento ? 'Editar evento' : 'Nuevo evento'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormEvento key={hoja.id} evento={hoja.evento} fechaInicial={seleccionado} onListo={() => setHoja(null)} />}
      </Hoja>
    </>
  );
}
