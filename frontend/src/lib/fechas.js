const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const dos = (n) => String(n).padStart(2, '0');

/** Fecha local en ISO ("2026-10-25"), sin el corrimiento de toISOString a UTC. */
export function aISO(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function deISO(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia ?? 1);
}

export const hoy = () => aISO(new Date());
export const ayer = () => aISO(new Date(Date.now() - 864e5));
export const mesActual = () => hoy().slice(0, 7);
export const mesDe = (iso) => iso.slice(0, 7);

export function sumarMeses(mes, n) {
  const fecha = deISO(`${mes}-01`);
  fecha.setMonth(fecha.getMonth() + n);
  return aISO(fecha).slice(0, 7);
}

export function nombreMes(mes, { conAnio = true } = {}) {
  const [anio, numero] = mes.split('-').map(Number);
  const nombre = MESES[numero - 1];
  return conAnio && String(anio) !== mesActual().slice(0, 4) ? `${nombre} ${anio}` : nombre;
}

export const nombreMesSolo = (mes) => MESES[Number(mes.slice(5, 7)) - 1];

export function diasDelMes(mes) {
  const [anio, numero] = mes.split('-').map(Number);
  return new Date(anio, numero, 0).getDate();
}

/** Lunes = 0, para armar la grilla del calendario. */
export function primerDiaSemana(mes) {
  return (deISO(`${mes}-01`).getDay() + 6) % 7;
}

/** "sábado 3" */
export function diaLargo(iso) {
  const fecha = deISO(iso);
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()}`;
}

/** "3 oct" */
export function diaCorto(iso) {
  const fecha = deISO(iso);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}`;
}

/** Días entre hoy y la fecha: negativo si ya pasó. */
export function diasHasta(iso) {
  return Math.round((deISO(iso) - deISO(hoy())) / 864e5);
}

export function cuandoVence(iso) {
  const dias = diasHasta(iso);
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'vence mañana';
  if (dias === -1) return 'venció ayer';
  if (dias < 0) return `venció hace ${-dias} días`;
  if (dias <= 7) return `vence en ${dias} días`;
  return `vence el ${diaCorto(iso)}`;
}

/** Día de hoy y días del mes si `mes` es el actual; null para meses pasados o futuros. */
export function avanceDelMes(mes) {
  return mes === mesActual() ? { dia: Number(hoy().slice(8)), dias: diasDelMes(mes) } : null;
}
