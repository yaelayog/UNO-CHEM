interface Props {
  /** Coret merah — mode "Mic Mati". */
  slash?: boolean;
  /** Label kecil "push" di bawah — mode "Push to Talk". */
  push?: boolean;
  className?: string;
}

/** Ikon mikrofon (garis), dengan varian coret-merah & label "push". */
export function IkonMic({ slash = false, push = false, className = '' }: Props) {
  return (
    <span
      className={`relative inline-flex flex-col items-center leading-none ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[1.15em] w-[1.15em]"
        aria-hidden="true"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <path d="M12 17v4" />
        <path d="M8.5 21h7" />
        {slash && (
          <line
            x1="3.5"
            y1="3"
            x2="20.5"
            y2="21"
            stroke="#e11d48"
            strokeWidth={2.5}
          />
        )}
      </svg>
      {push && (
        <span className="mt-[1px] text-[0.42em] font-black uppercase tracking-wider opacity-80">
          push
        </span>
      )}
    </span>
  );
}
