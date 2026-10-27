/** Índice nuevo al moverse con flechas por una grilla de `columnas` (una lista es una grilla de 1 columna). */
export function moverEnGrilla(tecla, indice, total, columnas) {
  const pasos = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columnas, ArrowUp: -columnas };
  if (tecla === 'Home') return 0;
  if (tecla === 'End') return total - 1;
  if (!(tecla in pasos)) return null;
  return Math.min(total - 1, Math.max(0, indice + pasos[tecla]));
}

/** Un atajo global solo cuenta sin Ctrl/Meta, sin repetir y con el foco fuera de campos de texto y diálogos abiertos. */
export function esAtajo(e) {
  if (e.ctrlKey || e.metaKey || e.repeat || e.defaultPrevented) return false;
  const destino = e.target;
  if (destino.closest?.('input, textarea, select, [contenteditable="true"], dialog[open]')) return false;
  return !document.querySelector('dialog[open]');
}
