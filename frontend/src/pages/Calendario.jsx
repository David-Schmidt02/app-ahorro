import React, { useState, useEffect, useRef } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CakeIcon from '@mui/icons-material/Cake';
import ExploreIcon from '@mui/icons-material/Explore';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import HomeIcon from '@mui/icons-material/Home';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Modal from '../components/Modal';
import api from '../api/axios';

const TIPOS = [
  { id: 'aniversario',  label: 'Aniversario',  Icon: FavoriteIcon,    color: '#e11d48' },
  { id: 'cumpleanos',   label: 'Cumpleaños',   Icon: CakeIcon,         color: '#f97316' },
  { id: 'salida',       label: 'Salida',        Icon: ExploreIcon,      color: '#3b82f6' },
  { id: 'recordatorio', label: 'Recordatorio',  Icon: BookmarkIcon,     color: '#f59e0b' },
  { id: 'hogar',        label: 'Hogar',         Icon: HomeIcon,         color: '#10b981' },
  { id: 'otro',         label: 'Otro',          Icon: AutoAwesomeIcon,  color: '#a855f7' },
];
const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.id, t]));

/** Pequeño ícono con borde, sin relleno — igual que CatIcon en Gastos */
const TipoIcon = ({ tipo, size = 28, fontSize = 'small' }) => {
  const t = TIPO_MAP[tipo] || TIPO_MAP['otro'];
  const { Icon, color } = t;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--radius-sm)',
      border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, flexShrink: 0, background: 'transparent',
    }}>
      <Icon fontSize={fontSize} />
    </div>
  );
};

/** Redimensiona y comprime una imagen a base64 JPEG (max 500px, calidad 0.72) */
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 500;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleNotifications(events) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const notifiedKey = `cal_notified_${today.toISOString().split('T')[0]}`;
  const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

  events.forEach(ev => {
    if (notified.includes(String(ev.id))) return;
    const evDate = new Date(ev.fecha + 'T00:00:00');
    evDate.setHours(0, 0, 0, 0);
    const t = TIPO_MAP[ev.tipo];
    if (evDate.getTime() === today.getTime()) {
      new Notification(`Hoy: ${ev.titulo}`, { body: `${t?.label || ''} — ${ev.titulo}`, icon: '/favicon.ico' });
      notified.push(String(ev.id));
    } else if (evDate.getTime() === tomorrow.getTime()) {
      new Notification(`Mañana: ${ev.titulo}`, { body: `${t?.label || ''} — ${ev.titulo}`, icon: '/favicon.ico' });
      notified.push(String(ev.id));
    }
  });

  localStorage.setItem(notifiedKey, JSON.stringify(notified));
}

// Badge helper: sync evento list to localStorage so Layout can compute badge
function syncBadgeCache(events) {
  // Store lightweight version (no foto) for badge calculation
  const slim = events.map(({ id, fecha }) => ({ id, date: fecha }));
  localStorage.setItem('cal_events', JSON.stringify(slim));
  window.dispatchEvent(new Event('cal_events_changed'));
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

const Calendario = () => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', tipo: 'salida', time: '', photo: null });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [notifEnabled, setNotifEnabled] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );

  const loadEvents = async () => {
    try {
      const res = await api.get('/calendario/');
      setEvents(res.data);
      syncBadgeCache(res.data);
      scheduleNotifications(res.data);
    } catch (err) {
      console.error('Error cargando eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.dispatchEvent(new Event('cal_viewed'));
    requestNotifPermission();
    loadEvents();
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await compressImage(file);
    setPhotoPreview(b64);
    setForm(f => ({ ...f, photo: b64 }));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!selectedDay || !form.title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/calendario/', {
        titulo: form.title.trim(),
        tipo: form.tipo,
        fecha: selectedDay,
        hora: form.time || null,
        foto: form.photo || null,
      });
      await loadEvents();
      setIsModalOpen(false);
      setForm({ title: '', tipo: 'salida', time: '', photo: null });
      setPhotoPreview(null);
    } catch (err) {
      console.error('Error creando evento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/calendario/${id}`);
      setEvents(prev => {
        const updated = prev.filter(ev => ev.id !== id);
        syncBadgeCache(updated);
        return updated;
      });
    } catch (err) {
      console.error('Error eliminando evento:', err);
    }
  };

  const enableNotifications = async () => {
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
    if (perm === 'granted') scheduleNotifications(events);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // API returns 'fecha' field (YYYY-MM-DD string from Date column)
  const eventsForDay = (dateStr) => events.filter(ev => ev.fecha === dateStr);
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const upcoming = (() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events
      .filter(ev => { const d = new Date(ev.fecha + 'T00:00:00'); return d >= now && d <= in7; })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  })();

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Calendario</h1>
        {!notifEnabled && 'Notification' in window && (
          <button className="btn-secondary" onClick={enableNotifications} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <NotificationsIcon fontSize="small" /> Activar notificaciones
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Grilla del calendario */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{MESES[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.3rem 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsForDay(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    minHeight: '52px',
                    padding: '0.3rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: isSelected
                      ? '1px solid var(--accent-primary)'
                      : isToday
                        ? '1px solid rgba(225,29,72,0.3)'
                        : '1px solid transparent',
                    background: isSelected
                      ? 'rgba(225,29,72,0.1)'
                      : isToday
                        ? 'rgba(225,29,72,0.05)'
                        : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(225,29,72,0.05)' : 'rgba(255,255,255,0.02)'; }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{day}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', marginTop: '2px' }}>
                    {dayEvents.slice(0, 3).map(ev => {
                      const t = TIPO_MAP[ev.tipo];
                      return (
                        <span key={ev.id} title={ev.titulo} style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: t?.color || '#64748b', flexShrink: 0,
                        }} />
                      );
                    })}
                    {dayEvents.length > 3 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{dayEvents.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Eventos del día seleccionado */}
          {selectedDay && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', margin: 0 }}>
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button
                  className="btn-primary"
                  onClick={() => setIsModalOpen(true)}
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <AddIcon style={{ fontSize: '0.9rem' }} /> Evento
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin eventos. ¡Agregá uno!</p>
              ) : (
                selectedEvents.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <TipoIcon tipo={ev.tipo} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{TIPO_MAP[ev.tipo]?.label}{ev.hora ? ` · ${ev.hora}` : ''}</p>
                    </div>
                    {ev.foto && (
                      <img
                        src={ev.foto}
                        alt={ev.titulo}
                        onClick={() => setLightboxSrc(ev.foto)}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'zoom-in', flexShrink: 0 }}
                      />
                    )}
                    <button onClick={() => handleDelete(ev.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.6, padding: '2px', display: 'flex', alignItems: 'center' }}>
                      <DeleteOutlineIcon style={{ fontSize: '1rem' }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Próximos 7 días */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Próximos 7 días</h3>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Cargando...</p>
            ) : upcoming.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nada por ahora</p>
            ) : (
              upcoming.map(ev => {
                const evDate = new Date(ev.fecha + 'T00:00:00');
                const isEvToday = ev.fecha === todayStr;
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <TipoIcon tipo={ev.tipo} size={24} fontSize="inherit" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{ev.titulo}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: isEvToday ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {isEvToday ? '¡Hoy!' : evDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Leyenda */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>TIPOS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {TIPOS.map(t => (
                <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <TipoIcon tipo={t.id} size={20} fontSize="inherit" />
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal agregar evento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setPhotoPreview(null); setForm({ title: '', tipo: 'salida', time: '', photo: null }); }}
        title={selectedDay ? `Nuevo evento — ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}` : 'Nuevo evento'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" form="event-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Agregar'}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleAddEvent}>
          <div className="form-group">
            <label>Título</label>
            <input
              type="text" placeholder="Ej: Cumpleaños de mamá"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
              {TIPOS.map(t => (
                <button
                  key={t.id} type="button"
                  onClick={() => setForm({ ...form, tipo: t.id })}
                  style={{
                    padding: '0.5rem',
                    border: `1px solid ${form.tipo === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: form.tipo === t.id ? `${t.color}20` : 'rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    transition: 'all 0.15s',
                  }}
                >
                  <TipoIcon tipo={t.id} size={20} fontSize="inherit" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Hora (opcional)</label>
            <input
              type="time" value={form.time}
              onChange={e => setForm({ ...form, time: e.target.value })}
              style={{ width: 'auto' }}
            />
          </div>

          <div className="form-group">
            <label>Foto (opcional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
                  padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.82rem',
                }}
              >
                <PhotoCameraIcon fontSize="small" /> {photoPreview ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="preview"
                  style={{ height: '52px', width: '52px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
                  onClick={() => setLightboxSrc(photoPreview)}
                />
              )}
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoPreview(null); setForm(f => ({ ...f, photo: null })); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '0.78rem' }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightboxSrc}
            alt="foto evento"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 'var(--radius-md)', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', color: 'white', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}
          >✕</button>
        </div>
      )}
    </div>
  );
};

const navBtnStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  width: '32px', height: '32px',
  cursor: 'pointer',
  fontSize: '1.2rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
};

export default Calendario;
