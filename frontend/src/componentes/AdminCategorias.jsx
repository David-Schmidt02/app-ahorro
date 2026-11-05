import { useEffect, useRef, useState } from 'react';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { nombreMesSolo } from '../lib/fechas';
import { dinero, montoATexto, parsearMonto } from '../lib/formato';
import { GRUPOS_ICONOS, ICONO_CATEGORIA_POR_DEFECTO, ICONOS_CATEGORIA } from '../lib/iconos';
import CampoMonto from './CampoMonto';
import Estado from './Estado';
import Hoja from './Hoja';
import Icono, { IconoCategoria } from './Icono';

const tope = (c) => (c.cupo_semanal != null ? `${dinero(c.cupo_semanal)} por semana` : c.presupuesto ? dinero(c.presupuesto) : null);

/** Íconos por tema; al editar, arranca mostrando el elegido. */
function SelectorIconos({ icono, color, onElegir }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('[aria-checked="true"]')?.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <div className="selector-iconos-grupos" ref={ref}>
      {GRUPOS_ICONOS.map((grupo) => (
        <div key={grupo.nombre} role="radiogroup" aria-label={grupo.nombre}>
          <p className="selector-iconos__grupo" aria-hidden="true">
            {grupo.nombre}
          </p>
          <div className="selector-iconos">
            {Object.entries(grupo.iconos).map(([clave, Componente]) => (
              <button
                key={clave}
                type="button"
                role="radio"
                aria-checked={icono === clave}
                aria-label={clave}
                className="selector-iconos__opcion"
                style={{ '--color': color }}
                onClick={() => onElegir(clave)}
              >
                <Componente size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const COLORES = ['#1BAF7A', '#2A78D6', '#EDA100', '#6250D6', '#E34948', '#EB6834', '#E87BA4', '#008300', '#B0478A', '#7A7F8A'];

function FormCategoria({ categoria, tipoInicial, onListo }) {
  const { refrescar, avisar } = useApp();
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [icono, setIcono] = useState(categoria?.icono in ICONOS_CATEGORIA ? categoria.icono : ICONO_CATEGORIA_POR_DEFECTO);
  const [color, setColor] = useState(categoria?.color ?? COLORES[0]);
  const [periodo, setPeriodo] = useState(categoria?.cupo_semanal != null ? 'semana' : 'mes');
  const [presupuesto, setPresupuesto] = useState(montoATexto(categoria?.cupo_semanal ?? categoria?.presupuesto));
  const [error, setError] = useState(null);
  const tipo = categoria?.tipo ?? tipoInicial;

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
    if (!nombre.trim()) return setError('Poné un nombre');
    const valor = presupuesto.trim() ? parsearMonto(presupuesto) : null;
    if (presupuesto.trim() && !valor) return setError(`El ${periodo === 'semana' ? 'cupo' : 'presupuesto'} tiene que ser un monto válido`);
    const esGasto = tipo === 'gasto';
    const cuerpo = {
      nombre: nombre.trim(),
      icono,
      color,
      presupuesto: esGasto && periodo === 'mes' ? valor : null,
      cupo_semanal: esGasto && periodo === 'semana' ? valor : null,
    };
    if (categoria) return enviar('PATCH', `/categorias/${categoria.id}`, cuerpo, 'Categoría guardada');
    return enviar('POST', '/categorias', { ...cuerpo, tipo }, 'Categoría creada');
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      <div className="vista-previa-categoria">
        <IconoCategoria icono={icono} color={color} />
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} autoFocus={!categoria} />
        </label>
      </div>
      <fieldset className="campo">
        <legend>Ícono</legend>
        <SelectorIconos icono={icono} color={color} onElegir={setIcono} />
      </fieldset>
      <fieldset className="campo">
        <legend>Color</legend>
        <div className="colores" role="radiogroup">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              className="color"
              style={{ '--color': c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </fieldset>
      {tipo === 'gasto' && (
        <fieldset className="campo">
          <legend>Tope de gasto (opcional)</legend>
          <div className="segmentado segmentado--chico segmentado--ancho" role="group" aria-label="Período del tope">
            <button type="button" aria-pressed={periodo === 'mes'} onClick={() => setPeriodo('mes')}>
              Presupuesto por mes
            </button>
            <button type="button" aria-pressed={periodo === 'semana'} onClick={() => setPeriodo('semana')}>
              Cupo por semana
            </button>
          </div>
          <CampoMonto
            id="presupuesto"
            etiqueta={periodo === 'semana' ? 'Cupo semanal' : 'Presupuesto mensual'}
            valor={presupuesto}
            onCambio={setPresupuesto}
            moneda="ARS"
          />
          {periodo === 'semana' && (
            <p className="tenue">Si se pasan, se descuenta de la semana siguiente. Lo que sobra va al ahorro.</p>
          )}
        </fieldset>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        {categoria && (
          <>
            <button
              type="button"
              className="boton boton--peligro"
              onClick={() => enviar('DELETE', `/categorias/${categoria.id}`, undefined, 'Categoría borrada')}
            >
              <Icono nombre="borrar" tamano={18} /> Borrar
            </button>
            <button
              type="button"
              className="boton"
              onClick={() =>
                enviar(
                  'PATCH',
                  `/categorias/${categoria.id}`,
                  { activa: !categoria.activa },
                  categoria.activa ? 'Categoría archivada' : 'Categoría restaurada',
                )
              }
            >
              <Icono nombre={categoria.activa ? 'archivar' : 'restaurar'} tamano={18} />
              {categoria.activa ? 'Archivar' : 'Restaurar'}
            </button>
          </>
        )}
        <button type="submit" className="boton boton--principal">
          {categoria ? 'Guardar' : 'Crear categoría'}
        </button>
      </div>
      {categoria && <p className="tenue">Si ya tiene movimientos no se puede borrar: archivala y deja de ofrecerse al cargar.</p>}
    </form>
  );
}

function Grupo({ titulo, tipo, categorias, gastadoPorId, mes, onEditar, onNueva }) {
  return (
    <section className="tarjeta tarjeta--llena">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">{titulo}</h2>
        <button type="button" className="boton boton--chico" onClick={() => onNueva(tipo)}>
          <Icono nombre="mas" tamano={16} grosor={2.4} /> Nueva
        </button>
      </header>
      <ul className="renglones desplazable">
        <li className="renglon renglon--categoria renglon--encabezado" aria-hidden="true">
          <span />
          <span>Categoría</span>
          <span>{tipo === 'gasto' ? `En ${nombreMesSolo(mes)}` : ''}</span>
          <span>{tipo === 'gasto' ? 'Tope' : ''}</span>
          <span />
        </li>
        {categorias.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`renglon renglon--boton renglon--tabla renglon--categoria${c.activa ? '' : ' es-archivada'}`}
              onClick={() => onEditar(c)}
            >
              <IconoCategoria icono={c.icono} color={c.color} />
              <span className="renglon__texto">
                <span className="renglon__titulo">{c.nombre}</span>
                {!c.activa && <span className="renglon__detalle">Archivada</span>}
                {c.activa && tope(c) ? (
                  <span className="renglon__detalle renglon__detalle--compacto">
                    {c.cupo_semanal != null ? 'Cupo' : 'Presupuesto'} {tope(c)}
                  </span>
                ) : null}
              </span>
              <span className="renglon__columna renglon__columna--numero">{tipo === 'gasto' ? dinero(gastadoPorId.get(c.id) ?? 0) : ''}</span>
              <span className="renglon__columna renglon__columna--numero">{tope(c) ?? '—'}</span>
              <Icono nombre="editar" tamano={18} className="renglon__accion" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Alta, edición, archivo y borrado de categorías de gastos e ingresos. */
export default function AdminCategorias() {
  const { mes } = useApp();
  const { datos: categorias, error, reintentar } = useApi('/categorias?incluir_archivadas=true');
  const { datos: resumen } = useApi(`/resumen?mes=${mes}`);
  const [hoja, setHoja] = useState(null);
  const gastadoPorId = new Map((resumen?.categorias ?? []).map((c) => [c.categoria.id, c.gastado]));
  const comunes = { gastadoPorId, mes, onEditar: (c) => setHoja({ id: c.id, categoria: c }), onNueva: (tipo) => setHoja({ id: Date.now(), tipo }) };

  return (
    <Estado datos={categorias} error={error} reintentar={reintentar}>
      {categorias && (
        <div className="dos-columnas dos-columnas--parejas pantalla">
          <div className="pila">
            <Grupo titulo="Categorías de gastos" tipo="gasto" categorias={categorias.filter((c) => c.tipo === 'gasto')} {...comunes} />
          </div>
          <div className="pila">
            <Grupo titulo="Categorías de ingresos" tipo="ingreso" categorias={categorias.filter((c) => c.tipo === 'ingreso')} {...comunes} />
          </div>
        </div>
      )}
      <Hoja titulo={hoja?.categoria ? hoja.categoria.nombre : 'Nueva categoría'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormCategoria key={hoja.id} categoria={hoja.categoria} tipoInicial={hoja.tipo} onListo={() => setHoja(null)} />}
      </Hoja>
    </Estado>
  );
}
