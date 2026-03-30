/**
 * Contenedor genérico para secciones con estilo glass-panel
 */
export default function SectionContainer({ children, className = '' }) {
  return (
    <div className={`section-container glass-panel ${className}`}>
      {children}
    </div>
  );
}
