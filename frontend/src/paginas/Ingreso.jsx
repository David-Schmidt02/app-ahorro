import { useEffect, useState } from 'react';
import { useSesion } from '../estado/contextos';
import { api } from '../lib/api';

export default function Ingreso() {
  const { ingresar, registrar } = useSesion();
  const [modo, setModo] = useState('ingresar');
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api('/auth/estado')
      .then(({ registro_abierto: abierto }) => setRegistroAbierto(abierto))
      .catch(() => setRegistroAbierto(false));
  }, []);

  const esRegistro = modo === 'registro';

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (esRegistro) await registrar({ nombre: nombre.trim(), email, password });
      else await ingresar(email, password);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <main className="ingreso">
      <div className="ingreso__hoja">
        <img src="/icono.svg" alt="" width="56" height="56" />
        <h1>Ahorro</h1>
        <p className="tenue">Los gastos, los fijos y el ahorro de la casa, en una libreta compartida.</p>
        <form className="formulario" onSubmit={enviar}>
          {esRegistro && (
            <label className="campo">
              <span>Tu nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" required maxLength={60} />
            </label>
          )}
          <label className="campo">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              minLength={esRegistro ? 6 : undefined}
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="boton boton--principal boton--ancho" disabled={enviando}>
            {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>
        {registroAbierto && (
          <p className="tenue">
            {esRegistro ? '¿Ya tenés cuenta? ' : '¿Primera vez? '}
            <button type="button" className="enlace-boton" onClick={() => setModo(esRegistro ? 'ingresar' : 'registro')}>
              {esRegistro ? 'Ingresá' : 'Creá tu cuenta'}
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
