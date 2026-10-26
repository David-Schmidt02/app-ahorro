export default function ChipsCategorias({ categorias, seleccionada, onElegir }) {
  return (
    <div className="chips" role="radiogroup" aria-label="Categoría">
      {categorias.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={seleccionada === c.id}
          className="chip"
          style={{ '--chip': c.color }}
          onClick={() => onElegir(c.id)}
        >
          <span aria-hidden="true">{c.icono}</span>
          {c.nombre}
        </button>
      ))}
    </div>
  );
}
