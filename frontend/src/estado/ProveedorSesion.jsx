import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, token } from '../lib/api';
import { SesionContexto } from './contextos';

export default function ProveedorSesion({ children }) {
  // undefined = verificando el token guardado; null = sin sesión
  const [usuario, setUsuario] = useState(() => (token.leer() ? undefined : null));

  useEffect(() => {
    if (usuario !== undefined) return;
    api('/auth/yo')
      .then(setUsuario)
      .catch(() => {
        token.guardar(null);
        setUsuario(null);
      });
  }, [usuario]);

  useEffect(() => {
    const vencida = () => {
      token.guardar(null);
      setUsuario(null);
    };
    window.addEventListener('ahorro:sesion-vencida', vencida);
    return () => window.removeEventListener('ahorro:sesion-vencida', vencida);
  }, []);

  const entrar = useCallback((sesion) => {
    token.guardar(sesion.token);
    setUsuario(sesion.usuario);
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      ingresar: async (email, password) => entrar(await api('/auth/login', { method: 'POST', body: { email, password } })),
      registrar: async (datos) => entrar(await api('/auth/registro', { method: 'POST', body: datos })),
      salir: () => {
        token.guardar(null);
        setUsuario(null);
      },
    }),
    [usuario, entrar],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}
