import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LoginIcon from '@mui/icons-material/Login';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import '../styles/auth.css'; // Estilos específicos de Auth

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      // Tras un login local se inserta el token y se redirrige.
      navigate('/');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Error de conexión con el servidor.");
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
             <LockOutlinedIcon className="auth-icon" fontSize="large" />
           </div>
           <h2>Buenas <span className="material-symbols-outlined heart-pulse" style={{ fontSize: '1.2em', verticalAlign: 'middle', color: '#e57373' }}>favorite</span></h2>
           <p className="text-secondary">Inicia sesión para gestionar tus ahorros</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
                type={showPassword ? "text" : "password"} 
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
                  padding: 0
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
            {isLoading ? 'Conectando...' : (
              <>
                Entrar <LoginIcon fontSize="small" />
              </>
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p className="text-muted">
            ¿No tenés cuenta? Create una bichito de luz <span className="material-symbols-outlined" style={{ fontSize: '1em', verticalAlign: 'middle', color: '#FFD600', filter: 'drop-shadow(0 0 4px #FFD600)' }}>lightbulb_2</span>{' '}
            <Link to="/register" className="auth-register-link">
              Registrate
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
