import { useEffect, useRef, useState } from 'react';

/** Ancho en px del elemento, actualizado al redimensionar (para dibujar SVG sin escalar el texto). */
export function useAncho(inicial = 320) {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(inicial);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.round(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, ancho];
}
