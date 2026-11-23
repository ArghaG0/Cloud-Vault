import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function MobileDrawer({ isOpen, onClose, links = [] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative ml-auto w-full max-w-xs bg-card-surface border-l border-border-subtle h-full p-6 flex flex-col justify-between shadow-modal animate-zoom-in-95 z-10">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[16px]">shield_locked</span>
              </div>
              <span className="font-headline-sm text-sm font-semibold text-on-surface">CloudVault</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-DEFAULT text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface hover:bg-panel-surface'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="flex flex-col gap-3 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'AR'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface">{user?.name}</span>
              <span className="font-mono text-[10px] text-secondary">{user?.studentId}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-full border border-error/30 text-error hover:bg-error/10 text-xs font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
