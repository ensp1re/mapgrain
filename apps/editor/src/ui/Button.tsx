import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  children: ReactNode;
}

export function Button({ primary, className, type = "button", children, ...props }: ButtonProps) {
  const classes = ["text-btn", primary ? "primary" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
