import { Link } from 'react-router-dom';

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background-base text-on-surface flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors selection:bg-secondary-container selection:text-on-surface">
      {/* Ambient Gradient Blur Backgrounds */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-gradient-to-tr from-surface-dim/40 via-surface-variant/30 to-surface-container/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 bg-surface-container-high/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Card Content */}
      <main className="w-full max-w-[500px] flex flex-col items-center z-10">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/login" className="flex flex-col items-center group">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md mb-3.5 transition-transform group-hover:scale-105 duration-200">
              <span className="material-symbols-outlined text-[24px]">shield_locked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-lg tracking-tight text-on-surface font-semibold">
                CloudVault
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-label-caps">
                STUDENT INFRASTRUCTURE
              </span>
            </div>
          </Link>
        </div>

        {/* Children View Card */}
        {children}

        {/* Security & Compliance Footer Strip */}
        <div className="flex items-center gap-2 mt-8 text-on-surface-variant font-mono-metric text-mono-metric">
          <span className="material-symbols-outlined text-[16px] text-secondary">encrypted</span>
          <span>Amazon S3 KMS 256-Bit Server-Side Encryption</span>
        </div>
        <div className="flex items-center gap-5 mt-2.5 font-micro-caption text-micro-caption text-secondary tracking-widest uppercase">
          <span>NODE STATUS: NORMAL</span>
          <span>•</span>
          <span>ACADEMIC INTEGRITY</span>
          <span>•</span>
          <span>CAMPUS IT DESK</span>
        </div>
      </main>
    </div>
  );
}
