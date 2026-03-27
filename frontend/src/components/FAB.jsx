import React from 'react';

/**
 * Floating Action Button — aparece fijo en la esquina inferior derecha en mobile.
 * Props:
 *   onClick   – handler
 *   icon      – JSX del ícono (ej: <AddIcon />)
 *   title     – tooltip
 *   disabled  – boolean
 *   color     – 'primary' (default) | 'success'
 */
const GRADIENTS = {
  primary: 'linear-gradient(135deg, #ff719a, #be123c)',
  success: 'linear-gradient(135deg, #10b981, #059669)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  info:    'linear-gradient(135deg, #38bdf8, #0284c7)',
};

const FAB = ({ onClick, icon, title, disabled = false, color = 'primary', animKey, glowColor }) => {
  const bg = GRADIENTS[color] || GRADIENTS.primary;

  return (
    <button
      className="fab"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ background: bg, '--fab-glow': glowColor }}
    >
      <span key={animKey} className="fab-icon-anim">{icon}</span>
    </button>
  );
};

export default FAB;
