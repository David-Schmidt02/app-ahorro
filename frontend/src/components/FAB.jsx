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
const FAB = ({ onClick, icon, title, disabled = false, color = 'primary' }) => {
  const bg = color === 'success'
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : 'linear-gradient(135deg, var(--accent-primary), #be123c)';

  return (
    <button
      className="fab"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ background: bg }}
    >
      {icon}
    </button>
  );
};

export default FAB;
