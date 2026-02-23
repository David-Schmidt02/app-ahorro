/**
 * Formatea un número o string numérico agregando puntos como separadores de miles.
 * @param {string|number} value - El valor a formatear.
 * @returns {string} - El valor formateado (ej: "1.234.567").
 */
export const formatAmount = (value) => {
  if (value === null || value === undefined || value === '') return '';
  
  // Limpiar cualquier carácter que no sea número
  let cleanValue = value.toString().replace(/\D/g, '');
  
  // Agregar puntos como separadores de miles
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Limpia un string formateado para obtener el valor numérico puro.
 * @param {string} formattedValue - El valor con puntos.
 * @returns {string} - El valor numérico (ej: "1234567").
 */
export const cleanAmount = (formattedValue) => {
  if (!formattedValue) return '';
  return formattedValue.toString().replace(/\./g, '');
};
