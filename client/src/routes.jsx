import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { MyDocuments } from './pages/MyDocuments';
import { DocumentPreview } from './pages/DocumentPreview';
import { Upload } from './pages/Upload';
import { Categories } from './pages/Categories';
import { Storage } from './pages/Storage';
import { SearchResults } from './pages/SearchResults';
import { Activity } from './pages/Activity';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  // Public Authentication Routes
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },

  // Authenticated Application Routes
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'documents',
        element: <MyDocuments />,
      },
      {
        path: 'documents/:id/preview',
        element: <DocumentPreview />,
      },
      {
        path: 'upload',
        element: <Upload />,
      },
      {
        path: 'categories',
        element: <Categories />,
      },
      {
        path: 'storage',
        element: <Storage />,
      },
      {
        path: 'search',
        element: <SearchResults />,
      },
      {
        path: 'activity',
        element: <Activity />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },

  // Fallback Catch-all
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
