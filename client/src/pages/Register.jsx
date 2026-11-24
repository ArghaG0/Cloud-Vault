import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';

const DEPARTMENT_OPTIONS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Data Science & Artificial Intelligence',
  'Biotechnology',
  'Business Administration',
  'Other',
];

const SEMESTER_OPTIONS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
];

export function Register() {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [academicEmail, setAcademicEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [honorCode, setHonorCode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resolvedDepartment =
    department === 'Other' ? customDepartment.trim() : department.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!resolvedDepartment) {
      setErrorMessage(
        department === 'Other'
          ? 'Please enter your department name.'
          : 'Please select your academic department.'
      );
      return;
    }
    if (!semester) {
      setErrorMessage('Please select your current semester.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
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
        fullName,
        email: academicEmail,
        password,
        studentId,
        department: resolvedDepartment,
        semester,
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

  const initials = fullName.trim()
    ? fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'ST';

  return (
    <AuthLayout>
      <div className="w-full min-w-[550px]  max-w-[600px] bg-card-surface rounded-2xl shadow-xl overflow-hidden border border-border-subtle relative flex flex-col animate-fade-in">
        {/* Top Accent Strip */}
        <div className="h-1 w-full bg-primary/90" />

        <div className="p-6 sm:p-8 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-3.5 mb-4 border-b border-border-subtle">
            <div>
              <h1 className="font-headline-sm text-lg font-semibold tracking-tight text-on-surface">
                Create Student Account
              </h1>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Initialize your academic S3 cloud storage repository
              </p>
            </div>
            <span className="shrink-0 px-2.5 py-1 rounded-md bg-surface-container border border-border-subtle/70 text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider font-semibold">
              ACADEMIC TIER
            </span>
          </div>

          {/* Live Credential Preview Strip */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-surface-container-low mb-4 border border-border-subtle">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-xs tracking-wide shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">
                  {fullName.trim() || 'Student Name'}
                </p>
                <p className="font-mono text-[11px] text-on-surface-variant truncate mt-0.5">
                  {studentId.trim() || 'STU-XXXXX'}
                  {resolvedDepartment ? ` · ${resolvedDepartment}` : ''}
                  {semester ? ` · ${semester}` : ''}
                </p>
              </div>
            </div>
            <span className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold tracking-tight">
              10 GB S3 ALLOCATION
            </span>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-6  ">
            {/* Row 1: Identity */}
            <div className="flex w-full items-center justify-between gap-5">
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
                sublabel=""
                icon="badge"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="STU-84920"
                required
              />
            </div>

            {/* Row 2: Academic Program (Department + Semester side-by-side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Department Dropdown */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="department-select"
                    className="font-label-caps text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant"
                  >
                    DEPARTMENT <span className="text-error">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-on-surface-variant/80">
                    REQUIRED
                  </span>
                </div>

                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                    domain
                  </span>
                  <select
                    id="department-select"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (e.target.value !== 'Other') {
                        setCustomDepartment('');
                      }
                    }}
                    required
                    className="w-full h-10 pl-10 pr-8 rounded-none bg-surface-container-low border border-white/70 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer truncate"
                  >
                    <option value="" disabled>
                      Select department...
                    </option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute right-2.5 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Semester Dropdown */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="semester-select"
                    className="font-label-caps text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant"
                  >
                    SEMESTER <span className="text-error">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-on-surface-variant/80">
                    CURRENT
                  </span>
                </div>

                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                    calendar_today
                  </span>
                  <select
                    id="semester-select"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    required
                    className="w-full h-10 pl-10 pr-8 rounded-none bg-surface-container-low border border-white/70 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select semester...
                    </option>
                    {SEMESTER_OPTIONS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute right-2.5 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Conditional Custom Department Input when "Other" is selected */}
            {department === 'Other' && (
              <Input
                label="SPECIFY DEPARTMENT"
                sublabel="REQUIRED"
                icon="edit_note"
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                placeholder="Enter your department name"
                required
              />
            )}

            {/* Row 3: Institutional Email */}
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

            {/* Row 4: Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

            <div className="pt-0.5">
              <Checkbox
                checked={honorCode}
                onChange={setHonorCode}
                label="I accept the Academic Honor Code and AWS Storage Acceptable Use Policy"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2 border border-error/20">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon="arrow_forward"
              iconPosition="right"
              className="w-full font-semibold shadow-md"
            >
              Create Account & Initialize Vault
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-5 pt-4 bg-surface-container-low/70 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 flex items-center justify-center text-center border-t border-border-subtle/70">
            <p className="font-body-sm text-xs text-on-surface-variant">
              Already have an academic vault?{' '}
              <Link to="/login" className="font-semibold text-on-surface hover:underline ml-1">
                Sign In Instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}