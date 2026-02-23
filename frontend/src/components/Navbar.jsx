import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const Navbar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [dolar, setDolar] = useState(null);

  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const res = await axios.get('https://dolarapi.com/v1/dolares/blue');
        setDolar(res.data);
      } catch (e) {
        console.error("Error fetching dolar rate");
      }
    };
    fetchDolar();
    const interval = setInterval(fetchDolar, 300000); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

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
            {dolar && (
              <div className="dolar-widget glass-panel" title={`Venta: $${dolar.venta} | Compra: $${dolar.compra}`}>
                <span className="dolar-label">USD Blue</span>
                <span className="dolar-value">${dolar.venta}</span>
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
