/** Muestra error con reintento, o un esqueleto mientras no hay datos; si no, el contenido. */
export default function Estado({ datos, error, reintentar, children }) {
  if (error && !datos) {
    return (
      <div className="tarjeta vacio" role="alert">
        <p>{error.message}</p>
        <button type="button" className="boton" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!datos) {
    return (
      <div className="esqueleto" aria-busy="true" aria-label="Cargando">
        <span />
        <span />
        <span />
      </div>
    );
  }
  return children;
}
