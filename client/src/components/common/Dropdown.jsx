import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

/**
 * Dropdown menu rendered via a React Portal into document.body so it is
 * never clipped by overflow-hidden or overflow-x-auto table/card wrappers.
 */
export function Dropdown({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const estimatedMenuHeight = Math.min(items.length * 36 + 20, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    const style = {
      position: 'fixed',
      zIndex: 9999,
      ...(openUpward
        ? { bottom: `${window.innerHeight - rect.top + 8}px` }
        : { top: `${rect.bottom + 8}px` }),
      ...(align === 'right'
        ? { right: `${Math.max(8, window.innerWidth - rect.right)}px` }
        : { left: `${Math.max(8, rect.left)}px` }),
    };
    setMenuStyle(style);
  }, [align, items.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      const insideTrigger = containerRef.current?.contains(event.target);
      const insideMenu = menuRef.current?.contains(event.target);
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={handleToggle}>{trigger}</div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className={cn(
              'min-w-[180px] rounded-DEFAULT bg-card-surface border border-border-subtle p-1.5 shadow-card animate-zoom-in-95',
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
          </div>,
          document.body
        )}
    </div>
  );
}
