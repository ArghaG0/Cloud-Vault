import { useState, useRef, useEffect } from 'react';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const navLinks = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Documents', to: '/documents' },
    { label: 'Categories', to: '/categories' },
    { label: 'Upload', to: '/upload' },
    { label: 'Backup & Storage', to: '/storage' },
    { label: 'Activity', to: '/activity' },
  ];

  // Auto-focus input when search input opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Close on Escape or click outside; toggle on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    const handleClickOutside = (e) => {
      if (
        isSearchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        if (!searchQuery.trim()) {
          setIsSearchOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
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
      <header className="fixed top-0 inset-x-0 z-40 bg-surface-container-lowest/90 dark:bg-card-surface/90 backdrop-blur-xl border-b border-border-subtle shadow-subtle transition-colors">
        <div className="h-20 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 flex items-center justify-between gap-3 lg:gap-6">
          {/* Left Brand Lockup & Desktop Navigation */}
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[20px]">shield_locked</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-sm font-bold tracking-tight text-on-surface">
                  CloudVault
                </span>
                <span className="font-micro-caption text-[9px] uppercase tracking-wider text-on-surface-variant font-medium">
                  STUDENT INFRASTRUCTURE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Capsule */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-surface-container-low p-1.5 rounded-full border border-border-subtle/80 shadow-xs shrink-0">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 xl:px-4 py-1.5 xl:py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
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
          <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 shrink-0">
            {/* Search Trigger or Expanded Tabular/Pill Input */}
            {!isSearchOpen ? (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-all border border-border-subtle/60 shrink-0"
                title="Search vault (Ctrl+K)"
                aria-label="Open search bar"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
            ) : (
              <form
                ref={searchContainerRef}
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-48 sm:w-56 md:w-64 lg:w-72 transition-all duration-200 animate-in fade-in shrink-0"
              >
                <span className="material-symbols-outlined absolute left-3.5 text-[17px] text-secondary pointer-events-none">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-full bg-panel-surface text-on-surface font-body-sm text-xs placeholder:text-secondary focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-border-subtle/80 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2 w-5 h-5 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
                  title="Close search (Esc)"
                  aria-label="Close search"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </form>
            )}

            {/* Notification Bell */}
            <Link
              to="/activity"
              className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center relative transition-colors border border-border-subtle/60 shrink-0"
              title="Notifications & Activity"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent-emerald ring-2 ring-card-surface"></span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors border border-border-subtle/60 shrink-0"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Primary Action Button - gracefully hides when search is open on screens below 2xl to prevent any overlap */}
            <Link
              to="/upload"
              className={`${
                isSearchOpen ? 'hidden 2xl:inline-flex' : 'hidden sm:inline-flex'
              } items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary font-body-sm text-xs font-semibold shadow-xs hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all whitespace-nowrap shrink-0`}
            >
              <span className="material-symbols-outlined text-[17px]">cloud_upload</span>
              <span>Upload Document</span>
            </Link>

            {/* User Profile Pill & Dropdown */}
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1 pl-1.5 sm:pl-3 rounded-full bg-surface-container-low hover:bg-surface-container border border-border-subtle/80 transition-colors shrink-0"
                >
                  <span
                    className={`${
                      isSearchOpen ? 'hidden 2xl:inline-block' : 'hidden xl:inline-block'
                    } font-body-sm text-xs font-semibold text-on-surface whitespace-nowrap`}
                  >
                    {user?.name || 'Alex Rivera'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-xs font-bold shadow-xs">
                    {user?.name ? user.name.split(' ').map((n) => n[0]).join('') : 'AR'}
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-secondary pr-1">
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
