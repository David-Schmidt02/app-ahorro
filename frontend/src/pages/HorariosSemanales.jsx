import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api/axios';
import { useIsMobile } from '../hooks/useIsMobile';
import Modal from '../components/Modal';
import ActionButton from '../components/ActionButton';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const EMPTY_SEMANA = Object.fromEntries(DIAS.map(d => [d, []]));

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
  let cur = 7 * 60;
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
const TimeInput = ({ value, onChange, mobile }) => (
  <input
    type="time"
    step="900"
    value={value}
    onChange={e => { if (e.target.value) onChange(e.target.value); }}
    style={mobile ? {
      background: 'rgba(225, 29, 72, 0.08)',
      border: '1px solid rgba(225, 29, 72, 0.4)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--accent-primary)',
      fontFamily: 'inherit',
      padding: '0.85rem 0.5rem',
      fontSize: '1.35rem',
      fontWeight: 700,
      width: '100%',
      boxSizing: 'border-box',
      minWidth: 0,
      cursor: 'pointer',
      colorScheme: 'dark',
      textAlign: 'center',
      letterSpacing: '0.02em',
    } : {
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

/* ── Slot editor ─────────────────────────────────────── */
const SlotEditor = ({ slot, onChange, onDelete, error, mobile }) => {
  if (mobile) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', minWidth: 0 }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Inicio</label>
            <TimeInput value={slot.inicio} onChange={v => onChange({ ...slot, inicio: v })} mobile />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Fin</label>
            <TimeInput value={slot.fin} onChange={v => onChange({ ...slot, fin: v })} mobile />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Actividad</label>
          <input type="text" placeholder="Ej: Trabajo, Gym..." value={slot.actividad}
            onChange={e => onChange({ ...slot, actividad: e.target.value })}
            style={{ ...baseSt, padding: '0.9rem 1rem', fontSize: '1.1rem', width: '100%' }} />
        </div>
        {error && <span style={{ fontSize: '0.85rem', color: 'var(--accent-danger)', display: 'block', marginTop: '0.6rem' }}>{error}</span>}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.35rem' }}>
      {/* Inicio → Fin en fila */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginBottom: '0.25rem' }}>
        <TimeInput value={slot.inicio} onChange={v => onChange({ ...slot, inicio: v })} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', flexShrink: 0 }}>→</span>
        <TimeInput value={slot.fin} onChange={v => onChange({ ...slot, fin: v })} />
      </div>
      {/* Actividad + delete en fila */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        <input type="text" placeholder="Actividad" value={slot.actividad}
          onChange={e => onChange({ ...slot, actividad: e.target.value })}
          style={{ ...inputSt, flex: 1, minWidth: 0 }} />
        <button onClick={onDelete}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.75, padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <DeleteOutlineIcon style={{ fontSize: '1rem' }} />
        </button>
      </div>
      {error && <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', display: 'block', marginTop: '2px' }}>{error}</span>}
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
  const [miData,   setMiData]   = useState(EMPTY_SEMANA);
  const [otros,    setOtros]    = useState([]);
  const [saved,    setSaved]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [warnings, setWarnings] = useState({});
  const [editingSlot, setEditingSlot] = useState(null); // { dia, index } | null
  const todayDia = DOW_MAP[new Date().getDay()];

  useEffect(() => {
    const handler = () => save();
    window.addEventListener('fab:click:/horarios', handler);
    return () => window.removeEventListener('fab:click:/horarios', handler);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, todosRes] = await Promise.all([api.get('/auth/me'), api.get('/horarios/todos')]);
        const myId = meRes.data.id;
        const todos = todosRes.data || [];

        const mio = todos.find(h => h.usuario_id === myId);
        if (mio?.data) { try { setMiData(JSON.parse(mio.data)); } catch { /* keep empty */ } }

        setOtros(
          todos
            .filter(h => h.usuario_id !== myId)
            .map(h => {
              let parsed = EMPTY_SEMANA;
              try { parsed = JSON.parse(h.data); } catch { /* keep empty */ }
              return { usuario_id: h.usuario_id, nombre: h.nombre_usuario || `Usuario ${h.usuario_id}`, data: parsed };
            })
        );
      } catch (err) {
        console.error('Error cargando horarios:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await api.put('/horarios/mio', { data: JSON.stringify(miData) });
      setSaved('Guardado');
      setTimeout(() => setSaved(''), 2000);
    } catch {
      setSaved('Error al guardar');
      setTimeout(() => setSaved(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addSlot = (dia) => {
    const slots = miData[dia];
    // Find first available 1-hour block starting from 07:00
    let found = null;
    for (let h = 7; h < 22 && !found; h++) {
      const candidate = { inicio: toTime(h * 60), fin: toTime((h + 1) * 60), actividad: '' };
      if (!getOverlapError(slots, candidate, -1)) found = candidate;
    }
    if (!found) {
      setWarnings(w => ({ ...w, [dia]: 'No hay espacio disponible' }));
      setTimeout(() => setWarnings(w => ({ ...w, [dia]: '' })), 2500);
      return;
    }
    setMiData(p => ({ ...p, [dia]: sortSlots([...p[dia], found]) }));
  };

  const updateSlot = (dia, i, upd) => {
    const currentSlots = miData[dia];
    const err = getOverlapError(currentSlots, upd, i);
    if (err) {
      setWarnings(w => ({ ...w, [`${dia}-${i}`]: err }));
      return;
    }
    setWarnings(w => ({ ...w, [`${dia}-${i}`]: '' }));
    setMiData(p => {
      const s = [...p[dia]];
      s[i] = upd;
      return { ...p, [dia]: sortSlots(s) };
    });
  };

  const deleteSlot = (dia, i) => setMiData(p => ({ ...p, [dia]: p[dia].filter((_, j) => j !== i) }));

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
    fontSize: '0.9rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    padding: '1.25rem 1rem',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.5)',
    borderRight: '1px solid rgba(255,255,255,0.1)',
  });

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      <div className="dashboard-header">
        <h1>Horarios Semanales</h1>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {saved && (
              <span style={{
                fontSize: '0.82rem',
                color: saved.startsWith('Error') ? 'var(--accent-danger)' : 'var(--accent-success)',
                background: saved.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${saved.startsWith('Error') ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
              }}>{saved}</span>
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

      {isMobile && saved && (
        <div style={{
          position: 'fixed', bottom: '145px', right: '1.25rem', zIndex: 91,
          fontSize: '0.78rem',
          color: saved.startsWith('Error') ? 'var(--accent-danger)' : 'var(--accent-success)',
          background: saved.startsWith('Error') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)',
          border: `1px solid ${saved.startsWith('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          backdropFilter: 'blur(8px)',
        }}>{saved}</div>
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
              <div key={dia} className="glass-panel" style={{
                padding: '1.25rem',
                border: isToday ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
              }}>
                {isToday && (
                  <span style={{
                    position: 'absolute', top: '-10px', right: '1rem',
                    background: 'var(--accent-primary)', color: 'white',
                    fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px',
                    borderRadius: '4px', letterSpacing: '0.05em'
                  }}>HOY</span>
                )}
                
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {dia}
                </h3>

                {/* David Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    David <div style={{ flex: 1, height: '1px', background: 'rgba(225,29,72,0.15)' }} />
                  </h4>
                  {miDataDia.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '0.75rem' }}>Sin actividades</p>
                  ) : (
                    miDataDia.map((slot, si) => (
                      <div key={si} onClick={() => setEditingSlot({ dia, index: si })}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.75rem 1rem', marginBottom: '0.5rem',
                          background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.15)',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}>
                        <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {slot.inicio} – {slot.fin}
                        </span>
                        {slot.actividad && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{slot.actividad}</span>
                        )}
                      </div>
                    ))
                  )}
                  <button onClick={() => addSlot(dia)} style={{
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
                      partnerDataDia.map((slot, si) => (
                        <div key={si} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.75rem 1rem', marginBottom: '0.5rem',
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          <span style={{ color: 'var(--accent-secondary)', fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {slot.inicio} – {slot.fin}
                          </span>
                          {slot.actividad && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{slot.actividad}</span>
                          )}
                        </div>
                      ))
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
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: '20px',
                            color: 'var(--accent-success)', fontSize: '0.85rem', fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {toTime(s)} – {toTime(e)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                <th style={{ width: '60px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></th>
                {DIAS.map(dia => (
                  <th key={dia} style={{ 
                    ...thSt(dia === todayDia ? 'var(--accent-primary)' : 'var(--text-secondary)'),
                    borderBottom: dia === todayDia ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: dia === todayDia ? 'rgba(225,29,72,0.05)' : 'rgba(0,0,0,0.4)',
                    padding: '1rem 0.5rem',
                    fontSize: '0.8rem'
                  }}>
                    {dia.slice(0,3).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* FILA DAVID */}
              <tr>
                <td style={lateralLabelSt('var(--accent-primary)')}>David</td>
                {DIAS.map((dia, i) => (
                  <td key={dia} style={{ ...tdSt(i % 2 === 1), minHeight: '150px' }}>
                    {miData[dia].map((slot, si) => (
                      <SlotEditor key={si} slot={slot}
                        error={warnings[`${dia}-${si}`]}
                        onChange={upd => updateSlot(dia, si, upd)}
                        onDelete={() => deleteSlot(dia, si)}
                      />
                    ))}
                    {warnings[dia] && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', display: 'block', marginBottom: '4px' }}>{warnings[dia]}</span>
                    )}
                    <button onClick={() => addSlot(dia)} style={{
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
                            slots.map((slot, si) => (
                              <div key={si} style={{
                                fontSize: '0.75rem', marginBottom: '0.4rem',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.4rem',
                              }}>
                                <span style={{ color: 'var(--accent-secondary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'block' }}>
                                  {slot.inicio} – {slot.fin}
                                </span>
                                {slot.actividad && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{slot.actividad}</span>
                                )}
                              </div>
                            ))
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

      {/* Modal edición de slot (mobile) */}
      {editingSlot && (() => {
        const { dia, index } = editingSlot;
        const slot = miData[dia]?.[index];
        if (!slot) return null;
        return (
          <Modal
            isOpen
            onClose={() => setEditingSlot(null)}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{dia}</span>
                <span style={{
                  background: 'rgba(225,29,72,0.12)',
                  border: '1px solid rgba(225,29,72,0.3)',
                  borderRadius: '6px',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.82rem',
                  color: 'var(--accent-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                }}>
                  {slot.inicio} – {slot.fin}
                </span>
              </span>
            }
            footer={
              <>
                <button className="btn-danger" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { deleteSlot(dia, index); setEditingSlot(null); }}>
                  <DeleteOutlineIcon /> Eliminar
                </button>
                <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }} onClick={() => setEditingSlot(null)}>Listo</button>
              </>
            }
          >
            <SlotEditor
              mobile
              slot={slot}
              error={warnings[`${dia}-${index}`]}
              onChange={upd => updateSlot(dia, index, upd)}
              onDelete={() => { deleteSlot(dia, index); setEditingSlot(null); }}
            />
          </Modal>
        );
      })()}
    </div>
  );
};

export default HorariosSemanales;
