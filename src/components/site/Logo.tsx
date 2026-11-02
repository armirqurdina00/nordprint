/**
 * NordPrint Studio logo: the NP monogram with the spaced wordmark, drawn after the logo on their Instagram.
 * Uses currentColor, so it works on light and dark backgrounds.
 * If an original logo file is uploaded in the CMS, that file is shown instead.
 */
export function NPMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 74 52" className={className} aria-hidden="true" fill="currentColor">
      {/* N: left stem, diagonal into the shared stem */}
      <rect x="0" y="2" width="7.5" height="48" />
      <polygon points="0,2 8.5,2 42.5,50 34,50" />
      {/* shared stem of N and P */}
      <rect x="35" y="2" width="7.5" height="48" />
      {/* P bowl */}
      <path d="M38.75 2 H56 a13.25 13.25 0 0 1 0 26.5 H38.75 v-7.5 H56 a5.75 5.75 0 0 0 0 -11.5 H38.75 Z" />
    </svg>
  );
}

export default function Logo({
  src,
  className = "",
  variant = "horizontal",
}: {
  src?: string;
  className?: string;
  variant?: "horizontal" | "stacked";
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="NordPrint Studio" className={`h-10 w-auto ${className}`} />;
  }
  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center ${className}`} role="img" aria-label="NordPrint Studio">
        <NPMark className="h-10 w-auto" />
        <span className="mt-2 font-logo text-[1.05rem] leading-none tracking-[0.24em]">NORDPRINT</span>
        <span className="mt-1.5 font-logo text-[0.55rem] leading-none tracking-[0.5em]">STUDIO</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label="NordPrint Studio">
      <NPMark className="h-7 w-auto" />
      <span className="flex flex-col items-center">
        <span className="font-logo text-[0.95rem] leading-none tracking-[0.22em]">NORDPRINT</span>
        <span className="mt-1 font-logo text-[0.5rem] leading-none tracking-[0.5em]">STUDIO</span>
      </span>
    </span>
  );
}
