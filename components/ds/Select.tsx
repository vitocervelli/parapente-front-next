import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: string[];
};

export function Select({ label, options, ...rest }: Props) {
  return (
    <label className="pbv-select">
      {label && <span className="pbv-field__label">{label}</span>}
      <select {...rest}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pbv-select__chev" />
    </label>
  );
}
