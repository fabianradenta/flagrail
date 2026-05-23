import type { SVGProps } from "react";

type LogoProps = {
  variant?: "iconOnly" | "full";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: {
    icon: "h-8 w-8",
    text: "text-lg",
    gap: "gap-2",
  },
  md: {
    icon: "h-10 w-10",
    text: "text-xl",
    gap: "gap-2.5",
  },
  lg: {
    icon: "h-14 w-14",
    text: "text-2xl",
    gap: "gap-3",
  },
};

function FlagrailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Flagrail logo"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="48" height="48" rx="14" fill="#4C25FC" />

      {/* rail */}
      <path d="M0 31H48" stroke="white" strokeWidth="2" />

      {/* flag pole - intentionally offset like the original PNG */}
      <rect x="18" y="11" width="2" height="20" rx="0.6" fill="white" />

      {/* rail nodes */}
      <circle cx="10" cy="31" r="3" fill="white" />
      <circle cx="38" cy="31" r="3" fill="white" />

      {/* central hub */}
      <circle cx="24" cy="31" r="4.5" fill="white" />
      <circle cx="24" cy="31" r="3" fill="#4C25FC" />
      <circle cx="24" cy="31" r="1.5" fill="white" />

      {/* flag body - top */}
      <path
        d="
          M20 13
          H31.4
          Q32.6 13 31.9 14
          L28 18
          H20
          Z
        "
        fill="white"
      />

      {/* flag body - bottom */}
      <path
        d="
          M20 18
          H28
          L31.9 22
          Q32.6 23 31.4 23
          H20
          Z
        "
        fill="#EDE7FC"
      />

      {/* subtle flag fold */}
      <path d="M20 13L23.5 18L20 23V13Z" fill="#D4C8FB" />
    </svg>
  );
}

export function Logo({
  variant = "full",
  size = "md",
  className = "",
}: LogoProps) {
  const styles = sizeMap[size];

  return (
    <div className={`inline-flex items-center ${styles.gap} ${className}`}>
      <FlagrailIcon className={styles.icon} />

      {variant === "full" && (
        <span
          className={`font-semibold tracking-tight text-slate-950 ${styles.text}`}
        >
          Flagrail
        </span>
      )}
    </div>
  );
}