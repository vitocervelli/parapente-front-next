import type { ReactNode } from "react";

type Props = {
  tone?: "ink" | "blue" | "white" | "yellow";
  children: ReactNode;
};

export function Tag({ tone = "ink", children }: Props) {
  return <span className={`pbv-tag pbv-tag--${tone}`}>{children}</span>;
}
