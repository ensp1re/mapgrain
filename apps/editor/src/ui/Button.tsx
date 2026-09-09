import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  ghost?: boolean;
  children: ReactNode;
}

export function Button({ primary, ghost, className, type = "button", children, ...props }: ButtonProps) {
  const classes = ["text-btn", primary ? "primary" : "", ghost ? "ghost" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
