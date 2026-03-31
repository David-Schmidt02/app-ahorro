import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useIsMobile } from '../hooks/useIsMobile';
import Modal from '../components/Modal';
import ActionButton from '../components/ActionButton';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const EMPTY_SEMANA = Object.fromEntries(DIAS.map(d => [d, []]));

const SLOT_COLORS = [
  { name: 'Rosa',     value: '#e11d48', bg: 'rgba(225,29,72,0.10)',  border: 'rgba(225,29,72,0.25)' },
  { name: 'Naranja',  value: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  { name: 'Verde',    value: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  { name: 'Celeste',  value: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.25)' },
  { name: 'Violeta',  value: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
  { name: 'Teal',     value: '#14b8a6', bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.25)' },
  { name: 'Blanco',   value: '#e2e8f0', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' },
];
const DEFAULT_COLOR = SLOT_COLORS[0].value;

function getSlotColor(slot) {
  return SLOT_COLORS.find(c => c.value === slot.color) || SLOT_COLORS[0];
}

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function toTime(m) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

function sortSlots(slots) {
  return [...slots].sort((a, b) => toMin(a.inicio) - toMin(b.inicio));
}

function getOverlapError(slots, newSlot, excludeIdx) {
  const nS = toMin(newSlot.inicio);
  const nE = toMin(newSlot.fin);
  if (nE <= nS) return 'El fin debe ser posterior al inicio';
  for (let i = 0; i < slots.length; i++) {
    if (i === excludeIdx) continue;
    const s = toMin(slots[i].inicio);
    const e = toMin(slots[i].fin);
    if (nS < e && nE > s) return `Se superpone con ${slots[i].inicio}–${slots[i].fin}`;
  }
  return null;
}

function calcLibres(slotsA, slotsB) {
  const occ = [...slotsA, ...slotsB].map(s => [toMin(s.inicio), toMin(s.fin)]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of occ) {
    if (!merged.length || s > merged[merged.length - 1][1]) merged.push([s, e]);
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
  }
  const libres = [];
  let cur = 9 * 60;
  for (const [s, e] of merged) { if (s > cur) libres.push([cur, s]); cur = Math.max(cur, e); }
  if (cur < 23 * 60) libres.push([cur, 23 * 60]);
  return libres.filter(([s, e]) => e - s >= 30);
}

const baseSt = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
};

const inputSt = {
  ...baseSt,
  padding: '0.25rem 0.4rem',
  fontSize: '0.75rem',
  width: '100%',
};

/* ── Time input (usa picker nativo del SO) ────────────── */
const TimeInput = ({ value, onChange, mobile, accentColor }) => {
  const ac = accentColor || '#e11d48';
  if (mobile) {
    return (
      <div style={{ position: 'relative' }}>
        <input
          type="time"
          step="900"
          value={value}
          className="time-input-no-icon"
          onChange={e => { if (e.target.value) onChange(e.target.value); }}
          style={{
            background: `${ac}14`,
            border: `1px solid ${ac}66`,
            borderRadius: 'var(--radius-sm)',
            color: ac,
            fontFamily: 'inherit',
            padding: '0.85rem 0.5rem',
            paddingRight: '2.2rem',
            fontSize: '1.35rem',
            fontWeight: 700,
            width: '100%',
            boxSizing: 'border-box',
            minWidth: 0,
            cursor: 'pointer',
            colorScheme: 'dark',
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        />
        <AccessTimeIcon className="time-input-clock-pulse" style={{
          position: 'absolute', right: '0.6rem', top: 0, bottom: 0, margin: 'auto 0',
          height: 'fit-content',
          fontSize: '1.1rem', color: ac, pointerEvents: 'none',
        }} />
      </div>
    );
  }
  return (
    <input
      type="time"
      step="900"
      value={value}
      onChange={e => { if (e.target.value) onChange(e.target.value); }}
      style={{
        ...baseSt,
        padding: '0.18rem 0.3rem',
        fontSize: '0.72rem',
        flex: 1,
        minWidth: 0,
        cursor: 'pointer',
        colorScheme: 'dark',
      }}
    />
  );
};

/* ── Color picker inline ─────────────────────────────── */
const ColorPicker = ({ value, onChange, mobile }) => (
  <div style={{ display: 'flex', gap: mobile ? '0.65rem' : '3px', flexWrap: 'wrap', alignItems: 'center' }}>
    {SLOT_COLORS.map(c => {
      const isSelected = value === c.value;
      return (
        <button key={c.value} onClick={() => onChange(c.value)} title={c.name}
          style={{
            width: mobile ? '2.2rem' : '0.9rem', height: mobile ? '2.2rem' : '0.9rem',
            borderRadius: '50%',
            border: isSelected ? `2.5px solid ${c.value}` : '2px solid rgba(255,255,255,0.15)',
            background: isSelected ? c.value : 'rgba(255,255,255,0.08)',
            cursor: 'pointer', padding: 0,
            boxShadow: isSelected ? `0 0 10px ${c.value}55` : 'none',
            opacity: isSelected ? 1 : 0.5,
            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}>
          {/* Inner dot to hint the color when not selected */}
          {!isSelected && (
            <span style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: mobile ? '0.7rem' : '0.4rem', height: mobile ? '0.7rem' : '0.4rem',
              borderRadius: '50%', background: c.value,
            }} />
          )}
        </button>
      );
    })}
  </div>
);

/* ── Slot editor ─────────────────────────────────────── */
const SlotEditor = ({ slot, onChange, onDelete, error, mobile }) => {
  const ac = (getSlotColor(slot)).value;
  if (mobile) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', minWidth: 0 }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Inicio</label>
            <TimeInput value={slot.inicio} onChange={v => onChange({ ...slot, inicio: v })} mobile accentColor={ac} />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Fin</label>
            <TimeInput value={slot.fin} onChange={v => onChange({ ...slot, fin: v })} mobile accentColor={ac} />
          </div>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Actividad</label>
          <input type="text" placeholder="Ej: Trabajo, Gym..." value={slot.actividad}
            onChange={e => onChange({ ...slot, actividad: e.target.value })}
            style={{ ...baseSt, padding: '0.9rem 1rem', fontSize: '1.1rem', width: '100%', borderColor: `${ac}40` }} />
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Color</label>
          <ColorPicker value={slot.color || DEFAULT_COLOR} onChange={v => onChange({ ...slot, color: v })} mobile />
        </div>
        {error && <span style={{ fontSize: '0.85rem', color: 'var(--accent-danger)', display: 'block', marginTop: '0.6rem' }}>{error}</span>}
      </div>
    );
  }

  const sc = getSlotColor(slot);
  return (
    <div style={{ marginBottom: '0.4rem', background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 'var(--radius-sm)', padding: '0.35rem' }}>
      {/* Inicio → Fin en fila */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginBottom: '0.25rem' }}>
        <TimeInput value={slot.inicio} onChange={v => onChange({ ...slot, inicio: v })} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', flexShrink: 0 }}>→</span>
        <TimeInput value={slot.fin} onChange={v => onChange({ ...slot, fin: v })} />
      </div>
      {/* Actividad + color + repeat + delete en fila */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        <input type="text" placeholder="Actividad" value={slot.actividad}
          onChange={e => onChange({ ...slot, actividad: e.target.value })}
          style={{ ...inputSt, flex: 1, minWidth: 0 }} />
        <button onClick={onDelete}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.75, padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <DeleteOutlineIcon style={{ fontSize: '1rem' }} />
        </button>
      </div>
      {/* Color picker */}
      <div style={{ marginTop: '3px' }}>
        <ColorPicker value={slot.color || DEFAULT_COLOR} onChange={v => onChange({ ...slot, color: v })} />
      </div>
      {error && <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', display: 'block', marginTop: '2px' }}>{error}</span>}
    </div>
  );
};

/* ── Day chips para copiar a otros días ──────────────── */
const DAY_LABELS = [
  { dia: 'Lunes', label: 'L' }, { dia: 'Martes', label: 'M' }, { dia: 'Miércoles', label: 'X' },
  { dia: 'Jueves', label: 'J' }, { dia: 'Viernes', label: 'V' }, { dia: 'Sábado', label: 'S' }, { dia: 'Domingo', label: 'D' },
];

const DayChips = ({ currentDay, selected, onToggle, accentColor }) => {
  const ac = accentColor || '#e11d48';
  const lvDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].filter(d => d !== currentDay);
  const allLV = lvDays.every(d => selected.includes(d));
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Copiar a</label>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        {DAY_LABELS.map(({ dia, label }) => {
          if (dia === currentDay) return (
            <span key={dia} style={{
              width: '2.2rem', height: '2.2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
              opacity: 0.3, border: '1px solid rgba(255,255,255,0.06)',
            }}>{label}</span>
          );
          const isOn = selected.includes(dia);
          return (
            <button key={dia} onClick={() => onToggle(dia)} style={{
              width: '2.2rem', height: '2.2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: 0, transition: 'all 0.15s',
              background: isOn ? `${ac}25` : 'rgba(255,255,255,0.04)',
              border: isOn ? `2px solid ${ac}` : '1px solid rgba(255,255,255,0.12)',
              color: isOn ? ac : 'var(--text-secondary)',
              transform: isOn ? 'scale(1.08)' : 'scale(1)',
            }}>{label}</button>
          );
        })}
        <button onClick={() => {
          if (allLV) onToggle('clear-lv');
          else onToggle('set-lv');
        }} style={{
          marginLeft: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)',
          fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
          background: allLV ? `${ac}20` : 'rgba(255,255,255,0.04)',
          border: allLV ? `1px solid ${ac}50` : '1px dashed rgba(255,255,255,0.15)',
          color: allLV ? ac : 'var(--text-muted)',
          transition: 'all 0.15s',
        }}>L-V</button>
      </div>
    </div>
  );
};

/* ── Table styles ────────────────────────────────────── */
const thSt = (color) => ({
  padding: '0.5rem 0.3rem',
  textAlign: 'center',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
});

const tdSt = (isOdd) => ({
  padding: '0.5rem 0.5rem',
  border: '1px solid rgba(255,255,255,0.07)',
  verticalAlign: 'top',
  background: isOdd ? 'rgba(255,255,255,0.012)' : 'transparent',
  minWidth: '160px',
  width: '160px',
});

/* ─────────────────────────────────────────────────────── */
const DOW_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const HorariosSemanales = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [miData,   setMiData]   = useState(EMPTY_SEMANA);
  const [otros,    setOtros]    = useState([]);
  const [saved,    setSaved]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [warnings, setWarnings] = useState({});
  const [editingSlot, setEditingSlot] = useState(null); // { dia, index } | null
  const [copyDays, setCopyDays] = useState([]);
  const todayDia = DOW_MAP[new Date().getDay()];
  const [desktopEdit, setDesktopEdit] = useState(null); // { dia, index } | null
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(DIAS.map(d => [d, d !== DOW_MAP[new Date().getDay()]])));
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);
  const todayRef = useRef(null);

  useEffect(() => {
    const handler = () => save();
    window.addEventListener('fab:click:/horarios', handler);
    return () => window.removeEventListener('fab:click:/horarios', handler);
  }, []);

  // Marcar dirty cuando miData cambia después de la carga inicial
  const miDataJson = JSON.stringify(miData);
  const savedDataRef = useRef(null);
  useEffect(() => {
    if (!loadedRef.current) return;
    if (savedDataRef.current === null) return;
    setDirty(miDataJson !== savedDataRef.current);
  }, [miDataJson]);

  // Auto-scroll al día de hoy en mobile
  useEffect(() => {
    if (!loading && isMobile && todayRef.current) {
      setTimeout(() => {
        const y = todayRef.current.getBoundingClientRect().top + window.scrollY - 20;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 150);
    }
  }, [loading, isMobile]);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, todosRes] = await Promise.all([api.get('/auth/me'), api.get('/horarios/todos')]);
        const myId = meRes.data.id;
        const todos = todosRes.data || [];

        const mio = todos.find(h => h.usuario_id === myId);
        let parsed = EMPTY_SEMANA;
        if (mio?.data) { try { parsed = JSON.parse(mio.data); setMiData(parsed); } catch { /* keep empty */ } }
        savedDataRef.current = JSON.stringify(parsed);

        setOtros(
          todos
            .filter(h => h.usuario_id !== myId)
            .map(h => {
              let p = EMPTY_SEMANA;
              try { p = JSON.parse(h.data); } catch { /* keep empty */ }
              return { usuario_id: h.usuario_id, nombre: h.nombre_usuario || `Usuario ${h.usuario_id}`, data: p };
            })
        );
      } catch (err) {
        console.error('Error cargando horarios:', err);
      } finally {
        setLoading(false);
        loadedRef.current = true;
      }
    };
    load();
  }, []);

  const save = async () => {
    if (isSaving) return;
    // Validar todos los slots antes de guardar
    const newWarnings = {};
    let hasErrors = false;
    for (const dia of DIAS) {
      const slots = miData[dia] || [];
      for (let i = 0; i < slots.length; i++) {
        const err = getOverlapError(slots, slots[i], i);
        if (err) {
          newWarnings[`${dia}-${i}`] = err;
          hasErrors = true;
        }
      }
    }
    if (hasErrors) {
      setWarnings(w => ({ ...w, ...newWarnings }));
      setSaved('Corregí las superposiciones antes de guardar');
      setTimeout(() => setSaved(''), 3000);
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/horarios/mio', { data: JSON.stringify(miData) });
      savedDataRef.current = JSON.stringify(miData);
      setDirty(false);
      setSaved('Guardado');
      setTimeout(() => setSaved(''), 2000);
    } catch {
      setSaved('Error al guardar');
      setTimeout(() => setSaved(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addSlot = (dia, openModal = false) => {
    const slots = miData[dia];
    let found = null;
    for (let h = 7; h < 22 && !found; h++) {
      const candidate = { inicio: toTime(h * 60), fin: toTime((h + 1) * 60), actividad: '', color: DEFAULT_COLOR };
      if (!getOverlapError(slots, candidate, -1)) found = candidate;
    }
    if (!found) {
      setWarnings(w => ({ ...w, [dia]: 'No hay espacio disponible' }));
      setTimeout(() => setWarnings(w => ({ ...w, [dia]: '' })), 2500);
      return;
    }
    const newSlots = sortSlots([...slots, found]);
    const newIndex = newSlots.findIndex(s => s === found);
    setMiData(p => ({ ...p, [dia]: newSlots }));
    if (openModal) {
      setTimeout(() => {
        if (isMobile) setEditingSlot({ dia, index: newIndex });
        else setDesktopEdit({ dia, index: newIndex });
      }, 0);
    }
  };

  const updateSlot = (dia, i, upd) => {
    const currentSlots = miData[dia];
    const err = getOverlapError(currentSlots, upd, i);
    setWarnings(w => ({ ...w, [`${dia}-${i}`]: err || '' }));
    setMiData(p => {
      const s = [...p[dia]];
      s[i] = upd;
      return { ...p, [dia]: sortSlots(s) };
    });
  };

  const deleteSlot = (dia, i) => setMiData(p => ({ ...p, [dia]: p[dia].filter((_, j) => j !== i) }));

  const toggleCopyDay = (action) => {
    const lvDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    if (action === 'set-lv') {
      setCopyDays(prev => [...new Set([...prev, ...lvDays])]);
    } else if (action === 'clear-lv') {
      setCopyDays(prev => prev.filter(d => !lvDays.includes(d)));
    } else {
      setCopyDays(prev => prev.includes(action) ? prev.filter(d => d !== action) : [...prev, action]);
    }
  };

  const applyCopyAndClose = (dia, slot, setModal) => {
    if (copyDays.length > 0) {
      setMiData(p => {
        const updated = { ...p };
        for (const d of copyDays) {
          if (d === dia) continue;
          const exists = updated[d].some(s => s.inicio === slot.inicio && s.fin === slot.fin && s.actividad === slot.actividad);
          if (!exists) {
            updated[d] = sortSlots([...updated[d], { ...slot }]);
          }
        }
        return updated;
      });
    }
    setCopyDays([]);
    setModal(null);
  };

  if (loading) return (
    <div className="page-container">
      <div className="dashboard-header"><h1>Horarios Semanales</h1></div>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Cargando...</p>
    </div>
  );

  const partner = otros[0] || null;

  // Estilos para etiquetas laterales
  const lateralLabelSt = (color) => ({
    whiteSpace: 'nowrap',
    color,
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '1rem 0.6rem',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.5)',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    width: '80px',
    maxWidth: '80px',
  });

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      <div className="dashboard-header">
        <h1>Horarios Semanales</h1>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(saved || dirty) && (
              <span className={dirty && !saved ? 'unsaved-indicator' : ''} style={{
                fontSize: '0.82rem',
                color: saved ? (saved.startsWith('Error') || saved.startsWith('Corregí') ? 'var(--accent-danger)' : 'var(--accent-success)') : '#f59e0b',
                background: saved ? (saved.startsWith('Error') || saved.startsWith('Corregí') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)') : 'rgba(245,158,11,0.08)',
                padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${saved ? (saved.startsWith('Error') || saved.startsWith('Corregí') ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)') : 'rgba(245,158,11,0.25)'}`,
              }}>{saved || 'Cambios sin guardar'}</span>
            )}
            <ActionButton
              label="Guardar mi horario"
              Icon={SaveIcon}
              onClick={save}
              disabled={isSaving}
              isLoading={isSaving}
            />
          </div>
        )}
      </div>

      {isMobile && location.pathname === '/horarios' && (saved || dirty) && ReactDOM.createPortal(
        <div className={dirty && !saved ? 'unsaved-indicator' : ''} style={{
          position: 'fixed', bottom: '145px', right: '1.25rem', zIndex: 91,
          fontSize: '0.78rem',
          color: saved ? (saved.startsWith('Error') || saved.startsWith('Corregí') ? 'var(--accent-danger)' : 'var(--accent-success)') : '#f59e0b',
          background: saved ? (saved.startsWith('Error') || saved.startsWith('Corregí') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)') : 'rgba(245,158,11,0.12)',
          padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)',
          border: `1px solid ${saved ? (saved.startsWith('Error') || saved.startsWith('Corregí') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)') : 'rgba(245,158,11,0.3)'}`,
          backdropFilter: 'blur(8px)',
        }}>{saved || 'Cambios sin guardar'}</div>,
        document.body
      )}

      {/* ── Mobile: 7 cards apilados ─────────────── */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {DIAS.map(dia => {
            const isToday = dia === todayDia;
            const miDataDia = miData[dia] || [];
            const partnerDataDia = partner?.data[dia] || [];
            const libres = partner ? calcLibres(miDataDia, partnerDataDia) : [];

            return (
              <div key={dia} ref={isToday ? todayRef : null} className="glass-panel" style={{
                padding: collapsed[dia] ? '0.85rem 1.25rem' : '1.25rem',
                border: isToday ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                transition: 'padding 0.2s ease',
              }}>
                {isToday && (
                  <span style={{
                    position: 'absolute', top: '-10px', right: '1rem',
                    background: 'var(--accent-primary)', color: 'white',
                    fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px',
                    borderRadius: '4px', letterSpacing: '0.05em'
                  }}>HOY</span>
                )}

                <div onClick={() => setCollapsed(p => ({ ...p, [dia]: !p[dia] }))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: collapsed[dia] ? 0 : '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {dia}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {collapsed[dia] && miDataDia.length > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {miDataDia.length} actividad{miDataDia.length > 1 ? 'es' : ''}
                      </span>
                    )}
                    <span style={{
                      color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1,
                      transform: collapsed[dia] ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.2s ease',
                    }}>▾</span>
                  </div>
                </div>

                {!collapsed[dia] && <>
                {/* David Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    David <div style={{ flex: 1, height: '1px', background: 'rgba(225,29,72,0.15)' }} />
                  </h4>
                  {miDataDia.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '0.75rem' }}>Sin actividades</p>
                  ) : (
                    miDataDia.map((slot, si) => {
                      const sc = getSlotColor(slot);
                      return (
                        <div key={si} onClick={() => { setCopyDays([]); setEditingSlot({ dia, index: si }); }}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', marginBottom: '0.5rem',
                            background: sc.bg, border: `1px solid ${sc.border}`,
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          }}>
                          <span style={{ color: sc.value, fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {slot.inicio} – {slot.fin}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {slot.actividad && (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{slot.actividad}</span>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteSlot(dia, si); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.5, padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <DeleteOutlineIcon style={{ fontSize: '1rem' }} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <button onClick={() => addSlot(dia, true)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.65rem', marginTop: '0.5rem',
                    background: 'transparent', border: '1px dashed rgba(225,29,72,0.3)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)',
                    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center',
                  }}>
                    <AddIcon style={{ fontSize: '1.1rem' }} /> Agregar actividad
                  </button>
                </div>

                {/* Partner Section */}
                {partner && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {partner.nombre} <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                    </h4>
                    {partnerDataDia.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin actividades</p>
                    ) : (
                      partnerDataDia.map((slot, si) => {
                        const pc = getSlotColor(slot);
                        return (
                          <div key={si} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', marginBottom: '0.5rem',
                            background: pc.bg, border: `1px solid ${pc.border}`,
                            borderRadius: 'var(--radius-sm)',
                          }}>
                            <span style={{ color: pc.value, fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {slot.inicio} – {slot.fin}
                            </span>
                            {slot.actividad && (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{slot.actividad}</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Libres Section */}
                {partner && (
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Libres juntos <div style={{ flex: 1, height: '1px', background: 'rgba(16,185,129,0.15)' }} />
                    </h4>
                    {libres.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin ratos libres comunes</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {libres.map(([s, e], li) => (
                          <div key={li} style={{
                            padding: '0.25rem 0.55rem',
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: '20px',
                            color: 'var(--accent-success)', fontSize: '0.78rem', fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {toTime(s)} – {toTime(e)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </>}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop: Tabla Unificada ─────────────── */
        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '80px', maxWidth: '80px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></th>
                {DIAS.map(dia => (
                  <th key={dia} style={{
                    ...thSt(dia === todayDia ? 'var(--accent-primary)' : 'var(--text-secondary)'),
                    borderBottom: dia === todayDia ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: dia === todayDia ? 'rgba(225,29,72,0.05)' : 'rgba(0,0,0,0.4)',
                    padding: '1rem 0.5rem',
                    fontSize: '0.8rem',
                    position: 'relative',
                  }}>
                    {dia.slice(0,3).toUpperCase()}
                    {dia === todayDia && (
                      <span style={{
                        position: 'absolute', top: '-1px', right: '8px',
                        background: 'var(--accent-primary)', color: 'white',
                        fontSize: '0.55rem', fontWeight: 800, padding: '1px 6px',
                        borderRadius: '0 0 4px 4px', letterSpacing: '0.05em',
                      }}>HOY</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* FILA DAVID */}
              <tr>
                <td style={lateralLabelSt('var(--accent-primary)')}>David</td>
                {DIAS.map((dia, i) => (
                  <td key={dia} style={{ ...tdSt(i % 2 === 1) }}>
                    {miData[dia].map((slot, si) => {
                      const sc = getSlotColor(slot);
                      return (
                        <div key={si} style={{
                            fontSize: '0.75rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'stretch',
                            background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '4px',
                            transition: 'all 0.15s',
                          }}>
                          <div onClick={() => { setCopyDays([]); setDesktopEdit({ dia, index: si }); }}
                            style={{ flex: 1, padding: '0.35rem 0.4rem', cursor: 'pointer', minWidth: 0 }}>
                            <span style={{ color: sc.value, fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'block', fontSize: '0.72rem' }}>
                              {slot.inicio} – {slot.fin}
                            </span>
                            {slot.actividad && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{slot.actividad}</span>
                            )}
                            {warnings[`${dia}-${si}`] && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--accent-danger)', display: 'block', marginTop: '2px' }}>{warnings[`${dia}-${si}`]}</span>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteSlot(dia, si); }}
                            style={{
                              background: 'transparent', border: 'none', borderLeft: `1px solid ${sc.border}`,
                              color: 'var(--accent-danger)', cursor: 'pointer', padding: '0 0.3rem',
                              opacity: 0.5, display: 'flex', alignItems: 'center', flexShrink: 0,
                              transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                            <DeleteOutlineIcon style={{ fontSize: '0.85rem' }} />
                          </button>
                        </div>
                      );
                    })}
                    {warnings[dia] && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', display: 'block', marginBottom: '4px' }}>{warnings[dia]}</span>
                    )}
                    <button onClick={() => addSlot(dia, true)} style={{
                      fontSize: '0.72rem', color: 'var(--accent-primary)', background: 'rgba(225,29,72,0.08)',
                      border: '1px dashed rgba(225,29,72,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', width: '100%',
                      gap: '0.2rem', padding: '6px 0', borderRadius: '4px', marginTop: '4px',
                      transition: 'all 0.2s'
                    }} className="btn-hover-bright">
                      <AddIcon style={{ fontSize: '0.9rem' }} /> Actividad
                    </button>
                  </td>
                ))}
              </tr>

              {/* Separador */}
              <tr><td colSpan={8} style={{ height: '8px', background: 'rgba(255,255,255,0.02)' }}></td></tr>

              {/* FILA PARTNER */}
              {partner && (
                <>
                  <tr>
                    <td style={lateralLabelSt('var(--accent-secondary)')}>{partner.nombre}</td>
                    {DIAS.map((dia, i) => {
                      const slots = partner.data[dia] || [];
                      return (
                        <td key={dia} style={tdSt(i % 2 === 1)}>
                          {slots.length === 0 ? (
                            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', fontStyle: 'italic', display: 'block', textAlign: 'center', marginTop: '1rem' }}>—</span>
                          ) : (
                            slots.map((slot, si) => {
                              const pc = getSlotColor(slot);
                              return (
                              <div key={si} style={{
                                fontSize: '0.75rem', marginBottom: '0.4rem',
                                background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: '4px', padding: '0.4rem',
                              }}>
                                <span style={{ color: pc.value, fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'block' }}>
                                  {slot.inicio} – {slot.fin}
                                </span>
                                {slot.actividad && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{slot.actividad}</span>
                                )}
                              </div>
                              );
                            })
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr><td colSpan={8} style={{ height: '8px', background: 'rgba(255,255,255,0.02)' }}></td></tr>
                </>
              )}

              {/* FILA LIBRES */}
              {partner && (
                <tr>
                  <td style={lateralLabelSt('var(--accent-success)')}>Libres</td>
                  {DIAS.map((dia, i) => {
                    const libres = calcLibres(miData[dia] || [], partner.data[dia] || []);
                    return (
                      <td key={dia} style={{ ...tdSt(i % 2 === 1), background: i % 2 === 1 ? 'rgba(16,185,129,0.03)' : 'rgba(16,185,129,0.015)' }}>
                        {libres.length === 0 ? (
                          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', fontStyle: 'italic', display: 'block', textAlign: 'center', marginTop: '1rem' }}>—</span>
                        ) : (
                          libres.map(([s, e], li) => (
                            <div key={li} style={{
                              textAlign: 'center', fontSize: '0.75rem', fontWeight: 700,
                              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
                              color: 'var(--accent-success)', borderRadius: '4px', padding: '3px 0',
                              marginBottom: '4px', fontVariantNumeric: 'tabular-nums',
                            }}>
                              {toTime(s)} – {toTime(e)}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal edición de slot (desktop) */}
      {desktopEdit && (() => {
        const { dia, index } = desktopEdit;
        const slot = miData[dia]?.[index];
        if (!slot) return null;
        const slotColor = (getSlotColor(slot)).value;
        return (
          <Modal
            isOpen
            onClose={() => setDesktopEdit(null)}
            accentColor={slotColor}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ color: slotColor, fontWeight: 700 }}>{dia}</span>
                <span style={{
                  background: `${slotColor}18`,
                  border: `1px solid ${slotColor}50`,
                  borderRadius: '6px',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.82rem',
                  color: slotColor,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                }}>
                  {slot.inicio} – {slot.fin}
                </span>
              </span>
            }
            footer={
              <>
                <button className="btn-danger" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={() => { deleteSlot(dia, index); setCopyDays([]); setDesktopEdit(null); }}>
                  <DeleteOutlineIcon /> Eliminar
                </button>
                <button style={{
                  padding: '0.75rem 1.5rem', fontSize: '1rem',
                  background: `${slotColor}20`, border: `1px solid ${slotColor}50`,
                  color: slotColor, borderRadius: 'var(--radius-sm)',
                  fontWeight: 700, cursor: 'pointer',
                }} onClick={() => applyCopyAndClose(dia, slot, setDesktopEdit)}>Listo</button>
              </>
            }
          >
            <SlotEditor
              mobile
              slot={slot}
              error={warnings[`${dia}-${index}`]}
              onChange={upd => updateSlot(dia, index, upd)}
              onDelete={() => { deleteSlot(dia, index); setCopyDays([]); setDesktopEdit(null); }}
            />
            <div style={{ marginTop: '1.25rem' }}>
              <DayChips currentDay={dia} selected={copyDays} onToggle={toggleCopyDay} accentColor={slotColor} />
            </div>
          </Modal>
        );
      })()}

      {/* Modal edición de slot (mobile) */}
      {editingSlot && (() => {
        const { dia, index } = editingSlot;
        const slot = miData[dia]?.[index];
        if (!slot) return null;
        const slotColor = (getSlotColor(slot)).value;
        return (
          <Modal
            isOpen
            onClose={() => setEditingSlot(null)}
            accentColor={slotColor}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ color: slotColor, fontWeight: 700 }}>{dia}</span>
                <span style={{
                  background: `${slotColor}18`,
                  border: `1px solid ${slotColor}50`,
                  borderRadius: '6px',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.82rem',
                  color: slotColor,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                }}>
                  {slot.inicio} – {slot.fin}
                </span>
              </span>
            }
            footer={
              <>
                <button className="btn-danger" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { deleteSlot(dia, index); setCopyDays([]); setEditingSlot(null); }}>
                  <DeleteOutlineIcon /> Eliminar
                </button>
                <button style={{
                  padding: '0.75rem 1.5rem', fontSize: '1rem',
                  background: `${slotColor}20`, border: `1px solid ${slotColor}50`,
                  color: slotColor, borderRadius: 'var(--radius-sm)',
                  fontWeight: 700, cursor: 'pointer',
                }} onClick={() => applyCopyAndClose(dia, slot, setEditingSlot)}>Listo</button>
              </>
            }
          >
            <SlotEditor
              mobile
              slot={slot}
              error={warnings[`${dia}-${index}`]}
              onChange={upd => updateSlot(dia, index, upd)}
              onDelete={() => { deleteSlot(dia, index); setCopyDays([]); setEditingSlot(null); }}
            />
            <div style={{ marginTop: '1.25rem' }}>
              <DayChips currentDay={dia} selected={copyDays} onToggle={toggleCopyDay} accentColor={slotColor} />
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default HorariosSemanales;
