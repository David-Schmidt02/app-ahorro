import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ActionButton from '../components/ActionButton';
import PageHeader from '../components/PageHeader';
import '../styles/dashboard.css';
import '../styles/objectives.css';
import { formatAmount, cleanAmount, formatK, convertCurrency } from '../utils/formatters';
import HistorialMovimientos from '../components/HistorialMovimientos';
import { useIsMobile } from '../hooks/useIsMobile';

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

    // Quick aporte/retiro modal
    const [quickMove, setQuickMove] = useState(null); // objetivo seleccionado
    const [qTipo, setQTipo] = useState('aporte');
    const [qMonto, setQMonto] = useState('');
    const [qMoneda, setQMoneda] = useState('ARS');
    const [qMotivo, setQMotivo] = useState('');
    const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
    const { dolarRate, setDolarRate, viewMoneda } = useCurrency();
    const isMobile = useIsMobile();

    const fetchDashboardData = async () => {
        try {
            const [objetivosRes, movimientosRes, estadisticasRes] = await Promise.all([
                api.get('/objetivos/'),
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
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    useEffect(() => {
        const handler = () => setIsNewModalOpen(true);
        window.addEventListener('fab:click:/', handler);
        return () => window.removeEventListener('fab:click:/', handler);
    }, []);

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

    const handleQuickSubmit = async (e) => {
        e.preventDefault();
        if (!qMonto || !quickMove) return;
        setIsQuickSubmitting(true);
        try {
            await api.post('/movimientos/', {
                objetivo_id: quickMove.id,
                monto: parseFloat(cleanAmount(qMonto)),
                moneda: qMoneda,
                tipo: qTipo,
                motivo: qMotivo || (qTipo === 'aporte' ? 'Aporte rápido' : 'Retiro rápido'),
            });
            setQuickMove(null);
            setQMonto('');
            setQMotivo('');
            await fetchDashboardData();
        } catch (err) {
            console.error("Error en movimiento rápido:", err);
            alert("No se pudo registrar el movimiento.");
        } finally {
            setIsQuickSubmitting(false);
        }
    };

    const openQuickMove = (e, obj, tipo) => {
        e.stopPropagation();
        setQTipo(tipo);
        setQMonto('');
        setQMotivo('');
        setQMoneda('ARS');
        setQuickMove(obj);
    };

    if (isLoading) {
        return <div className="page-container page-loader"><div className="spinner" /><span>Cargando panel...</span></div>;
    }

    return (
        <div className="page-container">
            <PageHeader
                title="Resumen de Ahorros"
                action={!isMobile ? (
                    <ActionButton
                        label="Nuevo Objetivo"
                        Icon={EmojiEventsIcon}
                        onClick={() => setIsNewModalOpen(true)}
                    />
                ) : null}
            />

            <div className="summary-cards">
                <div className="summary-card glass-panel">
                    <div className="summary-icon icon-primary">
                        <AccountBalanceIcon fontSize="inherit" />
                    </div>
                    <div className="summary-info">
                        <h3>Patrimonio Total</h3>
                        <p style={{ fontSize: '1.2rem' }}>
                          {viewMoneda === 'USD' ? 'US$' : 'AR$'} {formatK(viewMoneda === 'USD' ? Number(totales.patrimonio_usd || 0) : Number(totales.patrimonio_ars || 0))}
                        </p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, color: 'var(--accent-success)' }}>
                          {viewMoneda === 'USD' ? 'AR$' : 'US$'} {formatK(viewMoneda === 'USD' ? Number(totales.patrimonio_ars || 0) : Number(totales.patrimonio_usd || 0))}
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

            <div className="dashboard-section" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center' }}>
                        Objetivos
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
                                        {viewMoneda === 'USD' ? 'US$' : 'AR$'} {formatK(convertCurrency(Number(obj.monto_objetivo || 0), obj.moneda, viewMoneda, dolarRate))}
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

                                {/* Acciones rápidas */}
                                <div className="objective-quick-actions" onClick={e => e.stopPropagation()}>
                                    <button
                                        className="quick-action-btn quick-action-aporte"
                                        onClick={(e) => openQuickMove(e, obj, 'aporte')}
                                        title="Aporte rápido"
                                    >
                                        <AddIcon style={{ fontSize: '0.85rem' }} />
                                    </button>
                                    <button
                                        className="quick-action-btn quick-action-retiro"
                                        onClick={(e) => openQuickMove(e, obj, 'retiro')}
                                        title="Retiro rápido"
                                    >
                                        <RemoveIcon style={{ fontSize: '0.85rem' }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <HistorialMovimientos
              title="Últimos Movimientos"
              items={movimientos}
              emptyMessage="No hay movimientos registrados recientes."
              renderItem={(mov) => ({
                key: mov.id,
                tipo: mov.tipo,
                content: (
                  <>
                    <div className="movement-item-info">
                      <span className="movement-item-reason">
                        {objetivos.find(o => o.id === mov.objetivo_id)?.nombre || mov.motivo}
                      </span>
                      <span className="movement-item-date">
                        {mov.motivo} · {new Date(mov.fecha).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="movement-item-amount">
                      {mov.tipo === 'aporte' ? '+' : '-'}{viewMoneda === 'USD' ? 'US$' : 'AR$'} {formatK(convertCurrency(Number(mov.monto), mov.moneda || 'ARS', viewMoneda, dolarRate))}
                    </span>
                  </>
                ),
              })}
            />

            {/* Modal Movimiento Rápido */}
            <Modal
                isOpen={!!quickMove}
                onClose={() => setQuickMove(null)}
                title={quickMove ? `${qTipo === 'aporte' ? '+ Aporte' : '− Retiro'} — ${quickMove.nombre}` : ''}
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setQuickMove(null)}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="quick-move-form"
                            className={qTipo === 'aporte' ? 'btn-success' : 'btn-danger'}
                            disabled={isQuickSubmitting}
                        >
                            {isQuickSubmitting ? 'Registrando...' : (qTipo === 'aporte' ? 'Sumar Aporte' : 'Registrar Retiro')}
                        </button>
                    </>
                }
            >
                <div className="movement-tabs" style={{ marginBottom: '1.25rem' }}>
                    <button
                        type="button"
                        className={`movement-tab ${qTipo === 'aporte' ? 'active' : ''}`}
                        onClick={() => setQTipo('aporte')}
                    >Aporte</button>
                    <button
                        type="button"
                        className={`movement-tab ${qTipo === 'retiro' ? 'active' : ''}`}
                        onClick={() => setQTipo('retiro')}
                    >Retiro</button>
                </div>
                <form id="quick-move-form" onSubmit={handleQuickSubmit}>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Monto</label>
                            <div className="amount-input-wrapper">
                                <span className="amount-input-prefix">$</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={qMonto}
                                    onChange={(e) => setQMonto(formatAmount(e.target.value))}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Moneda</label>
                            <select value={qMoneda} onChange={(e) => setQMoneda(e.target.value)} className="glass-select">
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Motivo (opcional)</label>
                        <input
                            type="text"
                            placeholder={qTipo === 'aporte' ? 'Ej: Ahorro quincena' : 'Ej: Compra imprevista'}
                            value={qMotivo}
                            onChange={(e) => setQMotivo(e.target.value)}
                        />
                    </div>
                </form>
            </Modal>

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
