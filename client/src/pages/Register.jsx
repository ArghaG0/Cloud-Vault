import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';

export function Register() {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('Alex Rivera');
  const [studentId, setStudentId] = useState('STU-84920');
  const [academicEmail, setAcademicEmail] = useState('alex.rivera@campus.edu');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [honorCode, setHonorCode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!honorCode) {
      setErrorMessage('Please accept the Academic Honor Code to proceed.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: fullName,
        studentId,
        email: academicEmail,
      });
      success('Student Vault initialized successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      setErrorMessage(err?.message || 'Registration failed');
      toastError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[540px] bg-card-surface rounded-2xl shadow-xl p-8 border border-border-subtle relative flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
          <div>
            <h1 className="font-headline-sm text-lg font-semibold text-on-surface">
              Create Student Account
            </h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Initialize your academic S3 cloud storage repository
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider font-semibold">
            ACADEMIC TIER
          </span>
        </div>

        {/* Live Credential Preview Card */}
        <div className="flex items-center justify-between p-3.5 rounded-DEFAULT bg-surface-container-low mb-5 border border-border-subtle/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
              {fullName ? fullName.split(' ').map(n => n[0]).join('') : 'ST'}
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface">{fullName || 'Student Name'}</p>
              <p className="font-mono text-[10px] text-on-surface-variant">{studentId || 'STU-XXXXX'}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
            10 GB S3 ALLOCATION
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-DEFAULT bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="FULL LEGAL NAME"
              icon="person"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              required
            />
            <Input
              label="STUDENT IDENTIFIER"
              sublabel="CAMPUS ID"
              icon="badge"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="STU-84920"
              required
            />
          </div>

          <Input
            label="INSTITUTIONAL EMAIL"
            sublabel=".EDU DOMAIN"
            icon="mail"
            type="email"
            value={academicEmail}
            onChange={(e) => setAcademicEmail(e.target.value)}
            placeholder="alex.rivera@campus.edu"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="MASTER PASSCODE"
              icon="key"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <Input
              label="CONFIRM PASSCODE"
              icon="key"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="pt-1">
            <Checkbox
              checked={honorCode}
              onChange={setHonorCode}
              label="I accept the Academic Honor Code and AWS Storage Acceptable Use Policy"
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
            Create Account & Initialize Vault
          </Button>
        </form>

        <div className="mt-6 pt-4 bg-surface-container-low/60 -mx-8 -mb-8 p-4 rounded-b-2xl flex items-center justify-center text-center border-t border-border-subtle/50">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Already have an academic vault?{' '}
            <Link to="/login" className="font-semibold text-on-surface hover:underline ml-1">
              Sign In Instead
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
