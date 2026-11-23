import { cn } from '../../utils/cn';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm',
    secondary: 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-border-subtle/80',
    outline: 'border border-border-subtle bg-transparent text-on-surface hover:bg-surface-container-low',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-panel-surface',
    destructive: 'bg-error/10 hover:bg-error/20 text-error border border-error/20',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-full gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-full gap-2',
    lg: 'text-base px-6 py-3.5 rounded-full gap-2.5',
    icon: 'p-2 rounded-full',
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      ) : (
        icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        )
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
    </button>
  );
}
