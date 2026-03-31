import React from 'react';
import '../styles/objective-detail.css';

/**
 * Componente unificado de historial.
 *
 * Props:
 *   title        – string (default "Historial de Movimientos")
 *   items        – array de datos crudos
 *   renderItem   – (item, index) => { key, tipo, content }
 *                    tipo: 'aporte' | 'retiro' | 'gasto'  (controla el color del borde izquierdo)
 *                    content: JSX del interior del row
 *   emptyMessage – string mostrado cuando items está vacío
 *   hasMore      – boolean
 *   onLoadMore   – callback
 */
const HistorialMovimientos = ({
  title = 'Historial de Movimientos',
  items = [],
  renderItem,
  emptyMessage = 'No hay registros todavía.',
  hasMore = false,
  onLoadMore,
  style = {},
}) => (
  <section className="progress-section movements-history" style={{ marginTop: '2.5rem', paddingBottom: '3rem', ...style }}>
    <div className="progress-section-header">
      <h4>{title}</h4>
    </div>

    {items.length === 0 ? (
      <p style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>
    ) : (
      <>
        <div className="movements-list">
          {items.map((item, i) => {
            const { key, tipo, content } = renderItem(item, i);
            return (
              <div key={key ?? i} className={`movement-item type-${tipo}`}>
                {content}
              </div>
            );
          })}
        </div>
        {hasMore && (
          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={onLoadMore}
          >
            Ver más
          </button>
        )}
      </>
    )}
  </section>
);

export default HistorialMovimientos;
