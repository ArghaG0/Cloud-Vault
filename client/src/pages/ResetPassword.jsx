import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';

export function ResetPassword() {
  const { success } = useToast();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [flushSessions, setFlushSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      success('Passcode updated successfully. Please sign in with your new credentials.');
      navigate('/login');
    }, 600);
  };

  return (
    <AuthLayout>
      <div className="w-full bg-card-surface rounded-2xl shadow-xl p-8 border border-border-subtle relative flex flex-col animate-fade-in">
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-primary">
            <span className="material-symbols-outlined text-[20px]">cloud_done</span>
          </div>
          <h1 className="font-headline-sm text-lg font-semibold text-on-surface">
            Create new password
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            Recovery token verified. Choose a strong master passcode for your academic vault.
          </p>
        </div>

        {/* Token Verification Card */}
        <div className="flex items-center justify-between p-3 rounded-DEFAULT bg-surface-container-low mb-4 border border-border-subtle/80">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-emerald text-[18px]">verified</span>
            <span className="font-mono-metric text-[11px] text-on-surface">
              KMS Token: tk_98a7f1...
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-accent-emerald/10 text-accent-emerald font-micro-caption font-bold">
            VALID
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-DEFAULT bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="NEW MASTER PASSCODE"
            icon="key"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••••••"
            required
          />

          <Input
            label="CONFIRM NEW PASSCODE"
            icon="key"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            required
          />

          <div className="pt-1">
            <Checkbox
              checked={flushSessions}
              onChange={setFlushSessions}
              label="Sign out of all other active campus workstations and devices"
            />
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
            Update Password & Return to Login
          </Button>
        </form>

        <div className="mt-6 pt-4 bg-surface-container-low/60 -mx-8 -mb-8 p-4 rounded-b-2xl flex items-center justify-center text-center border-t border-border-subtle/50">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface hover:opacity-75 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Cancel and return to Sign In</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
