import { useEffect, useState } from 'react';

const CLAVE = 'ahorro.tema';
export const TEMAS = [
  { valor: 'sistema', nombre: 'Sistema', icono: 'sistema' },
  { valor: 'claro', nombre: 'Claro', icono: 'claro' },
  { valor: 'oscuro', nombre: 'Oscuro', icono: 'oscuro' },
];

const oscuroDelSistema = window.matchMedia('(prefers-color-scheme: dark)');

function leer() {
  try {
    return localStorage.getItem(CLAVE) || 'sistema';
  } catch {
    return 'sistema';
  }
}

/** Pone data-theme en <html>; "sistema" sigue la preferencia del dispositivo. index.html hace lo mismo antes de pintar. */
function aplicar(preferencia) {
  const oscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && oscuroDelSistema.matches);
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0e1522' : '#eef2f5');
}

// Con "sistema", acompaña los cambios del dispositivo en cualquier pantalla
oscuroDelSistema.addEventListener('change', () => leer() === 'sistema' && aplicar('sistema'));

export function useTema() {
  const [tema, setTema] = useState(leer);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // Sin storage el tema dura lo que la pestaña
    }
    aplicar(tema);
  }, [tema]);

  return [tema, setTema];
}
