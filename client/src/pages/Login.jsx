import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';

export function Login() {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('alex.rivera@campus.edu');
  const [password, setPassword] = useState('VaultKeySecurePass');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email, password);
      success('Vault authorized successfully');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      setErrorMessage(err?.message || 'Authentication failed');
      toastError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full bg-card-surface rounded-2xl shadow-xl p-8 border border-border-subtle relative flex flex-col animate-fade-in">
        {/* Title Header */}
        <div className="text-center mb-6">
          <h1 className="font-headline-sm text-lg font-semibold text-on-surface">
            Welcome back to CloudVault
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            Access your academic repository, lecture notes, and encrypted cloud storage.
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-DEFAULT bg-surface-container-low mb-6 border border-border-subtle/60">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
          </span>
          <p className="font-mono-metric text-[11px] text-on-surface-variant">
            Campus SSO active • Amazon S3 KMS encryption enabled
          </p>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-DEFAULT bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="INSTITUTIONAL EMAIL"
            sublabel=".EDU VERIFIED"
            icon="school"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex.rivera@campus.edu"
            required
          />

          <Input
            label="MASTER PASSCODE"
            sublabel="KMS 256"
            icon="key"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
          />

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              checked={rememberMe}
              onChange={setRememberMe}
              label="Keep unlocked for 30 days"
            />
            <Link
              to="/forgot-password"
              className="font-body-sm text-xs font-semibold text-on-surface hover:opacity-75 transition-opacity"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            icon="arrow_forward"
            iconPosition="right"
            className="w-full mt-2 font-semibold shadow-md"
          >
            Sign In to CloudVault
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full h-px bg-surface-container-highest" />
          <span className="absolute px-3 bg-card-surface font-micro-caption text-secondary uppercase tracking-widest text-[9px]">
            or academic bridge
          </span>
        </div>

        {/* SSO Button */}
        <button
          type="button"
          onClick={() => {
            setEmail('alex.rivera@campus.edu');
            setPassword('VaultKeySecurePass');
            handleSubmit({ preventDefault: () => {} });
          }}
          className="w-full py-2.5 px-4 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm text-xs font-medium flex items-center justify-center gap-2 border border-border-subtle/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">
            account_balance
          </span>
          <span>Continue with Campus SSO / Portal</span>
        </button>

        {/* Registration Footer */}
        <div className="mt-6 pt-5 bg-surface-container-low/60 -mx-8 -mb-8 p-4 rounded-b-2xl flex items-center justify-center text-center border-t border-border-subtle/50">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Don't have an academic vault?{' '}
            <Link to="/register" className="font-semibold text-on-surface hover:underline ml-1">
              Create Student Account
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
