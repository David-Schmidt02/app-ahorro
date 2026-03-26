import React from 'react';
import { Edit, DeleteOutline } from '@mui/icons-material';

/**
 * Componente unificado de historial de movimientos.
 * Usado en ObjectiveDetail (y reutilizable en otros contextos similares).
 */
const HistorialMovimientos = ({
  movimientos = [],
  convert,
  displayMoneda,
  dolarRate,
  onEdit,
  onDelete,
  hasMore,
  onLoadMore,
}) => (
  <section className="progress-section movements-history" style={{ marginTop: '2.5rem', paddingBottom: '3rem' }}>
    <div className="progress-section-header">
      <h4>Historial de Movimientos</h4>
    </div>

    {movimientos.length === 0 ? (
      <p style={{ color: 'var(--text-muted)' }}>No hay movimientos para este objetivo todavía.</p>
    ) : (
      <>
        <div className="movements-list">
          {movimientos.map(mov => (
            <div key={mov.id} className={`movement-item type-${mov.tipo}`}>
              <div className="movement-item-info">
                <span className="movement-item-reason">{mov.motivo}</span>
                <span className="movement-item-date">{new Date(mov.fecha).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="movement-item-amount" style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0 }}>
                    {mov.tipo === 'aporte' ? '+' : '-'}$
                    {convert(Number(mov.monto), mov.moneda).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {' '}{displayMoneda}
                  </p>
                  {dolarRate && (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ≈ {displayMoneda === 'USD' ? 'ARS' : 'USD'} $
                      {(displayMoneda === 'USD'
                        ? convert(Number(mov.monto), mov.moneda) * dolarRate
                        : convert(Number(mov.monto), mov.moneda) / dolarRate
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div className="movement-actions" style={{ display: 'flex', gap: '0.25rem' }}>
                  {onEdit && (
                    <button className="btn-icon-small" onClick={() => onEdit(mov)} title="Editar">
                      <Edit style={{ fontSize: '1rem' }} />
                    </button>
                  )}
                  <button className="btn-icon-small btn-danger-text" onClick={() => onDelete(mov.id)} title="Eliminar">
                    <DeleteOutline style={{ fontSize: '1rem' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {hasMore && (
          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={onLoadMore}
          >
            Ver más movimientos
          </button>
        )}
      </>
    )}
  </section>
);

export default HistorialMovimientos;
