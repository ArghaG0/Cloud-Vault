import { cn } from '../../utils/cn';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-container rounded-DEFAULT animate-pulse',
        className
      )}
      {...props}
    />
  );
}
