import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Dropdown } from '../common/Dropdown';
import { MobileDrawer } from './MobileDrawer';

export function AppHeader() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navLinks = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Documents', to: '/documents' },
    { label: 'Categories', to: '/categories' },
    { label: 'Upload', to: '/upload' },
    { label: 'Backup & Storage', to: '/storage' },
    { label: 'Activity', to: '/activity' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const userMenuItems = [
    {
      label: 'Signed in as ' + (user?.name || 'Student'),
      disabled: true,
    },
    {
      label: user?.studentId || 'STU-84920',
      disabled: true,
    },
    { divider: true },
    {
      icon: 'person',
      label: 'Profile & Settings',
      onClick: () => navigate('/settings'),
    },
    {
      icon: 'sync_saved_locally',
      label: 'S3 Storage Preferences',
      onClick: () => navigate('/storage'),
    },
    { divider: true },
    {
      icon: 'logout',
      label: 'Sign Out of Vault',
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-surface-container-lowest/85 backdrop-blur-md border-b border-border-subtle shadow-subtle transition-colors">
        <div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-space-md">
          {/* Left Brand Lockup */}
          <div className="flex items-center gap-space-lg">
            <Link to="/dashboard" className="flex items-center gap-space-sm group">
              <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[18px]">shield_locked</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-sm font-semibold tracking-tight text-on-surface">
                  CloudVault
                </span>
                <span className="font-micro-caption text-[9px] uppercase tracking-wider text-on-surface-variant font-medium">
                  STUDENT INFRASTRUCTURE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Capsule */}
            <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-border-subtle/60">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Action Utilities */}
          <div className="flex items-center gap-2.5">
            {/* Quick Header Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex relative items-center">
              <span className="material-symbols-outlined absolute left-3 text-[16px] text-secondary pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Search vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 lg:w-56 pl-9 pr-3 py-1.5 rounded-full bg-panel-surface text-on-surface font-body-sm text-xs placeholder:text-secondary focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-border-subtle/80 transition-all"
              />
            </form>

            {/* Notification Bell */}
            <Link
              to="/activity"
              className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center relative transition-colors"
              title="Notifications & Activity"
            >
              <span className="material-symbols-outlined text-[19px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-emerald"></span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-[19px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Primary Action Button */}
            <Link
              to="/upload"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-body-sm text-xs font-semibold shadow-xs hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
              <span>Upload Document</span>
            </Link>

            {/* User Profile Pill & Dropdown */}
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-surface-container-low hover:bg-surface-container border border-border-subtle/60 transition-colors"
                >
                  <span className="hidden sm:inline-block font-body-sm text-xs font-medium text-on-surface">
                    {user?.name || 'Alex Rivera'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-[11px] font-bold">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'AR'}
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-secondary pr-0.5">
                    expand_more
                  </span>
                </button>
              }
              items={userMenuItems}
            />

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-panel-surface text-on-surface transition-colors"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-over Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks}
      />
    </>
  );
}
