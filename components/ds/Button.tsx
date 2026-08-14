import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "blue" | "outline" | "dark";
type Size = "sm" | "md" | "lg";

type Props = {
  variant?: Variant;
  size?: Size;
  href?: string;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  href,
  icon,
  children,
  disabled,
  onClick,
  type,
  className,
}: Props) {
  const classes = `pbv-btn pbv-btn--${variant} pbv-btn--${size}${className ? ` ${className}` : ""}`;

  if (href) {
    const external = /^https?:|^mailto:|^tel:/.test(href);
    if (external) {
      return (
        <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
          {children}
          {icon}
        </a>
      );
    }
    return (
      <Link className={classes} href={href}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type ?? "button"}>
      {children}
      {icon}
    </button>
  );
}
