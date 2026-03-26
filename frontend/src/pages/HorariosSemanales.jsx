import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api/axios';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOT_TEMPLATE = { inicio: '09:00', fin: '17:00', actividad: '' };
const EMPTY_SEMANA = Object.fromEntries(DIAS.map(d => [d, []]));

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function toTime(m) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

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

const inputSt = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '0.25rem 0.4rem',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  width: '100%',
};

const SlotEditor = ({ slot, onChange, onDelete }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.3rem' }}>
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      <input type="time" value={slot.inicio} onChange={e => onChange({ ...slot, inicio: e.target.value })}
        style={{ ...inputSt, flex: 1 }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', flexShrink: 0 }}>→</span>
      <input type="time" value={slot.fin} onChange={e => onChange({ ...slot, fin: e.target.value })}
        style={{ ...inputSt, flex: 1 }} />
      <button onClick={onDelete}
        style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7, padding: '1px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <DeleteOutlineIcon style={{ fontSize: '0.8rem' }} />
      </button>
    </div>
    <input type="text" placeholder="Actividad" value={slot.actividad}
      onChange={e => onChange({ ...slot, actividad: e.target.value })}
      style={{ ...inputSt }} />
  </div>
);

/* ── Tabla genérica con días como columnas ───────────── */
const thSt = (color) => ({
  padding: '0.55rem 0.5rem',
  textAlign: 'center',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
});

const tdSt = (isOdd) => ({
  padding: '0.5rem',
  border: '1px solid rgba(255,255,255,0.07)',
  verticalAlign: 'top',
  background: isOdd ? 'rgba(255,255,255,0.012)' : 'transparent',
  minWidth: '110px',
});

/* ────────────────────────────────────────────────────── */
const HorariosSemanales = () => {
  const [miData,   setMiData]   = useState(EMPTY_SEMANA);
  const [otros,    setOtros]    = useState([]);
  const [saved,    setSaved]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const addSlot    = (dia)         => setMiData(p => ({ ...p, [dia]: [...p[dia], { ...SLOT_TEMPLATE }] }));
  const updateSlot = (dia, i, upd) => setMiData(p => { const s = [...p[dia]]; s[i] = upd; return { ...p, [dia]: s }; });
  const deleteSlot = (dia, i)      => setMiData(p => ({ ...p, [dia]: p[dia].filter((_, j) => j !== i) }));

  if (loading) return (
    <div className="page-container">
      <div className="dashboard-header"><h1>Horarios Semanales</h1></div>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Cargando...</p>
    </div>
  );

  // Solo tomamos el primer "otro" usuario (el sistema asume 2 usuarios)
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
            <SaveIcon fontSize="small" /> {isSaving ? 'Guardando...' : 'Guardar mi horario'}
          </button>
        </div>
      </div>

      {/* ── TABLA 1: Mi horario ─────────────────────────────── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
          Mi horario
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
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
                        onChange={upd => updateSlot(dia, si, upd)}
                        onDelete={() => deleteSlot(dia, si)}
                      />
                    ))}
                    <button onClick={() => addSlot(dia)} style={{
                      fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'transparent',
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
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
                              fontSize: '0.75rem', marginBottom: '0.3rem',
                              background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.3rem',
                            }}>
                              <span style={{ color: 'var(--accent-secondary)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
                                {slot.inicio} → {slot.fin}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
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
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>—</span>
                        ) : (
                          libres.map(([s, e], li) => (
                            <span key={li} style={{
                              display: 'block', fontSize: '0.73rem',
                              background: 'rgba(16,185,129,0.15)',
                              border: '1px solid rgba(16,185,129,0.3)',
                              color: 'var(--accent-success)',
                              borderRadius: '4px', padding: '2px 6px',
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
