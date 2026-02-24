import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import '../styles/auth.css';

const Register = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await register(nombre, email, password);
      navigate('/');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error de conexión con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">

        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <PersonAddOutlinedIcon className="auth-icon" fontSize="large" />
          </div>
          <h2>Crear cuenta</h2>
          <p className="text-secondary">Registrate para empezar a ahorrar</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Nombre</label>
            <div className="input-with-icon">
              <BadgeOutlinedIcon className="input-icon" />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Correo Electrónico</label>
            <div className="input-with-icon">
              <AccountCircleOutlinedIcon className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <LockOutlinedIcon className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : (
              <>
                Registrarse <PersonAddOutlinedIcon fontSize="small" />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-muted">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--accent-green)', textDecoration: 'none' }}>
              Iniciá sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
