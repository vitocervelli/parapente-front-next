import type { CSSProperties } from "react";

type Props = {
  kicker?: string;
  title: string;
  script?: string;
  /** 'dark' = on photo/blue/navy (white caps + yellow script); 'light' = on white (ink caps + blue script) */
  tone?: "dark" | "light";
  align?: "center";
  print?: boolean;
  style?: CSSProperties;
};

export function SectionHeading({ kicker, title, script, tone = "dark", align, print, style }: Props) {
  const classes = [
    "pbv-sh",
    tone === "dark" ? "pbv-sh--dark" : "pbv-sh--light",
    align === "center" ? "pbv-sh--center" : "",
    print ? "pbv-sh--print" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={style}>
      {kicker && <span className="pbv-sh__kicker">{kicker}</span>}
      <h2 className="pbv-sh__title">{title}</h2>
      {script && <span className="pbv-sh__script">{script}</span>}
    </div>
  );
}
