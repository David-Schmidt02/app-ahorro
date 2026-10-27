import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ProveedorSesion from './estado/ProveedorSesion';
import './estado/tema';
import './estilos.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProveedorSesion>
      <App />
    </ProveedorSesion>
  </StrictMode>,
);
