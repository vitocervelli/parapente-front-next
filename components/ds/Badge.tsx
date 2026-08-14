import type { ReactNode } from "react";

type Props = {
  variant?: "accent" | "blue" | "ink" | "outline";
  tilt?: boolean;
  children: ReactNode;
};

export function Badge({ variant = "accent", tilt, children }: Props) {
  return (
    <span className={`pbv-badge pbv-badge--${variant}${tilt ? " pbv-badge--tilt" : ""}`}>
      {children}
    </span>
  );
}
