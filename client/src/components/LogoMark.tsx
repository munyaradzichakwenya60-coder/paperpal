export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#0b3452" />
      <path d="M18 12h20l10 10v28a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" fill="#fff" />
      <path d="M38 12l10 10H41a3 3 0 0 1-3-3z" fill="#b8c4cf" />
      <path d="M21 30h18M21 37h14" stroke="#0b3452" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 45l4 4 8-9" stroke="#c9a227" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
