import { createContext, useContext } from 'react';

export const SesionContexto = createContext(null);
export const AppContexto = createContext(null);

/** { usuario, ingresar, registrar, salir } */
export const useSesion = () => useContext(SesionContexto);

/** { mes, setMes, version, refrescar, abrirCarga, avisar } */
export const useApp = () => useContext(AppContexto);
