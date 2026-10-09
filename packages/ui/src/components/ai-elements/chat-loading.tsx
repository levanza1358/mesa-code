"use client";

import type { ComponentPropsWithoutRef } from "react";
import { LoaderIcon } from "lucide-react";
import { cn } from "@/components/lib/utils.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";

export interface ChatLoadingProps extends ComponentPropsWithoutRef<"div"> {
  loading: boolean;
  size?: "default" | "sm";
  className?: string;
}

export function ChatLoading({ loading, size = "default", className, ...props }: ChatLoadingProps) {
  const { intl } = useMesaCodeIntl();

  if (!loading) {
    return null;
  }

  const sizeClasses = size === "sm" ? "size-4 text-ui-base" : "size-6";

  // React warns on mixed-case data attributes; HTML exposes these names in lowercase.
  return (
    <div
      aria-label={intl.formatMessage({ id: "common.loading" })}
      {...props}
      data-mesacode-chat-loading-animate="true"
      role="status"
      className={cn("flex items-center", className)}
    >
      <div className="flex size-4 items-center justify-center">
        <LoaderIcon
          aria-hidden="true"
          className={cn("animate-spin text-foreground-subtle", sizeClasses)}
        />
      </div>
    </div>
  );
}
