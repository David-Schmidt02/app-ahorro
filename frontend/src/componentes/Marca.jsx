/** Logo (el chanchito «savings» de Material Symbols) y el nombre subrayado a birome. */
export default function Marca({ grande = false }) {
  return (
    <span className={`marca${grande ? ' marca--grande' : ''}`}>
      <svg className="marca__logo" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="var(--birome)" />
        <svg x="14" y="14" width="36" height="36" viewBox="0 -960 960 960">
          <path fill="var(--hoja)" d="M640-520q17 0 28.5-11.5T680-560q0-17-11.5-28.5T640-600q-17 0-28.5 11.5T600-560q0 17 11.5 28.5T640-520ZM320-620h200v-60H320v60ZM180-120q-34-114-67-227.5T80-580q0-92 64-156t156-64h200q29-38 70.5-59t89.5-21q25 0 42.5 17.5T720-820q0 6-1.5 12t-3.5 11q-4 11-7.5 22.5T702-751l91 91h87v279l-113 37-67 224H480v-80h-80v80H180Zm45-60h115v-80h200v80h115l63-210 102-35v-175h-52L640-728q1-25 6.5-48.5T658-824q-38 10-72 29.5T534-740H300q-66.29 0-113.14 46.86Q140-646.29 140-580q0 103.16 29 201.58Q198-280 225-180Zm255-322Z" />
        </svg>
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
