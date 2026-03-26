import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
import { formatAmount, cleanAmount } from '../utils/formatters';

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

function formatK(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toString();
}

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

const Gastos = () => {
  const { dolarRate } = useCurrency();
  const [gastos, setGastos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMoneda, setViewMoneda] = useState('ARS');

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

  const convert = (amount, moneda) => {
    if (!dolarRate || viewMoneda === moneda) return amount;
    if (moneda === 'ARS' && viewMoneda === 'USD') return amount / dolarRate;
    if (moneda === 'USD' && viewMoneda === 'ARS') return amount * dolarRate;
    return amount;
  };

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
      <div className="dashboard-header">
        <h1>Gastos</h1>
        {/* ARS/USD toggle comentado — por defecto ARS
        <div style={{ display: 'flex', borderRadius: 'var(--radius-full)', padding: '2px', background: 'rgba(0,0,0,0.2)' }}>
          {['ARS', 'USD'].map(m => (
            <button key={m} onClick={() => setViewMoneda(m)} style={{
              padding: '0.3rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)',
              border: 'none', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s',
              background: viewMoneda === m ? 'var(--accent-primary)' : 'transparent',
              color: viewMoneda === m ? 'white' : 'var(--text-muted)',
            }}>{m}</button>
          ))}
        </div>
        */}
      </div>

      {/* Stats */}
      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="summary-card glass-panel">
          <CatIcon cat={{ Icon: DeleteOutlineIcon, color: 'var(--accent-primary)' }} size={40} fontSize="small" />
          <div className="summary-info">
            <h3>Total este mes</h3>
            <p style={{ fontSize: '1.4rem' }}>{monedaSymbol} {formatK(totalMes)}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{gastosMes.length} gastos</p>
          </div>
        </div>
        {topCategoria && (
          <div className="summary-card glass-panel">
            <CatIcon cat={CAT_MAP[topCategoria.id]} size={40} fontSize="small" />
            <div className="summary-info">
              <h3>Mayor categoría</h3>
              <p style={{ fontSize: '1.4rem' }}>{topCategoria.name}</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{monedaSymbol} {formatK(topCategoria.monto)}</p>
            </div>
          </div>
        )}
        <div className="summary-card glass-panel">
          <CatIcon cat={{ Icon: CategoryIcon, color: 'var(--accent-success)' }} size={40} fontSize="small" />
          <div className="summary-info">
            <h3>Total registros</h3>
            <p style={{ fontSize: '1.4rem' }}>{gastos.length}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Desde el inicio</p>
          </div>
        </div>
      </div>

      <div className="gastos-layout" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Formulario */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Registrar Gasto</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '1rem' }}>
              <div className="form-group">
                <label>Monto</label>
                <div className="amount-input-wrapper">
                  <span className="amount-input-prefix">$</span>
                  <input
                    type="text" inputMode="numeric" placeholder="0"
                    value={form.monto}
                    onChange={e => setForm({ ...form, monto: formatAmount(e.target.value) })}
                    required
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

            {/* Selector de categoría con íconos outlined */}
            <div className="form-group">
              <label>Categoría — <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{CAT_MAP[form.categoria]?.label}</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>
                {CATEGORIAS.map(c => {
                  const isActive = form.categoria === c.id;
                  return (
                    <Tooltip key={c.id} title={c.label} placement="top" arrow>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, categoria: c.id })}
                        style={{
                          padding: '0.5rem',
                          border: `1.5px solid ${isActive ? c.color : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: 'var(--radius-sm)',
                          background: isActive ? `${c.color}15` : 'rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          color: isActive ? c.color : 'rgba(255,255,255,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <c.Icon fontSize="small" />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Descripción (opcional)</label>
              <input
                type="text" placeholder="Ej: Almuerzo en el centro"
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : <><AddIcon fontSize="small" /> Agregar Gasto</>}
            </button>
          </form>
        </div>

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

      {/* Historial */}
      <div style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Historial</h2>
        {gastos.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Todavía no hay gastos registrados.</p>
          </div>
        ) : (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            {gastos.map((g, i) => {
              const cat = CAT_MAP[g.categoria] || CAT_MAP.otros;
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1.25rem',
                  borderBottom: i < gastos.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <CatIcon cat={cat} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{g.descripcion || cat.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      {cat.label} · {new Date(g.fecha).toLocaleDateString('es-AR')}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--accent-danger)', margin: 0 }}>
                      -{monedaSymbol} {Math.round(convert(g.monto, g.moneda)).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{g.moneda}</p>
                  </div>

                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(g.id)}
                    title="Eliminar"
                    style={{ color: 'var(--accent-danger)', opacity: 0.6, width: '28px', height: '28px' }}
                  >
                    <DeleteOutlineIcon style={{ fontSize: '1rem' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gastos;
