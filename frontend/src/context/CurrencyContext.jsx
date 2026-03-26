import React, { createContext, useContext, useState } from 'react';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [dolarRate, setDolarRateState] = useState(() => {
    const saved = localStorage.getItem('dolarRate');
    return saved ? Number(saved) : null;
  });
  const [viewMoneda, setViewMoneda] = useState('ARS');

  const setDolarRate = (rate) => {
    if (rate && rate > 0) {
      setDolarRateState(rate);
      localStorage.setItem('dolarRate', rate);
    }
  };

  return (
    <CurrencyContext.Provider value={{ dolarRate, setDolarRate, viewMoneda, setViewMoneda }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
