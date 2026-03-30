import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Modal from '../components/Modal';
import ActionButton from '../components/ActionButton';
import PageHeader from '../components/PageHeader';
import CategoriaSelector from '../components/CategoriaSelector';
import { useIsMobile } from '../hooks/useIsMobile';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MovieIcon from '@mui/icons-material/Movie';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HomeIcon from '@mui/icons-material/Home';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import FlightIcon from '@mui/icons-material/Flight';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CategoryIcon from '@mui/icons-material/Category';
import { Tooltip } from '@mui/material';
import { formatAmount, cleanAmount, formatK, convertCurrency } from '../utils/formatters';
import HistorialMovimientos from '../components/HistorialMovimientos';

const CATEGORIAS = [
  { id: 'comida',          label: 'Comida',          Icon: RestaurantIcon,   color: '#f97316' },
  { id: 'transporte',      label: 'Transporte',       Icon: DirectionsCarIcon,color: '#3b82f6' },
  { id: 'entretenimiento', label: 'Entretenimiento',  Icon: MovieIcon,        color: '#a855f7' },
  { id: 'salud',           label: 'Salud',            Icon: LocalHospitalIcon,color: '#10b981' },
  { id: 'hogar',           label: 'Hogar',            Icon: HomeIcon,         color: '#f59e0b' },
  { id: 'ropa',            label: 'Ropa',             Icon: CheckroomIcon,    color: '#ec4899' },
  { id: 'viajes',          label: 'Viajes',           Icon: FlightIcon,       color: '#06b6d4' },
  { id: 'tecnologia',      label: 'Tecnología',       Icon: SmartphoneIcon,   color: '#6366f1' },
  { id: 'regalos',         label: 'Regalos',          Icon: CardGiftcardIcon, color: '#e11d48' },
  { id: 'otros',           label: 'Otros',            Icon: CategoryIcon,     color: '#64748b' },
];
const CAT_MAP = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));

/** Ícono de categoría con borde outlined (sin relleno de fondo) */
const CatIcon = ({ cat, size = 36, fontSize = 'small' }) => {
  const { Icon, color } = cat;
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--radius-sm)',
      border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, flexShrink: 0, background: 'transparent',
    }}>
      <Icon fontSize={fontSize} />
    </div>
  );
};

const GastoForm = ({ form, setForm, handleSubmit, isSubmitting, formId }) => (
  <form id={formId} onSubmit={handleSubmit}>
    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '1rem' }}>
      <div className="form-group">
        <label>Monto</label>
        <div className="amount-input-wrapper">
          <span className="amount-input-prefix">$</span>
          <input
            type="text" inputMode="numeric" placeholder=""
            value={form.monto}
            onChange={e => setForm({ ...form, monto: formatAmount(e.target.value) })}
            required
            autoFocus={!!formId}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Moneda</label>
        <select className="glass-select" value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
    </div>

    <div className="form-group">
      <label>Categoría — <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{CAT_MAP[form.categoria]?.label}</span></label>
      <CategoriaSelector
        categorias={CATEGORIAS}
        selectedId={form.categoria}
        onSelect={(id) => setForm({ ...form, categoria: id })}
        categoryMap={CAT_MAP}
      />
    </div>

    <div className="form-group">
      <label>Descripción (opcional)</label>
      <input
        type="text" placeholder="Ej: Almuerzo en el centro"
        value={form.descripcion}
        onChange={e => setForm({ ...form, descripcion: e.target.value })}
      />
    </div>

    {!formId && (
      <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : <><AddIcon fontSize="small" /> Agregar Gasto</>}
      </button>
    )}
  </form>
);

const Gastos = () => {
  const { dolarRate, viewMoneda } = useCurrency();
  const isMobile = useIsMobile();
  const [gastos, setGastos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({
    monto: '', moneda: 'ARS', categoria: 'comida', descripcion: '',
  });

  const fetchGastos = async () => {
    try {
      const res = await api.get('/gastos/');
      setGastos(res.data);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGastos(); }, []);

  useEffect(() => {
    const handler = () => setIsFormOpen(true);
    window.addEventListener('fab:click:/gastos', handler);
    return () => window.removeEventListener('fab:click:/gastos', handler);
  }, []);

  const convert = (amount, moneda) => convertCurrency(amount, moneda, viewMoneda, dolarRate);

  const now = new Date();
  const mesActual  = now.getMonth();
  const anioActual = now.getFullYear();

  const gastosMes = useMemo(() => gastos.filter(g => {
    const d = new Date(g.fecha);
    return d.getMonth() === mesActual && d.getFullYear() === anioActual;
  }), [gastos]);

  const totalMes = useMemo(() =>
    gastosMes.reduce((sum, g) => sum + convert(g.monto, g.moneda), 0),
    [gastosMes, viewMoneda, dolarRate]
  );

  const barData = useMemo(() => {
    const bycat = {};
    gastosMes.forEach(g => {
      bycat[g.categoria] = (bycat[g.categoria] || 0) + convert(g.monto, g.moneda);
    });
    return CATEGORIAS
      .filter(c => bycat[c.id])
      .map(c => ({ name: c.label, monto: Math.round(bycat[c.id]), fill: c.color, id: c.id }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastosMes, viewMoneda, dolarRate]);

  const topCategoria = barData[0] || null;

  const lineData = useMemo(() => {
    const byDay = {};
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    gastos.filter(g => new Date(g.fecha) >= cutoff).forEach(g => {
      const day = new Date(g.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      byDay[day] = (byDay[day] || 0) + convert(g.monto, g.moneda);
    });
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, monto]) => ({ name, monto: Math.round(monto) }));
  }, [gastos, viewMoneda, dolarRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/gastos/', {
        monto: parseFloat(cleanAmount(form.monto)),
        moneda: form.moneda,
        categoria: form.categoria,
        descripcion: form.descripcion || undefined,
      });
      setForm({ monto: '', moneda: 'ARS', categoria: 'comida', descripcion: '' });
      setIsFormOpen(false);
      await fetchGastos();
    } catch (err) {
      console.error('Error creando gasto:', err);
      alert('No se pudo registrar el gasto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gastos/${id}`);
      setGastos(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error borrando gasto:', err);
    }
  };

  if (isLoading) return (
    <div className="page-container page-loader">
      <div className="spinner" /><span>Cargando gastos...</span>
    </div>
  );

  const monedaSymbol = viewMoneda === 'ARS' ? 'AR$' : 'US$';

  return (
    <div className="page-container">
      <PageHeader
        title="Gastos"
        action={!isMobile ? (
          <ActionButton
            label="Nuevo Gasto"
            Icon={AttachMoneyIcon}
            onClick={() => setIsFormOpen(true)}
          />
        ) : null}
      />


      {/* Form inline (desktop) / Modal (mobile) */}
      {isMobile ? (
        <>
          <Modal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            title="Registrar Gasto"
            footer={
              <>
                <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                <button type="submit" form="gasto-form" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Agregar Gasto'}
                </button>
              </>
            }
          >
            {GastoForm({ form, setForm, handleSubmit, isSubmitting, formId: 'gasto-form' })}
          </Modal>
        </>
      ) : null}

      <div className="gastos-layout" style={isMobile ? {} : { display: 'grid', gridTemplateColumns: '380px 240px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Columna Izquierda: Formulario */}
        {!isMobile && (
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Registrar Gasto</h3>
            {GastoForm({ form, setForm, handleSubmit, isSubmitting })}
          </div>
        )}

        {/* Columna Centro: Stats */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="summary-card glass-panel">
              <CatIcon cat={{ Icon: AttachMoneyIcon, color: '#ef4444' }} size={40} fontSize="small" />
              <div className="summary-info">
                <h3>Total este mes</h3>
                <p style={{ fontSize: '1.2rem' }}>{monedaSymbol} {formatK(totalMes)}</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{gastosMes.length} gastos</p>
              </div>
            </div>
            <div className="summary-card glass-panel">
              <CatIcon cat={{ Icon: CategoryIcon, color: 'var(--accent-success)' }} size={40} fontSize="small" />
              <div className="summary-info">
                <h3>Total registros</h3>
                <p style={{ fontSize: '1.2rem' }}>{gastos.length}</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Desde el inicio</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {barData.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Por categoría — este mes</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${Intl.NumberFormat('es-AR', { notation: 'compact' }).format(v)}`}
                  />
                  <RTooltip
                    contentStyle={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px' }}
                    formatter={v => [`${monedaSymbol} ${v.toLocaleString()}`, 'Gasto']}
                  />
                  <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {lineData.length > 1 && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Evolución últimos 30 días</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${Intl.NumberFormat('es-AR', { notation: 'compact' }).format(v)}`}
                  />
                  <RTooltip
                    contentStyle={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px' }}
                    formatter={v => [`${monedaSymbol} ${v.toLocaleString()}`, 'Gasto del día']}
                  />
                  <Line type="monotone" dataKey="monto" stroke="var(--accent-secondary)" strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--bg-surface)' }} activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <HistorialMovimientos
        title="Últimos gastos"
        items={gastos}
        emptyMessage="Todavía no hay gastos registrados."
        renderItem={(g) => {
          const cat = CAT_MAP[g.categoria] || CAT_MAP.otros;
          return {
            key: g.id,
            tipo: 'retiro',
            content: (
              <>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <CatIcon cat={cat} size={32} />
                  <div className="movement-item-info">
                    <span className="movement-item-reason">{g.descripcion || cat.label}</span>
                    <span className="movement-item-date">{cat.label} · {new Date(g.fecha).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <div className="movement-item-amount" style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0 }}>-{monedaSymbol} {formatK(convert(g.monto, g.moneda))}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{g.moneda}</p>
                  </div>
                  <button className="btn-icon-small btn-danger-text" onClick={() => handleDelete(g.id)} title="Eliminar">
                    <DeleteOutlineIcon style={{ fontSize: '1rem' }} />
                  </button>
                </div>
              </>
            ),
          };
        }}
      />
    </div>
  );
};

export default Gastos;
