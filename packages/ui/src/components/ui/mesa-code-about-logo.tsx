import { cn } from "@/components/lib/utils.js";

export function MesaCodeAboutLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex aspect-square shrink-0 items-center justify-center rounded-[24%] bg-[#171717] font-sans text-[0.8em] font-extrabold leading-none tracking-[-0.08em] text-white",
        className,
      )}
      aria-hidden="true"
    >
      M
    </span>
  );
}

export function MesaCodeWordmarkLogo({ className }: { className?: string }) {
  return <img src="/logo/mesa-code-logo.svg" alt="Mesa Code" className={cn("shrink-0", className)} />;
}