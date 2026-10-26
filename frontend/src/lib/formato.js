const enteros = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const conDecimales = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$ 15.300" o "US$ 20"; muestra centavos solo si los hay. */
export function dinero(monto, moneda = 'ARS', { signo = false } = {}) {
  const valor = Math.abs(monto ?? 0);
  const numero = Number.isInteger(Math.round(valor * 100) / 100) ? enteros.format(valor) : conDecimales.format(valor);
  const prefijo = moneda === 'USD' ? 'US$' : '$';
  const menos = monto < 0 ? '−' : signo ? '+' : '';
  return `${menos}${prefijo}\u00a0${numero}`;
}

/** Interpreta lo que se tipea en Argentina: "1.500" = mil quinientos, "1500,50" = con centavos. */
export function parsearMonto(texto) {
  let limpio = String(texto ?? '').replace(/[\s$]/g, '');
  if (!limpio) return null;
  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  } else if ((limpio.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(limpio)) {
    limpio = limpio.replace(/\./g, '');
  }
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) / 100 : null;
}

/** Valor inicial de un campo de monto a partir de un número. */
export function montoATexto(monto) {
  if (monto === null || monto === undefined) return '';
  return Number.isInteger(monto) ? enteros.format(monto) : conDecimales.format(monto);
}
