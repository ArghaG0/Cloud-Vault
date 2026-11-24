import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col transition-colors duration-150">
      <AppHeader />
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 pt-28 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
