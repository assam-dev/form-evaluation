// Shared form styles. The global button style in globals.css makes every <button>
// teal; these classes create the secondary and delete button looks on top of it.
export const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";
export const primaryButton = "rounded-lg px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "rounded-lg border border-[var(--colorPrimary)] !bg-white px-4 py-2.5 text-sm !text-[var(--colorPrimary)] hover:!bg-[var(--colorPrimaryLight)] disabled:cursor-not-allowed disabled:opacity-50";
export const dangerButton = "rounded-lg !bg-transparent px-3 py-1.5 text-sm !text-red-700 hover:!bg-red-50";

export default function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="mb-4 block text-sm text-slate-600">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} required={required} />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
