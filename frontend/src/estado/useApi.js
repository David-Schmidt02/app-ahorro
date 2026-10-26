import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useApp } from './contextos';

/**
 * GET que se vuelve a pedir cuando cambia la ruta o cuando algo se guarda (refrescar).
 * Al cambiar de ruta los datos viejos no se muestran; al refrescar sí, para no parpadear.
 */
export function useApi(ruta) {
  const { version } = useApp();
  const [estado, setEstado] = useState({ ruta: null, datos: null, error: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!ruta) return undefined;
    let vigente = true;
    api(ruta)
      .then((datos) => vigente && setEstado({ ruta, datos, error: null }))
      .catch((error) => vigente && setEstado((previo) => ({ ruta, datos: previo.ruta === ruta ? previo.datos : null, error })));
    return () => {
      vigente = false;
    };
  }, [ruta, version, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  const vigente = estado.ruta === ruta;
  return {
    datos: vigente ? estado.datos : null,
    error: vigente ? estado.error : null,
    cargando: !vigente,
    reintentar,
  };
}
