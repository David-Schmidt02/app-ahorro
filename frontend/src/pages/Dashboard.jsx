import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import '../styles/dashboard.css';
import '../styles/objectives.css';
import { formatAmount, cleanAmount } from '../utils/formatters';

const Dashboard = () => {
    const navigate = useNavigate();
    const [objetivos, setObjetivos] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [totales, setTotales] = useState({
        guardado: 0,
        meta: 0,
        progreso: 0,
        patrimonio_ars: 0,
        patrimonio_usd: 0,
        objetivos_completados: 0,
        objetivos_totales: 0
    });

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [newFormData, setNewFormData] = useState({
        nombre: '',
        descripcion: '',
        monto_objetivo: '',
        moneda: 'ARS',
        fecha_limite: new Date().toISOString().split('T')[0],
        es_prioritario: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { dolarRate, setDolarRate } = useCurrency();

    const fetchDashboardData = async () => {
        try {
            const params = {};

            if (filtroEstado !== 'todos') {
                params.estado = filtroEstado;
            }

            if (busqueda) {
                params.busqueda = busqueda;
            }

            const [objetivosRes, movimientosRes, estadisticasRes] = await Promise.all([
                api.get('/objetivos/', { params }),
                api.get('/movimientos/', { params: { limite: 5 } }),
                api.get('/estadisticas/')
            ]);

            const sortedObjectives = (objetivosRes.data || []).sort((a, b) => {
                if (a.es_prioritario === b.es_prioritario) return 0;
                return a.es_prioritario ? -1 : 1;
            });

            setObjetivos(sortedObjectives);
            setMovimientos(movimientosRes.data);

            const stats = estadisticasRes.data;
            if (stats.tasa_dolar_blue > 0) {
                setDolarRate(Number(stats.tasa_dolar_blue));
            }

            const currentRate = stats.tasa_dolar_blue > 0 ? Number(stats.tasa_dolar_blue) : (dolarRate || 1);
            
            setTotales({
                guardado: stats.monto_total_guardado || 0,
                meta: stats.monto_total_objetivos || 0,
                progreso: stats.progreso_global_porcentaje || 0,
                patrimonio_usd: stats.monto_total_guardado || 0,
                patrimonio_ars: (stats.monto_total_guardado || 0) * currentRate,
                objetivos_completados: stats.objetivos_completados || 0,
                objetivos_totales: stats.total_objetivos || 0
            });

        } catch (error) {
            console.error("Error cargando dashboard:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadData = useCallback(() => {
        fetchDashboardData();
    }, [busqueda, filtroEstado]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    const handleNewSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...newFormData,
                monto_objetivo: parseFloat(cleanAmount(newFormData.monto_objetivo))
            };
            await api.post('/objetivos/', payload);
            setIsNewModalOpen(false);
            setNewFormData({ nombre: '', descripcion: '', monto_objetivo: '', moneda: 'ARS', fecha_limite: new Date().toISOString().split('T')[0], es_prioritario: false });
            await fetchDashboardData();
        } catch (err) {
            console.error("Error al crear objetivo:", err);
            alert("No se pudo crear el objetivo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="page-container" style={{ textAlign: 'center', marginTop: '5rem' }}>Cargando Panel...</div>;
    }

    return (
        <div className="page-container">
            <div className="dashboard-header">
                <h1>Resumen de Ahorros</h1>
                <button className="btn-primary" onClick={() => setIsNewModalOpen(true)} style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AddIcon fontSize="small" /> Nuevo Objetivo
                </button>
            </div>

            <div className="summary-cards">
                <div className="summary-card glass-panel">
                    <div className="summary-icon icon-primary">
                        <AccountBalanceIcon fontSize="inherit" />
                    </div>
                    <div className="summary-info">
                        <h3>Patrimonio Total</h3>
                        <p style={{ fontSize: '1.2rem' }}>AR$ {Number(totales.patrimonio_ars || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, color: 'var(--accent-success)' }}>
                            US$ {Number(totales.patrimonio_usd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="summary-card glass-panel">
                    <div className="summary-icon icon-success">
                        <CheckCircleIcon fontSize="inherit" />
                    </div>
                    <div className="summary-info">
                        <h3>Objetivos</h3>
                        <p>{totales.objetivos_completados} / {totales.objetivos_totales}</p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Completados</p>
                    </div>
                </div>

                <div className="summary-card glass-panel">
                    <div className="summary-icon icon-warning">
                        <TrendingUpIcon fontSize="inherit" />
                    </div>
                    <div className="summary-info">
                        <h3>Progreso Global</h3>
                        <p>{Number(totales.progreso || 0).toFixed(1)}%</p>
                        <div className="progress-bar-bg" style={{ height: '4px', marginTop: '0.5rem' }}>
                            <div className="progress-bar-fill" style={{ width: `${Number(totales.progreso || 0)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-controls glass-panel" style={{ marginTop: '2rem', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="search-bar" style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                    <SearchIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.2rem' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o descripción..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ paddingLeft: '2.8rem', width: '100%', background: 'rgba(0,0,0,0.2)', height: '2rem' }}
                    />
                    {busqueda && (
                        <CloseIcon 
                            onClick={() => setBusqueda('')}
                            style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer' }} 
                        />
                    )}
                </div>

                <div className="status-filters" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FilterListIcon fontSize="small" /> Filtrar:
                    </span>
                    {['todos', 'activo', 'pausado', 'completado'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFiltroEstado(status)}
                            className={`filter-chip ${filtroEstado === status ? 'active' : ''}`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="dashboard-section" style={{ marginTop: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center' }}>
                        {filtroEstado === 'todos' ? 'Todos los Objetivos' : `Objetivos ${filtroEstado}s`}
                        <div className="bordo-tooltip-container">
                            <InfoOutlinedIcon fontSize="small" className="tooltip-icon" />
                            <div className="bordo-tooltip-text">
                                Lista filtrada de metas.
                            </div>
                        </div>
                    </h2>
                </div>

                {objetivos.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <InfoOutlinedIcon fontSize="large" style={{ marginBottom: '0.5rem' }} />
                        <p>Aún no has creado ningún objetivo. ¡Empieza ahora!</p>
                    </div>
                ) : (
                    <div className="objectives-grid">
                        {objetivos.map((obj) => (
                            <div 
                                key={obj.id} 
                                className="objective-card glass-panel cursor-pointer"
                                onClick={() => navigate(`/objetivo/${obj.id}`)}
                            >
                                {obj.es_prioritario && <span className="objective-badge badge-prioritario">Prioritario</span>}
                                
                                <div>
                                    <div className="objective-header">
                                        <h3 className="objective-title">{obj.nombre}</h3>
                                    </div>
                                    <div className="objective-monto">
                                        ${Math.round(Number(obj.monto_objetivo || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="objective-dates">
                                        Vence: {obj.fecha_limite ? new Date(obj.fecha_limite + 'T00:00:00').toLocaleDateString() : 'Sin fecha'}
                                    </div>
                                </div>

                                <div className="objective-progress-container">
                                    <div className="progress-header">
                                        <span>Progreso</span>
                                        <span>{Number(obj.porcentaje_completado || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div 
                                            className="progress-bar-fill" 
                                            style={{ width: `${Math.min(Number(obj.porcentaje_completado || 0), 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="dashboard-section" style={{ marginTop: '3rem', paddingBottom: '3rem' }}>
                <h2>Últimos Movimientos</h2>
                
                {movimientos.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
                        <p>No hay movimientos registrados recientes.</p>
                    </div>
                ) : (
                    <div className="glass-panel table-container">
                        <table className="movements-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Objetivo</th>
                                    <th>Motivo</th>
                                    <th>Tipo</th>
                                    <th>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.map((mov) => (
                                    <tr key={mov.id}>
                                        <td>{new Date(mov.fecha).toLocaleDateString()}</td>
                                        <td>{objetivos.find(o => o.id === mov.objetivo_id)?.nombre || `ID: ${mov.objetivo_id}`}</td>
                                        <td>{mov.motivo}</td>
                                        <td>
                                            <span className={`move-type type-${mov.tipo}`}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className={mov.tipo === 'aporte' ? 'amount-positive' : 'amount-negative'}>
                                            {mov.tipo === 'aporte' ? '+' : '-'}${Math.round(mov.monto).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Nuevo Objetivo */}
            <Modal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                title="Crear Nuevo Objetivo"
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setIsNewModalOpen(false)}>
                            Cancelar
                        </button>
                        <button type="submit" form="new-objective-form" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Creando...' : 'Crear Objetivo'}
                        </button>
                    </>
                }
            >
                <form id="new-objective-form" onSubmit={handleNewSubmit}>
                    <div className="form-group">
                        <label>Nombre del Objetivo</label>
                        <input
                            type="text"
                            value={newFormData.nombre}
                            onChange={(e) => setNewFormData({...newFormData, nombre: e.target.value})}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Descripción (Opcional)</label>
                        <textarea
                            rows="2"
                            value={newFormData.descripcion}
                            onChange={(e) => setNewFormData({...newFormData, descripcion: e.target.value})}
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
                                    value={newFormData.monto_objetivo}
                                    onChange={(e) => setNewFormData({...newFormData, monto_objetivo: formatAmount(e.target.value)})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Moneda</label>
                            <select
                                value={newFormData.moneda}
                                onChange={(e) => setNewFormData({...newFormData, moneda: e.target.value})}
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
                            value={newFormData.fecha_limite}
                            onChange={(e) => setNewFormData({...newFormData, fecha_limite: e.target.value})}
                            required
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={newFormData.es_prioritario}
                                onChange={(e) => setNewFormData({...newFormData, es_prioritario: e.target.checked})}
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

export default Dashboard;
