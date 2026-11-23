import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col transition-colors duration-150">
      <AppHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-margin pt-24 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
