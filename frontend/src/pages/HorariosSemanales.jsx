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
  padding: '0.4rem 0.3rem',
  border: '1px solid rgba(255,255,255,0.07)',
  verticalAlign: 'top',
  background: isOdd ? 'rgba(255,255,255,0.012)' : 'transparent',
  minWidth: '120px',
  width: '120px',
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
  const [selectedDay, setSelectedDay] = useState(DIAS.includes(todayDia) ? todayDia : 'Lunes');

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

      {/* ── Mobile: selector de día + vista vertical ─────────── */}
      {isMobile ? (
        <>
          {/* Day pills */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {DIAS.map(dia => {
              const isToday = dia === todayDia;
              const isSelected = dia === selectedDay;
              return (
                <button key={dia} onClick={() => setSelectedDay(dia)} style={{
                  flexShrink: 0,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(225,29,72,0.15)' : 'transparent',
                  color: isSelected ? 'var(--accent-primary)' : isToday ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
                  cursor: 'pointer',
                  outline: isToday && !isSelected ? '1px solid rgba(255,255,255,0.15)' : 'none',
                }}>
                  {dia.slice(0, 3).toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Mi horario para el día seleccionado */}
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mi horario
            </h2>
            {miData[selectedDay].length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Sin actividades</p>
            )}
            {miData[selectedDay].map((slot, si) => (
              <div key={si} onClick={() => setEditingSlot({ dia: selectedDay, index: si })}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.55rem 0.75rem', marginBottom: '0.4rem',
                  background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}>
                <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {slot.inicio} – {slot.fin}
                </span>
                {slot.actividad && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>{slot.actividad}</span>
                )}
              </div>
            ))}
            {warnings[selectedDay] && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-danger)', display: 'block', marginBottom: '0.4rem' }}>{warnings[selectedDay]}</span>
            )}
            <button onClick={() => addSlot(selectedDay)} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.45rem 0.75rem', marginTop: '0.25rem',
              background: 'transparent', border: '1px dashed rgba(225,29,72,0.3)',
              borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center',
            }}>
              <AddIcon style={{ fontSize: '1rem' }} /> Agregar actividad
            </button>
          </section>

          {/* Partner para el día seleccionado */}
          {partner ? (
            <section style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {partner.nombre}
              </h2>
              {(partner.data[selectedDay] || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin actividades</p>
              ) : (
                (partner.data[selectedDay] || []).map((slot, si) => (
                  <div key={si} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.55rem 0.75rem', marginBottom: '0.4rem',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <span style={{ color: 'var(--accent-secondary)', fontSize: '0.85rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {slot.inicio} – {slot.fin}
                    </span>
                    {slot.actividad && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>{slot.actividad}</span>
                    )}
                  </div>
                ))
              )}
            </section>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Cuando tu pareja guarde su horario aparecerá acá.
            </p>
          )}

          {/* Libres juntos para el día seleccionado */}
          {partner && (() => {
            const libres = calcLibres(miData[selectedDay] || [], partner.data[selectedDay] || []);
            return (
              <section>
                <h2 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--accent-success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Libres juntos
                </h2>
                {libres.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin ratos libres en común</p>
                ) : (
                  libres.map(([s, e], li) => (
                    <div key={li} style={{
                      padding: '0.55rem 0.75rem', marginBottom: '0.4rem',
                      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-success)', fontSize: '0.85rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {toTime(s)} – {toTime(e)}
                    </div>
                  ))
                )}
              </section>
            );
          })()}
        </>
      ) : (
        <>
          {/* ── TABLA 1: Mi horario ─────────────────────────────── */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
              Mi horario
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {DIAS.map(dia => <th key={dia} style={thSt('var(--accent-primary)')}>{dia.toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {DIAS.map((dia, i) => (
                      <td key={dia} style={tdSt(i % 2 === 1)}>
                        {miData[dia].map((slot, si) => (
                          <SlotEditor key={si} slot={slot}
                            error={warnings[`${dia}-${si}`]}
                            onChange={upd => updateSlot(dia, si, upd)}
                            onDelete={() => deleteSlot(dia, si)}
                          />
                        ))}
                        {warnings[dia] && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', display: 'block' }}>{warnings[dia]}</span>
                        )}
                        <button onClick={() => addSlot(dia)} style={{
                          fontSize: '0.68rem', color: 'var(--accent-primary)', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: '0.15rem', padding: '2px 0', opacity: 0.75, marginTop: '2px',
                        }}>
                          <AddIcon style={{ fontSize: '0.75rem' }} /> actividad
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── TABLA 2: Horario del partner ────────────────────── */}
          {partner ? (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-secondary)' }}>
                {partner.nombre}
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      {DIAS.map(dia => <th key={dia} style={thSt('var(--accent-secondary)')}>{dia.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {DIAS.map((dia, i) => {
                        const slots = partner.data[dia] || [];
                        return (
                          <td key={dia} style={tdSt(i % 2 === 1)}>
                            {slots.length === 0 ? (
                              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>—</span>
                            ) : (
                              slots.map((slot, si) => (
                                <div key={si} style={{
                                  fontSize: '0.73rem', marginBottom: '0.3rem',
                                  background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.3rem',
                                }}>
                                  <span style={{ color: 'var(--accent-secondary)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
                                    {slot.inicio} → {slot.fin}
                                  </span>
                                  {slot.actividad && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{slot.actividad}</span>
                                  )}
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Cuando tu pareja guarde su horario aparecerá acá automáticamente.
            </p>
          )}

          {/* ── TABLA 3: Libres juntos ───────────────────────────── */}
          {partner && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-success)' }}>
                Libres juntos
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      {DIAS.map(dia => <th key={dia} style={thSt('var(--accent-success)')}>{dia.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {DIAS.map((dia, i) => {
                        const libres = calcLibres(miData[dia] || [], partner.data[dia] || []);
                        return (
                          <td key={dia} style={{ ...tdSt(i % 2 === 1), background: i % 2 === 1 ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.02)' }}>
                            {libres.length === 0 ? (
                              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.73rem' }}>—</span>
                            ) : (
                              libres.map(([s, e], li) => (
                                <span key={li} style={{
                                  display: 'block', fontSize: '0.71rem',
                                  background: 'rgba(16,185,129,0.15)',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  color: 'var(--accent-success)',
                                  borderRadius: '4px', padding: '2px 4px',
                                  marginBottom: '3px', fontVariantNumeric: 'tabular-nums',
                                }}>
                                  {toTime(s)} – {toTime(e)}
                                </span>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
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
