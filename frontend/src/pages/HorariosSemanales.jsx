import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api/axios';
import { useIsMobile } from '../hooks/useIsMobile';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const EMPTY_SEMANA = Object.fromEntries(DIAS.map(d => [d, []]));
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

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

const selectSt = {
  ...baseSt,
  padding: '0.2rem 0.1rem',
  fontSize: '0.75rem',
  width: '38px',
  textAlign: 'center',
  cursor: 'pointer',
};

const inputSt = {
  ...baseSt,
  padding: '0.25rem 0.4rem',
  fontSize: '0.75rem',
  width: '100%',
};

/* ── Custom time select ───────────────────────────────── */
const TimeSelect = ({ value, onChange }) => {
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr, 10) || 0;
  const rawM = parseInt(mStr, 10) || 0;
  const m = MINUTES.reduce((prev, curr) => Math.abs(curr - rawM) < Math.abs(prev - rawM) ? curr : prev, 0);

  return (
    <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
      <select value={h} onChange={e => onChange(`${String(+e.target.value).padStart(2, '0')}:${String(m).padStart(2, '0')}`)} style={selectSt}>
        {HOURS.map(hr => <option key={hr} value={hr}>{String(hr).padStart(2, '00')}</option>)}
      </select>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', padding: '0 1px' }}>:</span>
      <select value={m} onChange={e => onChange(`${String(h).padStart(2, '0')}:${String(+e.target.value).padStart(2, '0')}`)} style={selectSt}>
        {MINUTES.map(mn => <option key={mn} value={mn}>{String(mn).padStart(2, '00')}</option>)}
      </select>
    </div>
  );
};

/* ── Slot editor ─────────────────────────────────────── */
const SlotEditor = ({ slot, onChange, onDelete, error }) => (
  <div style={{ marginBottom: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.3rem' }}>
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginBottom: '0.2rem' }}>
      <TimeSelect value={slot.inicio} onChange={v => onChange({ ...slot, inicio: v })} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', flexShrink: 0 }}>→</span>
      <TimeSelect value={slot.fin} onChange={v => onChange({ ...slot, fin: v })} />
      <button onClick={onDelete}
        style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7, padding: '1px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <DeleteOutlineIcon style={{ fontSize: '0.8rem' }} />
      </button>
    </div>
    <input type="text" placeholder="Actividad" value={slot.actividad}
      onChange={e => onChange({ ...slot, actividad: e.target.value })}
      style={inputSt} />
    {error && <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', display: 'block', marginTop: '2px' }}>{error}</span>}
  </div>
);

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
  minWidth: '82px',
  width: '82px',
});

/* ─────────────────────────────────────────────────────── */
const HorariosSemanales = () => {
  const isMobile = useIsMobile();
  const [miData,   setMiData]   = useState(EMPTY_SEMANA);
  const [otros,    setOtros]    = useState([]);
  const [saved,    setSaved]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [warnings, setWarnings] = useState({});

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
          <button className="btn-primary" onClick={save} disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
            <SaveIcon fontSize="small" />
            {isSaving ? 'Guardando...' : (isMobile ? 'Guardar' : 'Guardar mi horario')}
          </button>
        </div>
      </div>

      {/* ── TABLA 1: Mi horario ─────────────────────────────── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
          Mi horario
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {DIAS.map(dia => <th key={dia} style={thSt('var(--accent-primary)')}>{dia.slice(0, 3).toUpperCase()}</th>)}
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
                  {DIAS.map(dia => <th key={dia} style={thSt('var(--accent-secondary)')}>{dia.slice(0, 3).toUpperCase()}</th>)}
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
                  {DIAS.map(dia => <th key={dia} style={thSt('var(--accent-success)')}>{dia.slice(0, 3).toUpperCase()}</th>)}
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
    </div>
  );
};

export default HorariosSemanales;
