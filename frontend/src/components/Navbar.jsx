import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import patitoIcon from '../assets/mascotas/icons/patito.svg';
import { MASCOTA_HABILITADA } from '../config/features';

const Navbar = () => {
  const { logout, user } = useAuth();
  const { dolarRate, viewMoneda, setViewMoneda } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const isGastos   = location.pathname === '/gastos';
  const isDetalle  = location.pathname.startsWith('/objetivo/');
  const isDashboard = location.pathname === '/';
  const isPropiedades = location.pathname === '/propiedades';
  const showToggle = isGastos || isDetalle || isDashboard || isPropiedades;
  const [patitoEnabled, setPatitoEnabled] = useState(localStorage.getItem('patito_enabled') !== 'false');
  const [navIcon, setNavIcon] = useState(patitoIcon);
  const [navRolling, setNavRolling] = useState(false);
  const [navKey, setNavKey] = useState(0);

  useEffect(() => {
    const handleStorage = () => setPatitoEnabled(localStorage.getItem('patito_enabled') !== 'false');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setNavIcon(e.detail.mascota.icon);
      setNavRolling(e.detail.isRolling);
      setNavKey(k => k + 1);
    };
    window.addEventListener('mascota:change', handler);
    return () => window.removeEventListener('mascota:change', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = user?.nombre || '';

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          <AccountBalanceWalletIcon className="brand-icon" />
          <span className="text-gradient font-bold">App Ahorro</span>
        </Link>
        {user && (
          <button className="btn-icon" onClick={handleLogout} title="Cerrar Sesión">
            <LogoutIcon />
          </button>
        )}
      </div>

      {/* Barra de utilidades: dolar + toggle + patito */}
      {user && (
        <div className="navbar-utility-bar">
          {dolarRate && (
            <div className="dolar-widget glass-panel" title="Cotización centralizada (Backend)">
              <span className="dolar-label">USD</span>
              <span className="dolar-value">${dolarRate.toLocaleString()}</span>
            </div>
          )}
          {showToggle && (
            <div className="moneda-toggle">
              {['ARS', 'USD'].map(m => (
                <button key={m} onClick={() => setViewMoneda(m)}
                  className={`moneda-toggle-btn${viewMoneda === m ? ' active' : ''}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
          {MASCOTA_HABILITADA && (
          <button
            className="btn-icon"
            onClick={() => {
              const current = localStorage.getItem('patito_enabled') !== 'false';
              localStorage.setItem('patito_enabled', !current);
              window.dispatchEvent(new Event('storage'));
            }}
            title={patitoEnabled ? 'Desactivar Mascota' : 'Activar Mascota'}
            style={{ opacity: patitoEnabled ? 1 : 0.4, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              key={navKey}
              src={navIcon}
              alt="mascota"
              width="32"
              height="32"
              className={`mascota-nav-icon${navRolling ? ' mascota-nav-rolling' : ''}${!patitoEnabled ? ' mascota-nav-disabled' : ''}`}
              style={{ objectFit: 'contain' }}
            />
          </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
