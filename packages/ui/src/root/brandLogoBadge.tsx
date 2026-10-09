import { cn } from "@/components/lib/utils.js";

/**
 * Brand logo badge shared by onboarding surfaces.
 *
 * This used to live in RootStartupLoading.tsx together with the startup splash.
 * The splash was removed, but onboarding still needs the badge, so it keeps its
 * own module.
 */
export function MesaCodeStartupLogoBadge({ animated = true }: { animated?: boolean }) {
  return (
    <div className="relative flex size-24 items-center justify-center rounded-3xl bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-xl/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-[rgba(255,255,255,0.1)] before:content-['']">
      <MesaCodeStartupLogo className="h-auto w-14" animated={animated} />
    </div>
  );
}

function MesaCodeStartupLogo({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="128"
      height="128"
      fill="none"
      viewBox="0 0 128 128"
      className={cn("shrink-0 text-current", className)}
      aria-hidden="true"
      focusable="false"
    >
      {animated ? (
        <animate
          attributeName="opacity"
          begin="3s"
          dur="1.8s"
          repeatCount="indefinite"
          values="1;0.4;1"
        />
      ) : null}
      <path fill="currentColor" d="M23 96V32h18l23 29 23-29h18v64H88V57L64 88 40 57v39H23Z" />
    </svg>
  );
}
