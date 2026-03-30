/**
 * Componente abstracto para headers de páginas
 * Reutilizable en todas las páginas/tabs
 */
export default function PageHeader({
  title,
  action = null
}) {
  return (
    <div className="dashboard-header">
      <h1>{title}</h1>
      {action}
    </div>
  );
}
