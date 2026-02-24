import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async (token) => {
    try {
      const response = await api.get('/auth/me');
      setUser({ token, nombre: response.data.nombre, email: response.data.email });
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      const me = await api.get('/auth/me');
      setUser({ token: access_token, nombre: me.data.nombre, email: me.data.email });
      return true;
    } catch (error) {
      throw error;
    }
  };

  const register = async (nombre, email, password) => {
    try {
      await api.post('/auth/register', { nombre, email, password });
      await login(email, password);
      return true;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
        {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
