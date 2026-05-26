export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="0.5" y="0.5" width="21" height="21" rx="5" fill="currentColor" />
        <circle cx="7" cy="7" r="2" fill="white" />
        <circle cx="15" cy="15" r="2" fill="white" />
        <circle cx="15" cy="7" r="1.2" fill="white" fillOpacity="0.55" />
        <circle cx="7" cy="15" r="1.2" fill="white" fillOpacity="0.55" />
        <path d="M7 7 L15 15" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M15 7 L7 15" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-[15px] font-bold tracking-tight">MetaDiff</div>
      </div>
    </div>
  );
}
