import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export function ForgotPassword() {
  const { success } = useToast();
  const [email, setEmail] = useState('alex.rivera@campus.edu');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      success('KMS recovery link dispatched to institutional email');
    }, 700);
  };

  return (
    <AuthLayout>
      <div className="w-full bg-card-surface rounded-2xl shadow-xl p-8 border border-border-subtle relative flex flex-col animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-primary">
            <span className="material-symbols-outlined text-[20px]">lock_reset</span>
          </div>
          <h1 className="font-headline-sm text-lg font-semibold text-on-surface">
            Reset your vault password
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
            Enter your registered academic email to receive a time-sensitive KMS recovery token.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center text-center p-6 bg-surface-container-low rounded-DEFAULT border border-border-subtle/80">
            <div className="w-12 h-12 rounded-full bg-accent-emerald/10 text-accent-emerald flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
            </div>
            <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
              Recovery Link Sent
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-1">
              We have dispatched a single-use token to <strong className="text-on-surface">{email}</strong>. Tokens expire in 15 minutes.
            </p>
            <Link
              to="/reset-password"
              className="mt-4 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              Simulate Opening Reset Link →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="INSTITUTIONAL EMAIL"
              sublabel=".EDU ADDRESS"
              icon="school"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.rivera@campus.edu"
              required
            />

            <div className="flex items-center gap-2 p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/60 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
              <p className="font-micro-caption text-[11px]">
                Tokens expire after 15 minutes and can only be used once for security compliance.
              </p>
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
              Send Recovery Link
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 bg-surface-container-low/60 -mx-8 -mb-8 p-4 rounded-b-2xl flex items-center justify-center text-center border-t border-border-subtle/50">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface hover:opacity-75 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">west</span>
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
