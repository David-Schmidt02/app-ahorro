import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { jwtDecode } from 'jwt-decode';

const Navbar = () => {
  const { logout, user } = useAuth();
  const { dolarRate } = useCurrency();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let userName = '';
  const token = localStorage.getItem('token');
  if (token) {
      try {
          const decoded = jwtDecode(token);
          if (decoded.sub) {
              userName = decoded.sub.split('@')[0];
              userName = userName.charAt(0).toUpperCase() + userName.slice(1);
          }
      } catch (e) {
          console.error("Error decoding token for greeting in Navbar");
      }
  }

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          <AccountBalanceWalletIcon className="brand-icon" />
          <span className="text-gradient font-bold">App Ahorro</span>
        </Link>

        {user && (
          <div className="navbar-actions" style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
            {dolarRate && (
              <div className="dolar-widget glass-panel" title={`Cotización centralizada (Backend)`}>
                <span className="dolar-label">USD Blue</span>
                <span className="dolar-value">${dolarRate.toLocaleString()}</span>
              </div>
            )}
            <span style={{color: 'var(--text-secondary)', fontWeight: '500', fontSize: '1.1rem'}}>¡Hola, {userName}!</span>
            <button className="btn-icon" onClick={handleLogout} title="Cerrar Sessión">
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
