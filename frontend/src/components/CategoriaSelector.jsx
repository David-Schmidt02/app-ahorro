/**
 * Selector de categorías con scroll vertical
 * Muestra 3 filas visibles y es scrolleable verticalmente
 */
export default function CategoriaSelector({ categorias, selectedId, onSelect, categoryMap }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        overflowY: 'auto',
        maxHeight: 'calc(3 * 2.75rem + 1rem)',
        paddingRight: '0.5rem',
        scrollBehavior: 'smooth',
      }}
      className="categorias-scroll"
    >
      {categorias.map(c => {
        const isActive = selectedId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              padding: '0.75rem 0.75rem',
              border: `1.5px solid ${isActive ? c.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 'var(--radius-sm)',
              background: isActive ? `${c.color}15` : 'rgba(0,0,0,0.2)',
              cursor: 'pointer',
              color: isActive ? c.color : 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
            title={c.label}
          >
            <c.Icon fontSize="small" />
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
