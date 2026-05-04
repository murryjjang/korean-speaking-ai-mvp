"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-700 text-white hover:bg-primary-800 focus-visible:ring-primary-500 border border-primary-700",
  secondary:
    "bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 border border-slate-300",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 border border-transparent",
  danger:
    "bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500 border border-danger-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded",
  md: "px-4 py-2 text-sm rounded-md min-h-[44px]",
  lg: "px-6 py-2.5 text-base rounded-md min-h-[44px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center gap-2 font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
