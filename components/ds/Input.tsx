import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type Common = {
  label?: string;
  hint?: string;
  error?: string;
  inverse?: boolean;
};

type Props =
  | (Common & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | (Common & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>);

export function Input({ label, hint, error, inverse, ...rest }: Props) {
  const classes = `pbv-field${error ? " pbv-field--error" : ""}${inverse ? " pbv-field--inverse" : ""}`;
  const { multiline, ...control } = rest as Props & { multiline?: boolean };

  return (
    <label className={classes}>
      {label && <span className="pbv-field__label">{label}</span>}
      {multiline ? (
        <textarea
          className="pbv-field__input pbv-field__input--textarea"
          {...(control as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className="pbv-field__input"
          {...(control as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {(error || hint) && <span className="pbv-field__hint">{error || hint}</span>}
    </label>
  );
}
