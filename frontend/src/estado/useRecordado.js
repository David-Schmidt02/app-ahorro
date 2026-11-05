import { useState } from 'react';

/** Elección guardada en el dispositivo (tipo de gráfico, período…). */
export function useRecordado(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      return localStorage.getItem(clave) ?? inicial;
    } catch {
      return inicial;
    }
  });
  const guardar = (nuevo) => {
    setValor(nuevo);
    try {
      localStorage.setItem(clave, nuevo);
    } catch {
      // sin almacenamiento: la elección dura lo que la pantalla
    }
  };
  return [valor, guardar];
}
