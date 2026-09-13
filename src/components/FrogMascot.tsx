// Maskot kodok yang "mengintip" dari atas kartu sisa budget. Warna solid, tanpa gradien.
export default function FrogMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 84" className={className} aria-hidden="true">
      <g stroke="#365314" strokeWidth="2.5" strokeLinejoin="round">
        {/* bola mata */}
        <circle cx="37" cy="26" r="17" fill="#84cc16" />
        <circle cx="83" cy="26" r="17" fill="#84cc16" />
        {/* kepala */}
        <ellipse cx="60" cy="54" rx="46" ry="27" fill="#84cc16" />
      </g>
      {/* mata */}
      <circle cx="37" cy="25" r="10" fill="#fff" stroke="#365314" strokeWidth="2" />
      <circle cx="83" cy="25" r="10" fill="#fff" stroke="#365314" strokeWidth="2" />
      <circle cx="39" cy="26" r="5" fill="#1a2e05" />
      <circle cx="81" cy="26" r="5" fill="#1a2e05" />
      <circle cx="40.5" cy="24" r="1.6" fill="#fff" />
      <circle cx="82.5" cy="24" r="1.6" fill="#fff" />
      {/* pipi & senyum */}
      <ellipse cx="30" cy="57" rx="7" ry="4" fill="#bef264" />
      <ellipse cx="90" cy="57" rx="7" ry="4" fill="#bef264" />
      <path d="M50 58q10 8 20 0" fill="none" stroke="#365314" strokeWidth="2.5" strokeLinecap="round" />
      {/* tangan bertumpu di tepi kartu */}
      <g fill="#84cc16" stroke="#365314" strokeWidth="2.5">
        <ellipse cx="32" cy="77" rx="13" ry="6.5" />
        <ellipse cx="88" cy="77" rx="13" ry="6.5" />
      </g>
    </svg>
  );
}
