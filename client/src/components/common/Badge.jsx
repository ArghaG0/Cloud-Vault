import { cn } from '../../utils/cn';

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  pulse = false,
  className = '',
}) {
  const variants = {
    default: 'bg-surface-container text-on-surface-variant border border-border-subtle/60',
    primary: 'bg-primary text-on-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    error: 'bg-error/10 text-error border border-error/20',
    category: 'bg-surface-container-high text-on-surface border border-border-subtle',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-micro-caption tracking-wider',
    md: 'text-xs px-2.5 py-1 font-label-caps tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 font-body-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium select-none',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald"></span>
        </span>
      )}
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
