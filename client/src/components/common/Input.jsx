import { useState } from 'react';
import { cn } from '../../utils/cn';

export function Input({
  label,
  sublabel,
  icon,
  type = 'text',
  error,
  helperText,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {(label || sublabel) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              {label}
            </label>
          )}
          {sublabel && (
            <span className="font-mono-metric text-mono-metric text-on-surface-variant">
              {sublabel}
            </span>
          )}
        </div>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-secondary pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={effectiveType}
          className={cn(
            'w-full py-2.5 px-4 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-secondary focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-border-subtle/80 transition-all',
            icon && 'pl-11',
            isPassword && 'pr-11',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-secondary hover:text-on-surface transition-colors p-1 rounded-full"
            aria-label="Toggle password visibility"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      {error && <span className="text-xs text-error font-medium">{error}</span>}
      {helperText && !error && (
        <span className="text-xs text-on-surface-variant">{helperText}</span>
      )}
    </div>
  );
}
