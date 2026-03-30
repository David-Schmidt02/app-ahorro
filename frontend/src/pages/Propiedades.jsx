import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { DeleteOutline, Edit, OpenInNew, DragIndicator, Star, StarOutline, Close, LocationOn, AddHome } from '@mui/icons-material';
import api from '../api/axios';
import Modal from '../components/Modal';
import SectionContainer from '../components/SectionContainer';
import PropiedadDetailModal from '../components/PropiedadDetailModal';
import ActionButton from '../components/ActionButton';
import PageHeader from '../components/PageHeader';
import { useIsMobile } from '../hooks/useIsMobile';
import '../styles/propiedades.css';
import '../styles/dashboard.css';

// Componente SortableItem para el Top 10
function SortableItem({ id, propiedad, onRemoveFromTop, onEdit, onViewDetail }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const monedaDisplay = propiedad.precio && propiedad.moneda
    ? `${propiedad.precio} ${propiedad.moneda}`
    : '-';

  return (
    <div ref={setNodeRef} style={style} className="top-item glass-panel" onClick={() => onViewDetail(propiedad)}>
      <div className="top-item-handle" {...attributes} {...listeners}>
        <DragIndicator />
      </div>
      <div className="top-item-info">
        <div className="top-item-rank">#{propiedad.posicion_top}</div>
        <div className="top-item-content">
          <a href={propiedad.url} target="_blank" rel="noopener noreferrer" className="top-item-url">
            {propiedad.url.substring(0, 50)}...
          </a>
          <p className="top-item-precio">{monedaDisplay}</p>
          {propiedad.direccion && <p className="top-item-direccion">{propiedad.direccion}</p>}
        </div>
      </div>
      <button
        className="btn-danger"
        onClick={(e) => {
          e.stopPropagation();
          onRemoveFromTop(propiedad.id);
        }}
        title="Remover del Top"
      >
        <Close fontSize="small" />
      </button>
    </div>
  );
}

// Componente PropiedadCard para el listado general
function PropiedadCard({ propiedad, onEdit, onDelete, onToggleTop, onViewDetail }) {
  const estadoClases = {
    favorita: 'favorita',
    vista: 'vista',
    rechazada: 'rechazada',
  };

  const monedaDisplay = propiedad.precio && propiedad.moneda
    ? `${propiedad.precio} ${propiedad.moneda}`
    : '-';

  const mapsUrl = propiedad.direccion
    ? `https://maps.google.com/?q=${encodeURIComponent(propiedad.direccion)}`
    : null;

  return (
    <div className="propiedad-card glass-panel" onClick={() => onViewDetail(propiedad)}>
      <div className="card-header">
        <span className={`estado-badge ${estadoClases[propiedad.estado]}`}>
          {propiedad.estado}
        </span>
        <div className="header-actions" onClick={(e) => e.stopPropagation()}>
          {propiedad.en_top && (
            <span className="top-badge active">
              #{propiedad.posicion_top}
            </span>
          )}
          <button
            className="btn-star"
            onClick={() => onToggleTop(propiedad.id)}
            title={propiedad.en_top ? 'Remover del Top' : 'Agregar al Top'}
          >
            {propiedad.en_top ? <Star fontSize="small" /> : <StarOutline fontSize="small" />}
          </button>
        </div>
      </div>

      <div className="card-body">
        <a href={propiedad.url} target="_blank" rel="noopener noreferrer" className="card-url">
          <OpenInNew fontSize="small" />
          {propiedad.url.substring(0, 45)}...
        </a>

        <div className="card-price">{monedaDisplay}</div>

        {propiedad.direccion && (
          <div className="card-direccion">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-button" title="Ver en Google Maps">
                <LocationOn fontSize="small" />
              </a>
            )}
            <span>{propiedad.direccion}</span>
          </div>
        )}

        <div className="card-specs">
          {propiedad.metros_cuadrados && <span>{propiedad.metros_cuadrados} m²</span>}
          {propiedad.cuartos !== null && <span>{propiedad.cuartos} cuartos</span>}
          {propiedad.banios !== null && <span>{propiedad.banios} baño{propiedad.banios !== 1 ? 's' : ''}</span>}
        </div>

        {(propiedad.inmobiliaria || propiedad.contacto) && (
          <div className="card-contact">
            {propiedad.inmobiliaria && <span>{propiedad.inmobiliaria}</span>}
            {propiedad.contacto && <span className="contact-num">{propiedad.contacto}</span>}
          </div>
        )}

        {propiedad.notas && <p className="card-notes">{propiedad.notas}</p>}
      </div>

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-sm btn-secondary"
          onClick={() => onEdit(propiedad)}
          title="Editar"
        >
          <Edit fontSize="small" />
        </button>
        <button
          className="btn-sm btn-danger"
          onClick={() => onDelete(propiedad.id)}
          title="Eliminar"
        >
          <DeleteOutline fontSize="small" />
        </button>
      </div>
    </div>
  );
}

// Componente principal Propiedades
export default function Propiedades() {
  const isMobile = useIsMobile();
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPropiedad, setEditingPropiedad] = useState(null);
  const [selectedPropiedad, setSelectedPropiedad] = useState(null);
  const [formData, setFormData] = useState({
    url: '',
    estado: '',
    precio: '',
    moneda: 'USD',
    expensas: '',
    moneda_expensas: 'ARS',
    direccion: '',
    inmobiliaria: '',
    contacto: '',
    metros_cuadrados: '',
    cuartos: '',
    banios: '',
    notas: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { distance: 8 }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleNewPropiedad = useCallback(() => {
    setEditingPropiedad(null);
    setFormData({
      url: '',
      estado: '',
      precio: '',
      moneda: 'USD',
      expensas: '',
      moneda_expensas: 'ARS',
      direccion: '',
      inmobiliaria: '',
      contacto: '',
      metros_cuadrados: '',
      cuartos: '',
      banios: '',
      notas: '',
    });
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      if (isMounted) {
        await fetchPropiedades();
      }
    };

    initData();

    window.addEventListener('fab:click:/propiedades', handleNewPropiedad);
    return () => {
      isMounted = false;
      window.removeEventListener('fab:click:/propiedades', handleNewPropiedad);
    };
  }, [handleNewPropiedad]);

  const fetchPropiedades = async () => {
    try {
      setLoading(true);
      const response = await api.get('/propiedades/');
      // Ordenar: en_top primero, luego por posicion_top
      const sorted = response.data.sort((a, b) => {
        if (a.en_top && !b.en_top) return -1;
        if (!a.en_top && b.en_top) return 1;
        if (a.en_top && b.en_top) return (a.posicion_top || 999) - (b.posicion_top || 999);
        return new Date(b.creado_en) - new Date(a.creado_en);
      });
      setPropiedades(sorted);
    } catch (error) {
      console.error('Error fetching propiedades:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar las propiedades',
        icon: 'error',
        background: 'var(--bg-surface)',
        customClass: { popup: 'glass-modal' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const cleanFormData = () => {
    const cleaned = { ...formData };
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === '') cleaned[key] = null;
    });
    // Convertir campos numéricos
    if (cleaned.precio !== null) cleaned.precio = parseFloat(cleaned.precio);
    if (cleaned.expensas !== null) cleaned.expensas = parseFloat(cleaned.expensas);
    if (cleaned.metros_cuadrados !== null) cleaned.metros_cuadrados = parseFloat(cleaned.metros_cuadrados);
    if (cleaned.cuartos !== null) cleaned.cuartos = parseInt(cleaned.cuartos);
    if (cleaned.banios !== null) cleaned.banios = parseInt(cleaned.banios);
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.url.trim()) {
      Swal.fire({
        title: 'Error',
        text: 'La URL es obligatoria',
        icon: 'error',
        background: 'var(--bg-surface)',
        customClass: { popup: 'glass-modal' },
      });
      return;
    }

    try {
      const cleanedData = cleanFormData();
      if (editingPropiedad) {
        await api.put(`/propiedades/${editingPropiedad.id}`, cleanedData);
        Swal.fire({
          title: 'Éxito',
          text: 'Propiedad actualizada',
          icon: 'success',
          background: 'var(--bg-surface)',
          customClass: { popup: 'glass-modal' },
        });
      } else {
        await api.post('/propiedades/', cleanedData);
        Swal.fire({
          title: 'Éxito',
          text: 'Propiedad creada',
          icon: 'success',
          background: 'var(--bg-surface)',
          customClass: { popup: 'glass-modal' },
        });
      }
      setIsModalOpen(false);
      fetchPropiedades();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.detail || 'Error al guardar',
        icon: 'error',
        background: 'var(--bg-surface)',
        customClass: { popup: 'glass-modal' },
      });
    }
  };

  const onEdit = (propiedad) => {
    setEditingPropiedad(propiedad);
    setFormData({
      url: propiedad.url || '',
      estado: propiedad.estado || 'vista',
      precio: propiedad.precio ? String(propiedad.precio) : '',
      moneda: propiedad.moneda || 'USD',
      expensas: propiedad.expensas ? String(propiedad.expensas) : '',
      moneda_expensas: propiedad.moneda_expensas || 'ARS',
      direccion: propiedad.direccion || '',
      inmobiliaria: propiedad.inmobiliaria || '',
      contacto: propiedad.contacto || '',
      metros_cuadrados: propiedad.metros_cuadrados ? String(propiedad.metros_cuadrados) : '',
      cuartos: propiedad.cuartos !== null ? String(propiedad.cuartos) : '',
      banios: propiedad.banios !== null ? String(propiedad.banios) : '',
      notas: propiedad.notas || '',
    });
    setIsModalOpen(true);
  };

  const onDelete = async (propiedadId) => {
    const result = await Swal.fire({
      title: '¿Eliminar propiedad?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-surface)',
      customClass: { popup: 'glass-modal' },
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/propiedades/${propiedadId}`);
        Swal.fire({
          title: 'Eliminada',
          text: 'Propiedad eliminada correctamente',
          icon: 'success',
          background: 'var(--bg-surface)',
          customClass: { popup: 'glass-modal' },
        });
        fetchPropiedades();
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar',
          icon: 'error',
          background: 'var(--bg-surface)',
          customClass: { popup: 'glass-modal' },
        });
      }
    }
  };

  const onToggleTop = async (propiedadId) => {
    try {
      await api.put(`/propiedades/${propiedadId}/top`);
      fetchPropiedades();
    } catch (error) {
      console.error('Error:', error);
      const msg = error.response?.data?.detail || 'Error al actualizar';
      Swal.fire({
        title: 'Error',
        text: msg,
        icon: 'error',
        background: 'var(--bg-surface)',
        customClass: { popup: 'glass-modal' },
      });
    }
  };

  const onRemoveFromTop = async (propiedadId) => {
    try {
      await api.put(`/propiedades/${propiedadId}/top`);
      fetchPropiedades();
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo remover del top',
        icon: 'error',
        background: 'var(--bg-surface)',
        customClass: { popup: 'glass-modal' },
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const topPropiedades = propiedades.filter((p) => p.en_top);
      const oldIndex = topPropiedades.findIndex((p) => p.id === active.id);
      const newIndex = topPropiedades.findIndex((p) => p.id === over.id);

      const newOrder = arrayMove(topPropiedades, oldIndex, newIndex);
      const newIds = newOrder.map((p) => p.id);

      try {
        await api.put('/propiedades/top/reordenar', { ids: newIds });
        fetchPropiedades();
      } catch (error) {
        console.error('Error reordenando:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo reordenar el top',
          icon: 'error',
          background: 'var(--bg-surface)',
          customClass: { popup: 'glass-modal' },
        });
      }
    }
  };

  // Filtrado
  const topPropiedades = propiedades.filter((p) => p.en_top);

  // Columna izquierda: mostrar según filtro
  // - Si filtro "todos": mostrar TODAS las propiedades
  // - Si filtro por estado: mostrar TODAS las de ese estado
  const filteredPropiedades =
    filtro === 'todos'
      ? propiedades
      : propiedades.filter((p) => p.estado === filtro);

  if (loading) {
    return <div className="propiedades-page loading">Cargando...</div>;
  }

  return (
    <div className="page-container propiedades-page-container">
      <PageHeader
        title="Alquiler"
        action={!isMobile ? (
          <ActionButton
            label="Nueva Propiedad"
            Icon={AddHome}
            onClick={handleNewPropiedad}
          />
        ) : null}
      />

      <div className="propiedades-layout">
        {/* Columna Izquierda - Todas las propiedades */}
        <SectionContainer className="all-propiedades-section">
          {/* Filtros */}
          <div className="filter-buttons">
            {['todos', 'favorita', 'rechazada'].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filtro === f ? 'active' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid de propiedades */}
          {filteredPropiedades.length > 0 ? (
            <div className="propiedades-grid">
              {filteredPropiedades.map((prop) => (
                <PropiedadCard
                  key={prop.id}
                  propiedad={prop}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleTop={onToggleTop}
                  onViewDetail={setSelectedPropiedad}
                />
              ))}
            </div>
          ) : (
            <p className="empty-message">No hay propiedades en este filtro</p>
          )}
        </SectionContainer>

        {/* Columna Derecha - Top Section */}
        {propiedades.filter((p) => p.en_top).length > 0 && (
          <SectionContainer className="top-section">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={topPropiedades.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="top-list">
                  {topPropiedades.map((prop) => (
                    <SortableItem
                      key={prop.id}
                      id={prop.id}
                      propiedad={prop}
                      onRemoveFromTop={onRemoveFromTop}
                      onEdit={onEdit}
                      onViewDetail={setSelectedPropiedad}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </SectionContainer>
        )}
      </div>

      {/* Modal para crear/editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPropiedad ? 'Editar Propiedad' : 'Nueva Propiedad'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit" form="propiedad-form">
              {editingPropiedad ? 'Actualizar' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="propiedad-form" onSubmit={handleSubmit} className="propiedad-form">
          <div className="form-group">
            <label>URL del anuncio *</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              placeholder="https://ejemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <div className="estado-buttons">
              <button
                key="sin-estado"
                type="button"
                className={`estado-btn ${formData.estado === '' ? 'active' : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, estado: '' }))}
                title="Sin clasificar"
              >
                Sin estado
              </button>
              {['favorita', 'rechazada'].map((estado) => (
                <button
                  key={estado}
                  type="button"
                  className={`estado-btn ${formData.estado === estado ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, estado }))}
                >
                  {estado.charAt(0).toUpperCase() + estado.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio</label>
              <input
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleInputChange}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Moneda</label>
              <select
                name="moneda"
                value={formData.moneda}
                onChange={handleInputChange}
                className="glass-select"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expensas</label>
              <input
                type="number"
                name="expensas"
                value={formData.expensas}
                onChange={handleInputChange}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Moneda</label>
              <select
                name="moneda_expensas"
                value={formData.moneda_expensas}
                onChange={handleInputChange}
                className="glass-select"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Calle y altura"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Inmobiliaria/Dueño</label>
              <input
                type="text"
                name="inmobiliaria"
                value={formData.inmobiliaria}
                onChange={handleInputChange}
                placeholder="Nombre"
              />
            </div>
            <div className="form-group">
              <label>Contacto</label>
              <input
                type="tel"
                name="contacto"
                value={formData.contacto}
                onChange={handleInputChange}
                placeholder="Teléfono o email"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>m²</label>
              <input
                type="number"
                name="metros_cuadrados"
                value={formData.metros_cuadrados}
                onChange={handleInputChange}
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Cuartos</label>
              <input
                type="number"
                name="cuartos"
                value={formData.cuartos}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Baños</label>
              <input
                type="number"
                name="banios"
                value={formData.banios}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleInputChange}
              placeholder="Observaciones personales..."
              rows="3"
            />
          </div>
        </form>
      </Modal>

      {/* Modal de detalle de propiedad */}
      <PropiedadDetailModal
        isOpen={selectedPropiedad !== null}
        onClose={() => setSelectedPropiedad(null)}
        propiedad={selectedPropiedad}
      />
    </div>
  );
}
