import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Dropdown } from '../common/Dropdown';
import { MobileDrawer } from './MobileDrawer';

function getUserInitials(user) {
  const rawName = (user?.fullName || user?.name || '').trim();
  if (!rawName) return 'ST';
  const parts = rawName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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

  const displayName = user?.fullName || user?.name || 'Student';
  const initials = getUserInitials(user);

  // Auto-focus input when search opens
  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
    return () => clearTimeout(timer);
  }, [isSearchOpen]);

  // Close on Escape or outside click; toggle on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (
        isSearchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target) &&
        !searchQuery.trim()
      ) {
        setIsSearchOpen(false);
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
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsSearchOpen(false);
  };

  const userMenuItems = [
    {
      label: `Signed in as ${displayName}`,
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
      <header className="h-18 fixed top-0 inset-x-0 z-40 h-16 bg-white/55 dark:bg-neutral-950/50 backdrop-blur-2xl backdrop-saturate-150 border-b border-black/10 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45)] transition-colors">
        <div className="h-full w-full max-w-[1720px] mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] gap-2.5 lg:gap-4">
          {/* Left: Brand Lockup */}
          <div className="flex items-center justify-start min-w-0">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 group shrink-0 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-white text-on-primary flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md transition-transform group-hover:scale-[1.03]">
                <span className="material-symbols-outlined text-[18px]">shield_locked</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-headline-sm text-sm font-bold tracking-tight text-on-surface">
                  CloudVault
                </span>
                <span className="font-micro-caption text-[9px] uppercase tracking-widest text-on-surface-variant mt-0.5 hidden sm:block">
                  STUDENT VAULT
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Always Centered on Desktop; adjusts/collapses cleanly below lg */}
          <div className="hidden lg:flex items-center justify-center">
            {!isSearchOpen ? (
              <nav
                aria-label="Primary navigation"
                className="flex items-center gap-0.5 bg-white/45 dark:bg-white/[0.05] backdrop-blur-xl p-1 rounded-full border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0"
              >
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-primary text-on-primary shadow-[0_2px_10px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-black/[0.04] dark:hover:bg-white/[0.07]'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            ) : (
              <form
                ref={searchContainerRef}
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-72 xl:w-96 shrink-0"
              >
                <span className="material-symbols-outlined absolute left-3 text-[16px] text-on-surface-variant pointer-events-none">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search vault (Esc to close)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-7 rounded-full bg-white/65 dark:bg-white/[0.07] backdrop-blur-xl text-on-surface text-xs placeholder:text-on-surface-variant/80 focus:outline-none focus:bg-white/85 dark:focus:bg-white/[0.11] focus:ring-1 focus:ring-primary/60 border border-black/10 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Close search (Esc)"
                  aria-label="Close search"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Search (on <lg or closed), Notifications, Theme, Upload, Profile & Mobile Menu */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* Compact search button on <lg when open or anywhere when closed */}
            {(!isSearchOpen || typeof window !== 'undefined') && (
              <div className={isSearchOpen ? 'lg:hidden' : ''}>
                {!isSearchOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="h-9 w-9 rounded-full bg-white/50 dark:bg-white/[0.06] hover:bg-white/75 dark:hover:bg-white/[0.12] backdrop-blur-lg text-on-surface flex items-center justify-center transition-all border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0"
                    title="Search vault (Ctrl+K)"
                    aria-label="Open search bar"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </button>
                ) : (
                  <form
                    ref={searchContainerRef}
                    onSubmit={handleSearchSubmit}
                    className="relative flex items-center w-36 sm:w-52 md:w-60 shrink-0"
                  >
                    <span className="material-symbols-outlined absolute left-2.5 text-[15px] text-on-surface-variant pointer-events-none">
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-7 pr-6 rounded-full bg-white/65 dark:bg-white/[0.07] backdrop-blur-xl text-on-surface text-xs placeholder:text-on-surface-variant/80 focus:outline-none focus:bg-white/85 dark:focus:bg-white/[0.11] focus:ring-1 focus:ring-primary/60 border border-black/10 dark:border-white/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="absolute right-1 w-5 h-5 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Close search (Esc)"
                      aria-label="Close search"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Notifications / Activity */}
            <Link
              to="/activity"
              className="h-9 w-9 rounded-full bg-white/50 dark:bg-white/[0.06] hover:bg-white/75 dark:hover:bg-white/[0.12] backdrop-blur-lg text-on-surface flex items-center justify-center relative transition-all border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0"
              title="Notifications & Activity"
              aria-label="Notifications and Activity"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent-emerald ring-2 ring-white/80 dark:ring-neutral-900" />
            </Link>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full bg-white/50 dark:bg-white/[0.06] hover:bg-white/75 dark:hover:bg-white/[0.12] backdrop-blur-lg text-on-surface flex items-center justify-center transition-all border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Primary Upload CTA */}
            {/* <Link
              to="/upload"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-2xs hover:opacity-95 transition-all whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
              <span>Upload</span>
            </Link> */}

            {/* User Profile Dropdown */}
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 h-9 p-1 pl-1.5 sm:pr-2.5 rounded-full bg-white/50 dark:bg-white/[0.06] hover:bg-white/75 dark:hover:bg-white/[0.12] backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all shrink-0"
                >
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                    {initials}
                  </div>
                  <span className="hidden xl:inline-block text-xs font-medium text-on-surface max-w-[110px] truncate">
                    {displayName}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant hidden sm:inline-block">
                    expand_more
                  </span>
                </button>
              }
              items={userMenuItems}
            />

            {/* Mobile Hamburger Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden h-9 w-9 rounded-full bg-white/50 dark:bg-white/[0.06] hover:bg-white/75 dark:hover:bg-white/[0.12] backdrop-blur-lg border border-black/10 dark:border-white/10 text-on-surface flex items-center justify-center transition-all shrink-0"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
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