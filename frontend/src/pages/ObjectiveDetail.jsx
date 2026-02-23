import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, CheckCircleOutline, PauseCircleOutline, PlayCircleOutline, DeleteOutline, Edit, Add, Remove } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import '../styles/objective-detail.css';
import { formatAmount, cleanAmount } from '../utils/formatters';

const ObjectiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [objective, setObjective] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Agregar Movimiento State
  const [moveType, setMoveType] = useState('aporte');
  const [montoMove, setMontoMove] = useState('');
  const [monedaMove, setMonedaMove] = useState('ARS');
  const [motivoMove, setMotivoMove] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dolarRate, setDolarRate] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    descripcion: '',
    monto_objetivo: '',
    moneda: 'ARS',
    fecha_limite: '',
    es_prioritario: false
  });

  // Fetch Data
  const fetchObjectiveData = async () => {
    try {
      const [objRes, movsRes] = await Promise.all([
        api.get(`/objetivos/${id}`),
        api.get(`/movimientos/?objetivo_id=${id}`)
      ]);
      setObjective(objRes.data);
      setMovimientos(movsRes.data);
    } catch (err) {
      console.error("Error fetching objective data:", err);
      setError("No se pudo cargar la información del objetivo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectiveData();
    const fetchDolar = async () => {
      try {
        const res = await api.get('https://dolarapi.com/v1/dolares/blue');
        setDolarRate(res.data.venta);
      } catch (e) {
        console.error("Error fetching dolar rate for conversion");
      }
    };
    fetchDolar();
  }, [id]);

  const handleAddMovement = async (e) => {
    e.preventDefault();
    if (!montoMove) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/movimientos/', {
        objetivo_id: parseInt(id),
        monto: parseFloat(cleanAmount(montoMove)),
        moneda: monedaMove,
        tipo: moveType,
        motivo: motivoMove || (moveType === 'aporte' ? 'Aporte manual' : 'Retiro manual')
      });
      
      setMontoMove('');
      setMotivoMove('');
      await fetchObjectiveData();
    } catch (err) {
      console.error("Error al registrar movimiento:", err);
      alert("No se pudo registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => {
    setEditFormData({
      nombre: objective.nombre,
      descripcion: objective.descripcion || '',
      monto_objetivo: objective.monto_objetivo,
      moneda: objective.moneda || 'ARS',
      fecha_limite: objective.fecha_limite ? new Date(objective.fecha_limite).toISOString().split('T')[0] : '',
      es_prioritario: objective.es_prioritario
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editFormData,
        monto_objetivo: parseFloat(cleanAmount(editFormData.monto_objetivo))
      };
      await api.put(`/objetivos/${id}`, payload);
      setIsEditModalOpen(false);
      await fetchObjectiveData();
    } catch (err) {
      console.error("Error al actualizar objetivo:", err);
      alert("No se pudo actualizar el objetivo.");
    }
  };

  const handleDeleteObjective = async () => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará el objetivo y todos sus movimientos permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      customClass: {
        popup: 'glass-modal',
        confirmButton: 'btn-danger',
        cancelButton: 'btn-secondary'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/objetivos/${id}`);
          navigate('/');
        } catch (err) {
          console.error("Error al eliminar objetivo:", err);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el objetivo.',
            icon: 'error',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            customClass: {
              popup: 'glass-modal',
              confirmButton: 'btn-primary'
            }
          });
        }
      }
    });
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'completado') {
      const result = await Swal.fire({
        title: '¿Confirmar cumplimiento?',
        text: "¡Felicidades por alcanzar tu meta! Una vez completado, el objetivo quedará archivado.",
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Sí, completar',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        customClass: {
          popup: 'glass-modal',
          confirmButton: 'btn-success',
          cancelButton: 'btn-secondary'
        }
      });
      
      if (!result.isConfirmed) return;
    }

    try {
      await api.put(`/objetivos/${id}/estado?estado=${newStatus}`);
      await fetchObjectiveData();
    } catch (err) {
      console.error("Error cambiando estado:", err);
      alert("No se pudo cambiar el estado del objetivo.");
    }
  };

  if (loading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '5rem' }}><div className="glass-panel" style={{display: 'inline-block', padding: '2rem'}}>Cargando detalles...</div></div>;
  if (error) return (
    <div className="page-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
      <div className="glass-panel" style={{display: 'inline-block', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)', padding: '2rem'}}>
        <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{error}</p>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
          <ArrowBack fontSize="small" /> Volver
        </button>
      </div>
    </div>
  );
  if (!objective) return <div className="page-container"><div className="glass-panel" style={{borderColor: 'var(--accent-warning)', color: 'var(--accent-warning)', padding: '2rem'}}>Objetivo no encontrado</div></div>;

  const mntActual = Number(objective.monto_objetivo || 0) * (Number(objective.porcentaje_completado || 0) / 100);
  const mntRestante = Number(objective.monto_objetivo || 0) - mntActual;
  const isActivo = objective.estado === 'activo';

  // Prepare Chart Data (Cumulative Sum of Aportes - Retiros)
  const chartData = [];
  let currentSum = 0;
  
  // Sort movements by date ascending for the chart
  const sortedMovs = [...movimientos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  chartData.push({
    name: 'Inicio',
    Acumulado: 0
  });

  sortedMovs.forEach(mov => {
    if (mov.tipo === 'aporte') currentSum += Number(mov.monto);
    if (mov.tipo === 'retiro') currentSum -= Number(mov.monto);
    chartData.push({
      name: new Date(mov.fecha).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      Acumulado: currentSum
    });
  });

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button className="btn-volver" onClick={() => navigate(-1)}>
            <ArrowBack fontSize="small" /> Volver
          </button>
          <div>
            <h1 style={{ margin: 0 }}>{objective.nombre} <span style={{fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>({objective.moneda})</span></h1>
          </div>
        </div>
        <div className="status-badge" style={{ 
            textTransform: 'capitalize', 
            fontSize: '1rem', 
            padding: '0.5rem 1rem', 
            background: isActivo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(225, 29, 72, 0.15)', 
            color: isActivo ? 'var(--accent-success)' : 'var(--accent-danger)', 
            borderRadius: 'var(--radius-full)' 
          }}>
          Estado: {objective.estado}
        </div>
      </header>
      
      <div className="objective-detail-layout">
        <div className="detail-main-panel">
          
          <div className="detail-info-grid">
             <div className="detail-info-card">
               <h4 className="secondary-label">Fondo del Objetivo</h4>
               <div className="detail-metrics-group">
                 <div className="detail-metric-item">
                   <h4 className="secondary-label">ACUMULADO</h4>
                   <p style={{ color: 'var(--accent-success)' }}>${mntActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 </div>
                 <div className="detail-metric-item" style={{ textAlign: 'right' }}>
                   <h4 className="secondary-label">RESTANTE</h4>
                   <p>${Math.max(0, mntRestante).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 </div>
               </div>
             </div>
             <div className="detail-info-card">
               <h4 className="secondary-label">Meta y Prioridad</h4>
               <div className="detail-metrics-group">
                 <div className="detail-metric-item">
                   <h4 className="secondary-label">TOTAL</h4>
                   <p>${Number(objective.monto_objetivo || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 </div>
                 <div className="detail-metric-item" style={{ textAlign: 'right' }}>
                   <h4 className="secondary-label">PRIORIDAD</h4>
                   <p style={{ color: objective.es_prioritario ? 'var(--accent-warning)' : 'inherit' }}>{objective.es_prioritario ? 'Alta' : 'Normal'}</p>
                 </div>
               </div>
             </div>
          </div>

          <div className="progress-section">
            <div className="progress-section-header">
              <h4>Evolución del Ahorro</h4>
              <span>{Number(objective.porcentaje_completado || 0).toFixed(1)}%</span>
            </div>
            
            <div style={{ width: '100%', height: 250, marginTop: '1rem', marginBottom: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--accent-primary)' }}
                    formatter={(value) => [`$${value}`, 'Acumulado']}
                  />
                  <ReferenceLine y={Number(objective.monto_objetivo)} label={{ position: 'top', value: 'Meta', fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--accent-warning)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="Acumulado" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="progress-bar-bg" style={{ height: '8px' }}>
                <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(Number(objective.porcentaje_completado || 0), 100)}%` }}
                ></div>
            </div>
            {objective.fecha_limite && (
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Vencimiento estimado: {new Date(objective.fecha_limite).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="progress-section">
             <div className="progress-section-header">
               <h4>Historial de Movimientos</h4>
             </div>
             
             {movimientos.length === 0 ? (
               <p style={{ color: 'var(--text-muted)' }}>No hay movimientos para este objetivo todavía.</p>
             ) : (
               <div className="movements-list">
                 {movimientos.map(mov => (
                   <div key={mov.id} className={`movement-item type-${mov.tipo}`}>
                      <div className="movement-item-info">
                         <span className="movement-item-reason">{mov.motivo}</span>
                         <span className="movement-item-date">{new Date(mov.fecha).toLocaleString()}</span>
                      </div>
                       <div className="movement-item-amount" style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0 }}>
                            {mov.tipo === 'aporte' ? '+' : '-'}${Number(mov.monto).toLocaleString(undefined, { minimumFractionDigits: 2 })} {mov.moneda}
                          </p>
                          {dolarRate && (
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                               ≈ USD ${(mov.moneda === 'USD' ? Number(mov.monto) : Number(mov.monto) / dolarRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                       </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

        </div>

        <div className="detail-side-panel">
          <div className="glass-panel" style={{ padding: '1rem' }}>
             <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Registrar Movimiento</h3>
             
             <div className="movement-tabs">
                <button 
                  className={`movement-tab ${moveType === 'aporte' ? 'active' : ''}`}
                  onClick={() => setMoveType('aporte')}
                  type="button"
                >Aporte</button>
                <button 
                  className={`movement-tab ${moveType === 'retiro' ? 'active' : ''}`}
                  onClick={() => setMoveType('retiro')}
                  type="button"
                >Retiro</button>
             </div>

             <form onSubmit={handleAddMovement}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem' }}>
                   <div className="form-group" title="Solo se permiten valores numéricos con punto decimal">
                     <label>Monto</label>
                     <div className="amount-input-wrapper">
                       <span className="amount-input-prefix">$</span>
                       <input 
                         type="text" 
                         inputMode="numeric"
                         placeholder="0"
                         value={montoMove}
                         onChange={(e) => setMontoMove(formatAmount(e.target.value))}
                         required
                       />
                     </div>
                   </div>
                   <div className="form-group">
                     <label>Moneda</label>
                     <select 
                       value={monedaMove}
                       onChange={(e) => setMonedaMove(e.target.value)}
                       className="glass-select"
                     >
                       <option value="ARS">ARS</option>
                       <option value="USD">USD</option>
                     </select>
                   </div>
                </div>

                <div className="form-group">
                  <label>Motivo</label>
                  <input 
                    type="text" 
                    placeholder={moveType === 'aporte' ? "Ej: Ahorro quincena" : "Ej: Compra de pasaje"}
                    value={motivoMove}
                    onChange={(e) => setMotivoMove(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className={`btn-primary ${moveType === 'retiro' ? 'btn-danger' : ''}`} 
                  style={{ width: '100%', marginTop: '1rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Registrando...' : (
                    <>
                      {moveType === 'aporte' ? <Add fontSize="small" /> : <Remove fontSize="small" />}
                      {moveType === 'aporte' ? 'Sumar Aporte' : 'Registrar Retiro'}
                    </>
                  )}
                </button>
             </form>
          </div>

          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem' }}>Acciones</h3>
             <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={openEditModal}>
                <Edit fontSize="small" /> Modificar Objetivo
             </button>
             {objective.estado !== 'completado' && (
                <button type="button" className="btn-success" style={{ width: '100%' }} onClick={() => handleStatusChange('completado')}>
                   <CheckCircleOutline fontSize="small" /> Marcar como Completado
                </button>
             )}
             {isActivo && (
                <button type="button" className="btn-warning" style={{ width: '100%' }} onClick={() => handleStatusChange('pausado')}>
                   <PauseCircleOutline fontSize="small" /> Pausar Objetivo
                </button>
             )}
             {objective.estado === 'pausado' && (
                <button type="button" className="btn-success" style={{ width: '100%' }} onClick={() => handleStatusChange('activo')}>
                   <PlayCircleOutline fontSize="small" /> Reanudar Objetivo
                </button>
             )}
             <button type="button" className="btn-danger" style={{ width: '100%' }} onClick={handleDeleteObjective}>
                <DeleteOutline fontSize="small" /> Eliminar Objetivo
             </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modificar Objetivo"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="edit-objective-form" className="btn-primary">
              Guardar Cambios
            </button>
          </>
        }
      >
        <form id="edit-objective-form" onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label>Nombre del Objetivo</label>
            <input
              type="text"
              value={editFormData.nombre}
              onChange={(e) => setEditFormData({...editFormData, nombre: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              rows="2"
              value={editFormData.descripcion}
              onChange={(e) => setEditFormData({...editFormData, descripcion: e.target.value})}
            ></textarea>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem' }}>
            <div className="form-group">
              <label>Monto Meta</label>
              <div className="amount-input-wrapper">
                <span className="amount-input-prefix">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={editFormData.monto_objetivo}
                  onChange={(e) => setEditFormData({...editFormData, monto_objetivo: formatAmount(e.target.value)})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Moneda</label>
              <select
                value={editFormData.moneda}
                onChange={(e) => setEditFormData({...editFormData, moneda: e.target.value})}
                className="glass-select"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Fecha Límite</label>
            <input
              type="date"
              value={editFormData.fecha_limite}
              onChange={(e) => setEditFormData({...editFormData, fecha_limite: e.target.value})}
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-container">
              <input
                type="checkbox"
                id="es_prioritario"
                checked={editFormData.es_prioritario}
                onChange={(e) => setEditFormData({...editFormData, es_prioritario: e.target.checked})}
              />
              <span className="checkmark"></span>
              Marcar como prioritario
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ObjectiveDetail;
