export const formatAmount = (value) => {
  if (value === null || value === undefined || value === '') return '';
  
  // Si el valor viene del backend es un Number (ej: 1000.50). 
  // Convertimos el punto a coma antes de procesar como string.
  if (typeof value === 'number') {
    value = value.toString().replace('.', ',');
  }
  
  let val = value.toString();
  
  // 1. Eliminar puntos de miles existentes
  val = val.replace(/\./g, '');
  
  // 2. Dividir por la coma decimal
  let parts = val.split(',');
  let integerPart = parts[0].replace(/\D/g, ''); // Solo números fijos
  let decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, '').substring(0, 2) : null;
  
  if (!integerPart && decimalPart === null) return '';
  if (!integerPart) integerPart = '0';
  
  // 3. Formatear la parte entera con puntos de miles
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // 4. Reconstruir incluyendo los decimales si el usuario tecleó una coma
  if (decimalPart !== null) {
    return `${integerPart},${decimalPart}`;
  }
  
  return integerPart;
};

/**
 * Limpia un string formateado para obtener el valor numérico puro.
 * @param {string} formattedValue - El valor con puntos y coma.
 * @returns {string} - El valor numérico listo para parseFloat (ej: "1234.56").
 */
export const cleanAmount = (formattedValue) => {
  if (!formattedValue) return '';
  let val = formattedValue.toString();
  
  // Quitar puntos de miles
  val = val.replace(/\./g, '');
  // Reemplazar la coma decimal por punto, que es el que entiende JavaScript backend
  val = val.replace(/,/g, '.');
  
  // Limpiar cualquier otra cosa que no sea número o punto
  return val.replace(/[^\d.]/g, '');
};
