import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "whatsapp";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  loading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger:
      "inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50",
    whatsapp:
      "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#20bd5a] disabled:opacity-50",
  };

  return (
    <button
      className={`${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
