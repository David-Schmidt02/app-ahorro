import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, CheckCircleOutline, PauseCircleOutline, PlayCircleOutline, DeleteOutline, Edit, Add, Remove, InfoOutlined } from '@mui/icons-material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';
import TutorialOverlay from '../components/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import '../styles/objective-detail.css';
import { formatAmount, cleanAmount } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';

const DETAIL_TUTORIAL_STEPS = [
  {
    title: 'Los números importantes',
    description: 'Acá ves cuánto llevamos acumulado, cuánto falta y cuál es la meta total. Todo en la moneda que elijas arriba.',
    selector: '.detail-info-grid',
    position: 'bottom',
  },
  {
    title: 'Cómo va el ahorro',
    description: 'El gráfico muestra cómo fue creciendo el dinero guardado con el tiempo. Abajo tenemos unas fechas tentativas.',
    selector: '.chart-section',
    position: 'top',
  },
  {
    title: 'Sumar o retirar plata',
    description: 'Cada vez que guardamos algo o necesitamos retirar, lo registramos acá. Ponemos el monto, la moneda y opcionalmente el motivo.',
    selector: '.register-movement-panel',
    position: 'left',
  },
  {
    title: 'Acciones del objetivo',
    description: 'Desde acá podés modificar la meta, pausarla si la ponemos en espera, marcarla como cumplida cuando llegamos, o eliminarla.',
    selector: '.actions-panel',
    position: 'left',
  },
  {
    title: 'Historial de movimientos',
    description: 'Todos los aportes y retiros que hicimos en esta meta, ordenados por fecha. Podés editar o borrar cualquiera si te equivocaste.',
    selector: '.movements-history',
    position: 'top',
  },
];

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
  const { dolarRate } = useCurrency();
  const [viewMoneda, setViewMoneda] = useState(null); // Se setea al cargar el objetivo
  
  // Pagination & Projection State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [projection, setProjection] = useState(null);
  const LIMIT = 10;

  const detailSteps = useMemo(() => {
    const hasProjection = projection && projection.meses_estimados_restantes > 0;
    return hasProjection
      ? DETAIL_TUTORIAL_STEPS
      : DETAIL_TUTORIAL_STEPS.filter(s => s.selector !== '.projection-card');
  }, [projection]);

  const tutorial = useTutorial(detailSteps);

  // Movement Edit State
  const [isEditMoveModalOpen, setIsEditMoveModalOpen] = useState(false);
  const [editingMove, setEditingMove] = useState(null);
  const [editMoveForm, setEditMoveForm] = useState({ monto: '', motivo: '', fecha: '', tipo: '' });

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
  const fetchObjectiveData = async (loadMore = false) => {
    try {
      const currentPage = loadMore ? page + 1 : 1;
      const [objRes, movsRes, projRes] = await Promise.all([
        api.get(`/objetivos/${id}`),
        api.get(`/movimientos/?objetivo_id=${id}&limite=${LIMIT}&offset=${(currentPage - 1) * LIMIT}`),
        api.get(`/objetivos/${id}/proyeccion`).catch(() => ({ data: null }))
      ]);
      
      setObjective(objRes.data);
      if (!viewMoneda) setViewMoneda(objRes.data.moneda);
      setProjection(projRes.data);
      
      if (loadMore) {
        setMovimientos(prev => [...prev, ...movsRes.data]);
        setPage(currentPage);
      } else {
        setMovimientos(movsRes.data);
        setPage(1);
      }
      
      setHasMore(movsRes.data.length === LIMIT);
    } catch (err) {
      console.error("Error fetching objective data:", err);
      setError("No se pudo cargar la información del objetivo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectiveData();
    // Ya no hacemos fetch del dólar aquí, se asume cargado globalmente o en el Dashboard/Navbar
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
      monto_objetivo: formatAmount(objective.monto_objetivo),
      moneda: objective.moneda || 'ARS',
      fecha_limite: objective.fecha_limite ? new Date(objective.fecha_limite).toISOString().split('T')[0] : '',
      es_prioritario: objective.es_prioritario
    });
    setIsEditModalOpen(true);
  };

  const handleEditCurrencyChange = (newMoneda) => {
    if (!dolarRate || newMoneda === editFormData.moneda) {
      setEditFormData({ ...editFormData, moneda: newMoneda });
      return;
    }

    const currentMonto = parseFloat(cleanAmount(editFormData.monto_objetivo)) || 0;
    let newMonto = currentMonto;

    if (editFormData.moneda === 'ARS' && newMoneda === 'USD') {
      newMonto = currentMonto / dolarRate;
    } else if (editFormData.moneda === 'USD' && newMoneda === 'ARS') {
      newMonto = currentMonto * dolarRate;
    }

    setEditFormData({
      ...editFormData,
      moneda: newMoneda,
      monto_objetivo: formatAmount(newMonto.toFixed(2))
    });
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

  const handleEditMove = (mov) => {
    setEditingMove(mov);
    setEditMoveForm({
      monto: formatAmount(mov.monto.toString()),
      motivo: mov.motivo,
      fecha: new Date(mov.fecha).toISOString().split('T')[0],
      tipo: mov.tipo
    });
    setIsEditMoveModalOpen(true);
  };

  const handleUpdateMove = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/movimientos/${editingMove.id}`, {
        ...editMoveForm,
        monto: parseFloat(cleanAmount(editMoveForm.monto))
      });
      setIsEditMoveModalOpen(false);
      await fetchObjectiveData();
    } catch (err) {
      console.error("Error updating movement:", err);
      alert("No se pudo actualizar el movimiento");
    }
  };

  const handleDeleteMove = async (moveId) => {
    const result = await Swal.fire({
      title: '¿Eliminar movimiento?',
      text: "El monto se restará/sumará del acumulado automáticamente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      customClass: {
        popup: 'glass-modal',
        confirmButton: 'btn-danger',
        cancelButton: 'btn-secondary'
      }
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/movimientos/${moveId}`);
        await fetchObjectiveData();
      } catch (err) {
        console.error("Error deleting movement:", err);
      }
    }
  };

  if (loading) return <div className="page-container page-loader"><div className="spinner" /><span>Cargando detalles...</span></div>;
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

  const isActivo = objective.estado === 'activo';
  const mntActual = Number(objective.monto_actual || 0);
  const mntObjetivo = Number(objective.monto_objetivo || 0);
  const mntRestante = mntObjetivo - mntActual;

  // Utilidad para convertir montos según la moneda de visualización
  const convert = (amount, originalMoneda) => {
    if (!viewMoneda || !dolarRate || viewMoneda === originalMoneda) return amount;
    if (originalMoneda === 'ARS' && viewMoneda === 'USD') return amount / dolarRate;
    if (originalMoneda === 'USD' && viewMoneda === 'ARS') return amount * dolarRate;
    return amount;
  };

  const displayMoneda = viewMoneda || objective.moneda || 'ARS';

  const chartData = [{ name: 'Inicio', Acumulado: 0 }];

  if (objective.historial_progreso && objective.historial_progreso.length > 0) {
    const historialOrdenado = [...objective.historial_progreso].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    historialOrdenado.forEach(item => {
      chartData.push({
        name: new Date(item.fecha).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        Acumulado: Math.round(convert(Number(item.monto_acumulado), objective.moneda) * 100) / 100
      });
    });
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="tutorial-help-btn" onClick={tutorial.start}>
            <HelpOutlineIcon fontSize="small" /> Tutorial
          </button>
          <div className="status-badge" style={{ 
              textTransform: 'capitalize', 
              fontSize: '0.9rem', 
              padding: '0.4rem 0.8rem', 
              background: isActivo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(225, 29, 72, 0.15)', 
              color: isActivo ? 'var(--accent-success)' : 'var(--accent-danger)', 
              borderRadius: 'var(--radius-full)' 
            }}>
            {objective.estado}
          </div>
          
          <div className="dashboard-controls" style={{ display: 'flex', borderRadius: 'var(--radius-full)', padding: '2px', background: 'rgba(0,0,0,0.2)' }}>
             <button 
                onClick={() => setViewMoneda('ARS')}
                style={{ 
                  padding: '0.3rem 0.8rem', 
                  fontSize: '0.75rem', 
                  borderRadius: 'var(--radius-full)', 
                  border: 'none',
                  background: displayMoneda === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                  color: displayMoneda === 'ARS' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
             >ARS</button>
             <button 
                onClick={() => setViewMoneda('USD')}
                style={{ 
                  padding: '0.3rem 0.8rem', 
                  fontSize: '0.75rem', 
                  borderRadius: 'var(--radius-full)', 
                  border: 'none',
                  background: displayMoneda === 'USD' ? 'var(--accent-primary)' : 'transparent',
                  color: displayMoneda === 'USD' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
             >USD</button>
          </div>
        </div>
      </header>
      
      <div className="objective-detail-layout">
        <div className="detail-main-panel">
          
          <div className="detail-info-grid">
              <div className="detail-info-card">
                <h4 className="secondary-label">Fondo del Objetivo ({displayMoneda})</h4>
                <div className="detail-metrics-group">
                  <div className="detail-metric-item">
                    <h4 className="secondary-label">ACUMULADO</h4>
                    <p style={{ color: 'var(--accent-success)' }}>${convert(mntActual, objective.moneda).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="detail-metric-item" style={{ textAlign: 'right' }}>
                    <h4 className="secondary-label">RESTANTE</h4>
                    <p style={{ color: mntRestante > 0 ? 'var(--text-primary)' : 'var(--accent-success)' }}>
                      ${Math.max(0, convert(mntRestante, objective.moneda)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="detail-info-card">
                <h4 className="secondary-label">Meta y Prioridad ({displayMoneda})</h4>
                <div className="detail-metrics-group">
                  <div className="detail-metric-item">
                    <h4 className="secondary-label">TOTAL</h4>
                    <p>${convert(mntObjetivo, objective.moneda).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="detail-metric-item" style={{ textAlign: 'right' }}>
                    <h4 className="secondary-label">PRIORIDAD</h4>
                    <p style={{ color: objective.es_prioritario ? 'var(--accent-warning)' : 'inherit' }}>{objective.es_prioritario ? 'Alta' : 'Normal'}</p>
                  </div>
                </div>
              </div>
          </div>

          {projection && projection.meses_estimados_restantes > 0 && (
            <div className="detail-info-card glass-panel projection-card" style={{ border: '1px solid var(--accent-success)', background: 'rgba(16, 185, 129, 0.05)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ color: 'var(--accent-success)', marginBottom: '0.25rem' }}>Proyección de Cumplimiento</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Basado en tu ritmo de ahorro de <strong style={{color: 'var(--text-primary)'}}>${Number(projection.promedio_mensual_aportes).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> por mes.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>~ {projection.meses_estimados_restantes} meses</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{projection.mensaje}</p>
              </div>
            </div>
          )}

          <div className="progress-section chart-section">
            <div className="progress-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>Evolución del Ahorro</h4>
                <div title="El gráfico representa el saldo histórico acumulado" style={{ display: 'flex', color: 'var(--text-muted)', cursor: 'help' }}>
                  <InfoOutlined fontSize="small" style={{ fontSize: '1rem' }} />
                </div>
              </div>
              <span>{Number(objective.porcentaje_completado || 0).toFixed(1)}%</span>
            </div>
            
            <div style={{ width: '100%', height: 250, marginTop: '1rem', marginBottom: '1.5rem', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}
                    formatter={(value) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${displayMoneda}`, 'Acumulado']}
                  />
                  <ReferenceLine y={convert(mntObjetivo, objective.moneda)} label={{ position: 'top', value: `Meta ${displayMoneda}`, fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} stroke="var(--accent-warning)" strokeDasharray="5 5" />
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
                Vencimiento establecido: {new Date(objective.fecha_limite + 'T00:00:00').toLocaleDateString()}
              </p>
            )}
            {projection && projection.fecha_cumplimiento_estimada && (
              <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Vencimiento estimado: {new Date(projection.fecha_cumplimiento_estimada + 'T00:00:00').toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="progress-section movements-history">
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
                                {mov.tipo === 'aporte' ? '+' : '-'}${Number(mov.monto).toLocaleString(undefined, { maximumFractionDigits: 2 })} {mov.moneda}
                              </p>
                              {dolarRate && (
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                   ≈ USD ${(mov.moneda === 'USD' ? Number(mov.monto) : Number(mov.monto) / dolarRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </p>
                              )}
                           </div>
                           <div className="movement-actions" style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn-icon-small" onClick={() => handleEditMove(mov)} title="Editar">
                                <Edit style={{ fontSize: '1rem' }} />
                              </button>
                              <button className="btn-icon-small btn-danger-text" onClick={() => handleDeleteMove(mov.id)} title="Eliminar">
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
                      onClick={() => fetchObjectiveData(true)}
                    >
                      Ver más movimientos
                    </button>
                  )}
                </>
              )}
          </div>

        </div>

        <div className="detail-side-panel">
          <div className="glass-panel register-movement-panel" style={{ padding: '1rem' }}>
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

          <div className="glass-panel actions-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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

      <TutorialOverlay
        active={tutorial.active}
        step={tutorial.currentStep}
        currentIndex={tutorial.currentIndex}
        total={tutorial.total}
        isFirst={tutorial.isFirst}
        isLast={tutorial.isLast}
        progress={tutorial.progress}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        onFinish={tutorial.finish}
      />

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
                onChange={(e) => handleEditCurrencyChange(e.target.value)}
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

      {/* Edit Movement Modal */}
      <Modal
        isOpen={isEditMoveModalOpen}
        onClose={() => setIsEditMoveModalOpen(false)}
        title="Editar Movimiento"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setIsEditMoveModalOpen(false)}>Cancelar</button>
            <button type="submit" form="edit-move-form" className="btn-primary">Actualizar</button>
          </>
        }
      >
        <form id="edit-move-form" onSubmit={handleUpdateMove}>
          <div className="form-group">
            <label>Monto</label>
            <div className="amount-input-wrapper">
              <span className="amount-input-prefix">$</span>
              <input 
                type="text" 
                value={editMoveForm.monto}
                onChange={(e) => setEditMoveForm({...editMoveForm, monto: formatAmount(e.target.value)})}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Motivo</label>
            <input 
              type="text" 
              value={editMoveForm.motivo}
              onChange={(e) => setEditMoveForm({...editMoveForm, motivo: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input 
              type="date" 
              value={editMoveForm.fecha}
              onChange={(e) => setEditMoveForm({...editMoveForm, fecha: e.target.value})}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ObjectiveDetail;
