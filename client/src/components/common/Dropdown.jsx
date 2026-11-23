import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export function Dropdown({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[180px] rounded-DEFAULT bg-card-surface border border-border-subtle p-1.5 shadow-card animate-zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="my-1 border-t border-border-subtle" />;
            }
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  item.onClick && item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-left transition-colors',
                  item.danger
                    ? 'text-error hover:bg-error/10'
                    : 'text-on-surface hover:bg-panel-surface',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {item.icon && (
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
