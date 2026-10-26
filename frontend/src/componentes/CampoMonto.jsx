/** Monto grande con selector de moneda al lado. */
export default function CampoMonto({ id, valor, onCambio, moneda, onMoneda, autoFocus = false, etiqueta = 'Monto' }) {
  return (
    <div className="campo-monto">
      <label htmlFor={id} className="campo-monto__etiqueta">
        {etiqueta}
      </label>
      <div className="campo-monto__fila">
        <span className="campo-monto__signo" aria-hidden="true">
          {moneda === 'USD' ? 'US$' : '$'}
        </span>
        <input
          id={id}
          className="campo-monto__input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          autoFocus={autoFocus}
        />
        {onMoneda && (
          <div className="segmentado segmentado--chico" role="group" aria-label="Moneda">
            {['ARS', 'USD'].map((m) => (
              <button key={m} type="button" aria-pressed={moneda === m} onClick={() => onMoneda(m)}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
