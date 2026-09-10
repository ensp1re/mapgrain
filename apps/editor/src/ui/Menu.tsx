import type { ButtonHTMLAttributes, ReactNode } from "react";

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  children: ReactNode;
}

export function MenuItem({ icon, shortcut, danger, className, children, ...props }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={["menu-item", danger ? "is-danger" : "", className ?? ""].filter(Boolean).join(" ")}
      {...props}
    >
      <span className="menu-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="menu-label">{children}</span>
      {shortcut ? <span className="menu-extra">{shortcut}</span> : <span className="menu-extra" />}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="menu-sep" role="separator" />;
}
