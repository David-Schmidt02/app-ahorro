import { useEffect, useRef, useState } from 'react';
import { DIAS_CORTOS, ayer, diasDelMes, fechaLegible, hoy, mesDe, nombreMes, primerDiaSemana, sumarMeses } from '../lib/fechas';
import { moverEnGrilla } from '../lib/teclado';
import Desplegable from './Desplegable';
import Icono, { IconoCategoria } from './Icono';

/** Botones navegables con flechas (tabindex móvil); al abrir, el foco va al elegido. */
function useFocoMovil(total, inicial) {
  const [activo, setActivo] = useState(Math.max(inicial, 0));
  const botones = useRef([]);
  useEffect(() => botones.current[activo]?.focus(), [activo]);
  const alTeclear = (columnas) => (e) => {
    const nuevo = moverEnGrilla(e.key, activo, total, columnas);
    if (nuevo === null) return;
    e.preventDefault();
    setActivo(nuevo);
  };
  const propsDe = (i) => ({ ref: (el) => (botones.current[i] = el), tabIndex: i === activo ? 0 : -1 });
  return { alTeclear, propsDe };
}

function ListaCategorias({ categorias, valor, onElegir }) {
  const { alTeclear, propsDe } = useFocoMovil(categorias.length, categorias.findIndex((c) => c.id === valor));
  return (
    <div className="lista-opciones" role="listbox" aria-label="Categorías" onKeyDown={alTeclear(1)}>
      {categorias.map((c, i) => (
        <button key={c.id} type="button" role="option" aria-selected={c.id === valor} className="opcion" onClick={() => onElegir(c.id)} {...propsDe(i)}>
          <IconoCategoria icono={c.icono} color={c.color} tamano="chico" />
          <span>{c.nombre}</span>
          {c.id === valor && <Icono nombre="check" tamano={18} grosor={2.4} className="opcion__marca" />}
        </button>
      ))}
    </div>
  );
}

/** Desplegable de categorías con su ícono y color. */
export function SelectorCategoria({ categorias, valor, onCambio }) {
  const elegida = categorias.find((c) => c.id === valor);
  return (
    <Desplegable
      etiqueta="Categoría"
      icono={elegida ? <IconoCategoria icono={elegida.icono} color={elegida.color} tamano="chico" /> : null}
      resumen={elegida ? elegida.nombre : <span className="tenue">Elegí una categoría</span>}
    >
      {(cerrar) => (
        <ListaCategorias
          categorias={categorias}
          valor={valor}
          onElegir={(id) => {
            onCambio(id);
            cerrar();
          }}
        />
      )}
    </Desplegable>
  );
}

function Almanaque({ valor, onElegir, atajos }) {
  const [mes, setMes] = useState(mesDe(valor));
  const dias = Array.from({ length: diasDelMes(mes) }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
  const { alTeclear, propsDe } = useFocoMovil(dias.length, dias.indexOf(valor) >= 0 ? dias.indexOf(valor) : 0);
  const hoyIso = hoy();

  return (
    <div className="almanaque">
      {atajos && (
        <div className="almanaque__atajos">
          {[
            ['Hoy', hoyIso],
            ['Ayer', ayer()],
          ].map(([nombre, iso]) => (
            <button key={nombre} type="button" className="chip" aria-pressed={valor === iso} onClick={() => onElegir(iso)}>
              {nombre}
            </button>
          ))}
        </div>
      )}
      <div className="almanaque__cabecera">
        <button type="button" className="boton-icono" onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior">
          <Icono nombre="izquierda" />
        </button>
        <span className="almanaque__mes" aria-live="polite">
          {nombreMes(mes)}
        </span>
        <button type="button" className="boton-icono" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente">
          <Icono nombre="derecha" />
        </button>
      </div>
      {/* key: al cambiar de mes se rearma la grilla y el foco móvil vuelve a empezar */}
      <div key={mes} className="almanaque__grilla" role="grid" aria-label={nombreMes(mes)} onKeyDown={alTeclear(7)}>
        {DIAS_CORTOS.map((d, i) => (
          <span key={i} className="almanaque__semana" aria-hidden="true">
            {d}
          </span>
        ))}
        {Array.from({ length: primerDiaSemana(mes) }, (_, i) => (
          <span key={`hueco-${i}`} />
        ))}
        {dias.map((iso, i) => (
          <button
            key={iso}
            type="button"
            className={`almanaque__dia${iso === hoyIso ? ' es-hoy' : ''}`}
            aria-pressed={iso === valor}
            aria-label={fechaLegible(iso)}
            onClick={() => onElegir(iso)}
            {...propsDe(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Fecha con almanaque desplegable; `atajos` suma «Hoy» y «Ayer». */
export function SelectorFecha({ etiqueta = 'Fecha', valor, onCambio, atajos = false }) {
  return (
    <Desplegable etiqueta={etiqueta} icono={<Icono nombre="calendario" tamano={20} />} resumen={fechaLegible(valor)}>
      {(cerrar) => (
        <Almanaque
          valor={valor}
          atajos={atajos}
          onElegir={(iso) => {
            onCambio(iso);
            cerrar();
          }}
        />
      )}
    </Desplegable>
  );
}

function GrillaDias({ valor, onElegir }) {
  const { alTeclear, propsDe } = useFocoMovil(31, valor - 1);
  return (
    <>
      <div className="almanaque__grilla" role="grid" aria-label="Día del mes" onKeyDown={alTeclear(7)}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d, i) => (
          <button key={d} type="button" className="almanaque__dia" aria-pressed={d === valor} onClick={() => onElegir(d)} {...propsDe(i)}>
            {d}
          </button>
        ))}
      </div>
      <p className="tenue almanaque__nota">Si el mes no tiene ese día (29, 30 o 31), vence el último.</p>
    </>
  );
}

/** Día del mes (1 a 31) en que vence algo que se repite. */
export function SelectorDia({ etiqueta, valor, onCambio }) {
  return (
    <Desplegable etiqueta={etiqueta} icono={<Icono nombre="repetir" tamano={20} />} resumen={`El ${valor} de cada mes`}>
      {(cerrar) => (
        <GrillaDias
          valor={valor}
          onElegir={(d) => {
            onCambio(d);
            cerrar();
          }}
        />
      )}
    </Desplegable>
  );
}
