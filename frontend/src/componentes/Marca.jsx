/** Logo (la hoja de libreta con el tilde) y el nombre subrayado a birome. */
export default function Marca({ grande = false }) {
  return (
    <span className={`marca${grande ? ' marca--grande' : ''}`}>
      <svg className="marca__logo" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="var(--birome)" />
        <rect x="14" y="14" width="36" height="36" rx="4" fill="var(--hoja)" />
        <path d="M14 24h36M14 32h36M14 40h36" stroke="var(--renglon)" strokeWidth="1.6" />
        <path d="M21 14v36" stroke="var(--margen)" strokeWidth="1.8" />
        <path d="M26 35l5 5 10-13" fill="none" stroke="var(--birome)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="marca__palabra">
        ahorro
        <svg className="marca__subrayado" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 5.5C20 2.5 45 2 62 3.6S90 6.2 98 3" fill="none" stroke="var(--birome)" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
