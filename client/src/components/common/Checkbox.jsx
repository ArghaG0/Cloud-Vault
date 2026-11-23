import { cn } from '../../utils/cn';

export function Checkbox({
  checked = false,
  onChange,
  label,
  description,
  id,
  className = '',
  disabled = false,
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex items-start gap-2.5 select-none cursor-pointer group',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className="w-4 h-4 rounded border border-outline/70 bg-surface-container-lowest peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
          {checked && (
            <span className="material-symbols-outlined text-on-primary text-[14px] font-bold">
              check
            </span>
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">
              {label}
            </span>
          )}
          {description && (
            <span className="font-micro-caption text-on-surface-variant">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
