/**
 * Botón de acción abstracto para desktop
 * Reutilizable en: Nuevo Objetivo, Nuevo Gasto, Guardar Horario, Nueva Propiedad
 */
export default function ActionButton({
  label,
  Icon,
  onClick,
  disabled = false,
  isLoading = false,
  variant = 'primary'
}) {
  const variantClass = `btn-${variant}`;

  return (
    <button
      className={variantClass}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        whiteSpace: 'nowrap'
      }}
      title={label}
    >
      <Icon fontSize="small" />
      {isLoading ? 'Guardando...' : label}
    </button>
  );
}
