import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  ghost?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { primary, ghost, className, type = "button", children, ...props },
  ref,
) {
  const classes = ["text-btn", primary ? "primary" : "", ghost ? "ghost" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});
