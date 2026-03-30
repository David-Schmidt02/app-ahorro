import { Close, LocationOn, OpenInNew } from '@mui/icons-material';
import Modal from './Modal';
import '../styles/propiedad-detail-modal.css';

export default function PropiedadDetailModal({ isOpen, onClose, propiedad }) {
  if (!propiedad) return null;

  const mapsUrl = propiedad.direccion
    ? `https://maps.google.com/?q=${encodeURIComponent(propiedad.direccion)}`
    : null;

  const estadoClases = {
    favorita: 'favorita',
    vista: 'vista',
    rechazada: 'rechazada',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles de Propiedad"
      footer={null}
    >
      <div className="propiedad-detail-content">
        {/* Header con estado */}
        <div className="detail-header">
          <span className={`estado-badge ${estadoClases[propiedad.estado]}`}>
            {propiedad.estado}
          </span>
          {propiedad.en_top && (
            <span className="top-position-badge">
              #{propiedad.posicion_top} del Top
            </span>
          )}
        </div>

        {/* URL */}
        <div className="detail-section full-width">
          <a
            href={propiedad.url}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-url"
          >
            <OpenInNew fontSize="small" />
            Ver anuncio
          </a>
        </div>

        <div className="detail-divider" />

        {/* Precios: 2 columnas */}
        <div className="detail-grid-2">
          {propiedad.precio && (
            <div className="detail-section">
              <div className="detail-label">Alquiler</div>
              <div className="detail-value">
                {propiedad.precio} {propiedad.moneda}
              </div>
            </div>
          )}

          {propiedad.expensas && (
            <div className="detail-section">
              <div className="detail-label">Expensas</div>
              <div className="detail-value">
                {propiedad.expensas} {propiedad.moneda_expensas}
              </div>
            </div>
          )}
        </div>

        <div className="detail-divider" />

        {/* Especificaciones */}
        {(propiedad.metros_cuadrados || propiedad.cuartos !== null || propiedad.banios !== null) && (
          <>
            <div className="detail-section full-width">
              <div className="detail-label">Especificaciones</div>
              <div className="detail-specs">
                {propiedad.metros_cuadrados && <span>{propiedad.metros_cuadrados} m²</span>}
                {propiedad.cuartos !== null && <span>{propiedad.cuartos} cuartos</span>}
                {propiedad.banios !== null && <span>{propiedad.banios} baño{propiedad.banios !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="detail-divider" />
          </>
        )}

        {/* Dirección */}
        {propiedad.direccion && (
          <>
            <div className="detail-section full-width">
              <div className="detail-label">Dirección</div>
              <div className="detail-direction">
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
                    <LocationOn fontSize="small" />
                  </a>
                )}
                <span>{propiedad.direccion}</span>
              </div>
            </div>
            <div className="detail-divider" />
          </>
        )}

        {/* Inmobiliaria y Contacto: 2 columnas */}
        <div className="detail-grid-2">
          {propiedad.inmobiliaria && (
            <div className="detail-section">
              <div className="detail-label">Inmobiliaria/Dueño</div>
              <div className="detail-value">{propiedad.inmobiliaria}</div>
            </div>
          )}

          {propiedad.contacto && (
            <div className="detail-section">
              <div className="detail-label">Contacto</div>
              <div className="detail-value">{propiedad.contacto}</div>
            </div>
          )}
        </div>

        {propiedad.notas && <div className="detail-divider" />}

        {/* Notas - Full width */}
        {propiedad.notas && (
          <div className="detail-section full-width">
            <div className="detail-label">Notas</div>
            <div className="detail-notes">{propiedad.notas}</div>
          </div>
        )}

        {/* Metadata */}
        <div className="detail-metadata">
          <small>Agregado el {new Date(propiedad.creado_en).toLocaleDateString('es-AR')}</small>
        </div>
      </div>
    </Modal>
  );
}
