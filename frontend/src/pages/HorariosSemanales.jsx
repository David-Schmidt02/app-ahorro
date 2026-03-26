import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api/axios';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOT_TEMPLATE = { inicio: '09:00', fin: '17:00', actividad: '' };
const EMPTY_SEMANA = Object.fromEntries(DIAS.map(d => [d, []]));

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function toTime(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }

function calcLibres(slotsA, slotsB) {
  const occ = [...slotsA, ...slotsB].map(s => [toMin(s.inicio), toMin(s.fin)]).sort((a,b) => a[0]-b[0]);
  const merged = [];
  for (const [s,e] of occ) {
    if (!merged.length || s > merged[merged.length-1][1]) merged.push([s,e]);
    else merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], e);
  }
  const libres = [];
  let cur = 7*60;
  for (const [s,e] of merged) { if (s > cur) libres.push([cur,s]); cur = Math.max(cur,e); }
  if (cur < 23*60) libres.push([cur, 23*60]);
  return libres.filter(([s,e]) => e-s >= 30);
}

function calcOcupadosJuntos(slotsA, slotsB) {
  const res = [];
  for (const a of slotsA) for (const b of slotsB) {
    const s = Math.max(toMin(a.inicio), toMin(b.inicio));
    const e = Math.min(toMin(a.fin),   toMin(b.fin));
    if (e > s) res.push({ inicio: toTime(s), fin: toTime(e) });
  }
  return res;
}

const inputSt = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '0.25rem 0.4rem',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  width: '100%',
};

const SlotEditor = ({ slot, onChange, onDelete }) => (
  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginBottom: '0.35rem' }}>
    <input type="time" value={slot.inicio} onChange={e => onChange({ ...slot, inicio: e.target.value })}
      style={{ ...inputSt, width: '80px' }} />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', flexShrink: 0 }}>→</span>
    <input type="time" value={slot.fin} onChange={e => onChange({ ...slot, fin: e.target.value })}
      style={{ ...inputSt, width: '80px' }} />
    <input type="text" placeholder="Actividad" value={slot.actividad}
      onChange={e => onChange({ ...slot, actividad: e.target.value })}
      style={{ ...inputSt, flex: 1 }} />
    <button onClick={onDelete}
      style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7, padding: '1px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <DeleteOutlineIcon style={{ fontSize: '0.85rem' }} />
    </button>
  </div>
);

const HorariosSemanales = () => {
  const [meId,      setMeId]      = useState(null);
  // miData: el schedule editable del usuario actual
  const [miData,    setMiData]    = useState(EMPTY_SEMANA);
  // otros: array de { usuario_id, nombre_usuario, data (parsed) } para usuarios que ya tienen horario
  const [otros,     setOtros]     = useState([]);
  const [saved,     setSaved]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, todosRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/horarios/todos'),
        ]);

        const myId = meRes.data.id;
        setMeId(myId);

        const todos = todosRes.data || [];

        // Mi horario
        const mio = todos.find(h => h.usuario_id === myId);
        if (mio?.data) {
          try { setMiData(JSON.parse(mio.data)); } catch { /* keep empty */ }
        }

        // Horarios de los demás (ya tienen columna creada)
        const demás = todos
          .filter(h => h.usuario_id !== myId)
          .map(h => {
            let parsed = EMPTY_SEMANA;
            try { parsed = JSON.parse(h.data); } catch { /* keep empty */ }
            return { usuario_id: h.usuario_id, nombre: h.nombre_usuario || `Usuario ${h.usuario_id}`, data: parsed };
          });
        setOtros(demás);
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
    } catch (err) {
      console.error('Error guardando horario:', err);
      setSaved('Error al guardar');
      setTimeout(() => setSaved(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addSlot = (dia) => {
    setMiData(p => ({ ...p, [dia]: [...p[dia], { ...SLOT_TEMPLATE }] }));
  };

  const updateSlot = (dia, i, updated) => {
    setMiData(p => { const s = [...p[dia]]; s[i] = updated; return { ...p, [dia]: s }; });
  };

  const deleteSlot = (dia, i) => {
    setMiData(p => ({ ...p, [dia]: p[dia].filter((_, j) => j !== i) }));
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="dashboard-header"><h1>Horarios Semanales</h1></div>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Cargando...</p>
      </div>
    );
  }

  // Columnas dinámicas: Día | Yo | [un col por cada otro usuario con horario] | Coincidencias (si hay ≥1 otro)
  const mostrarCoincidencias = otros.length > 0;
  // Para la columna de coincidencias usamos al primer partner (si hay más de uno, mezclamos todos)
  const allOtrosSlots = (dia) => otros.flatMap(o => o.data[dia] || []);

  // Distribución de anchos
  const colCount = 1 + 1 + otros.length + (mostrarCoincidencias ? 1 : 0);
  const thStyle = (color) => ({
    padding: '0.65rem 0.9rem', textAlign: 'left',
    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em',
    color, background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.08)',
  });

  const accentColors = ['var(--accent-secondary)', '#a855f7', '#f59e0b', '#10b981'];

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
              border: saved.startsWith('Error') ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(16,185,129,0.25)',
            }}>
              {saved}
            </span>
          )}
          <button className="btn-primary" onClick={save} disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
            <SaveIcon fontSize="small" /> {isSaving ? 'Guardando...' : 'Guardar mi horario'}
          </button>
        </div>
      </div>

      {otros.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center' }}>
          Cuando tu pareja guarde su horario aparecerá acá automáticamente.
        </p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${Math.max(600, colCount * 160)}px`, fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={thStyle('var(--text-muted)')}>DÍA</th>
              <th style={thStyle('var(--accent-primary)')}>YO</th>
              {otros.map((o, idx) => (
                <th key={o.usuario_id} style={thStyle(accentColors[idx % accentColors.length])}>
                  {o.nombre.toUpperCase()}
                </th>
              ))}
              {mostrarCoincidencias && (
                <th style={thStyle('var(--accent-success)')}>COINCIDENCIAS</th>
              )}
            </tr>
          </thead>
          <tbody>
            {DIAS.map((dia, rowIdx) => {
              const slotsYo     = miData[dia]        || [];
              const slotsOtros  = allOtrosSlots(dia);
              const libres      = mostrarCoincidencias ? calcLibres(slotsYo, slotsOtros)           : [];
              const ocupados    = mostrarCoincidencias ? calcOcupadosJuntos(slotsYo, slotsOtros)   : [];
              const isOdd       = rowIdx % 2 === 1;
              const cellBase    = {
                padding: '0.6rem 0.9rem',
                border: '1px solid rgba(255,255,255,0.08)',
                verticalAlign: 'top',
                background: isOdd ? 'rgba(255,255,255,0.015)' : 'transparent',
              };

              return (
                <tr key={dia}>
                  {/* DÍA */}
                  <td style={{ ...cellBase, fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {dia}
                  </td>

                  {/* YO (editable) */}
                  <td style={cellBase}>
                    {slotsYo.map((slot, i) => (
                      <SlotEditor key={i} slot={slot}
                        onChange={u => updateSlot(dia, i, u)}
                        onDelete={() => deleteSlot(dia, i)}
                      />
                    ))}
                    <button onClick={() => addSlot(dia)} style={{
                      fontSize: '0.72rem', color: 'var(--accent-primary)', background: 'transparent',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: '0.15rem', padding: '2px 0', opacity: 0.8, marginTop: '2px',
                    }}>
                      <AddIcon style={{ fontSize: '0.8rem' }} /> bloque
                    </button>
                  </td>

                  {/* Columnas de otros usuarios (solo lectura) */}
                  {otros.map((o, idx) => {
                    const slots = o.data[dia] || [];
                    return (
                      <td key={o.usuario_id} style={cellBase}>
                        {slots.length === 0 ? (
                          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.75rem' }}>—</span>
                        ) : (
                          slots.map((slot, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                              <span style={{ color: accentColors[idx % accentColors.length], fontVariantNumeric: 'tabular-nums' }}>
                                {slot.inicio}→{slot.fin}
                              </span>
                              {slot.actividad && (
                                <span style={{ marginLeft: '0.3rem', color: 'var(--text-muted)' }}>{slot.actividad}</span>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}

                  {/* COINCIDENCIAS */}
                  {mostrarCoincidencias && (
                    <td style={cellBase}>
                      {slotsYo.length === 0 && slotsOtros.length === 0 ? (
                        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.75rem' }}>—</span>
                      ) : (
                        <>
                          {libres.length > 0 && (
                            <div style={{ marginBottom: '0.3rem' }}>
                              {libres.map(([s,e], i) => (
                                <span key={i} style={{
                                  display: 'inline-block', fontSize: '0.73rem',
                                  background: 'rgba(16,185,129,0.12)',
                                  border: '1px solid rgba(16,185,129,0.25)',
                                  color: 'var(--accent-success)',
                                  borderRadius: '4px', padding: '1px 5px', margin: '1px 2px',
                                }}>
                                  🟢 {toTime(s)}–{toTime(e)}
                                </span>
                              ))}
                            </div>
                          )}
                          {ocupados.length > 0 && (
                            <div>
                              {ocupados.map((c, i) => (
                                <span key={i} style={{
                                  display: 'inline-block', fontSize: '0.73rem',
                                  background: 'rgba(251,191,36,0.1)',
                                  border: '1px solid rgba(251,191,36,0.25)',
                                  color: 'var(--accent-warning)',
                                  borderRadius: '4px', padding: '1px 5px', margin: '1px 2px',
                                }}>
                                  🟡 {c.inicio}–{c.fin}
                                </span>
                              ))}
                            </div>
                          )}
                          {libres.length === 0 && ocupados.length === 0 && (
                            <span style={{ fontSize: '0.73rem', color: 'var(--accent-success)', opacity: 0.8 }}>Todo el día libres</span>
                          )}
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
        Solo podés editar tu propia columna. Las demás se muestran en modo lectura.
      </p>
    </div>
  );
};

export default HorariosSemanales;
