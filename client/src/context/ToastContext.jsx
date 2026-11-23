import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map(toast => {
        let icon = 'info';
        let colorClasses = 'border-border-subtle bg-card-surface text-on-surface shadow-modal';

        if (toast.type === 'success') {
          icon = 'check_circle';
          colorClasses = 'border-emerald-500/30 bg-card-surface text-on-surface shadow-modal';
        } else if (toast.type === 'error') {
          icon = 'error';
          colorClasses = 'border-red-500/30 bg-card-surface text-on-surface shadow-modal';
        } else if (toast.type === 'warning') {
          icon = 'warning';
          colorClasses = 'border-amber-500/30 bg-card-surface text-on-surface shadow-modal';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-DEFAULT border ${colorClasses} animate-fade-in backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-[20px] ${
                toast.type === 'success' ? 'text-accent-emerald' : 
                toast.type === 'error' ? 'text-red-500' : 
                toast.type === 'warning' ? 'text-amber-500' : 'text-primary'
              }`}>
                {icon}
              </span>
              <span className="font-body-sm text-body-sm font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-panel-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
