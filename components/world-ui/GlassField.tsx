"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

/** A labelled input on dark glass with a gold focus glow (56px tall touch target). */
const GlassField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  /** Something at the end of the field, e.g. a show-password button. */
  trailing?: ReactNode;
}>(function GlassField({ label, icon, trailing, id, className = "", ...input }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="wui-label">{label}</label>
      <div className="wui-field">
        {icon && <span className="flex shrink-0 text-[#E8BC56]" aria-hidden="true">{icon}</span>}
        <input ref={ref} id={fieldId} {...input} />
        {trailing}
      </div>
    </div>
  );
});

export default GlassField;

/** Show / hide button for a password GlassField's `trailing` slot (44px target). */
export function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? "Hide code" : "Show code"} aria-pressed={shown}
      className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#FFF7E0]/60 transition hover:text-[#FFF7E0]">
      {shown ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}
