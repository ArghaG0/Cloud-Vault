import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Checkbox } from '../components/common/Checkbox';

export function Settings() {
  const { user, updateUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile fields
  const [name, setName] = useState(user?.name || 'Alex Rivera');
  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering');
  const [semester, setSemester] = useState(user?.semester || 'Semester 6');

  // Security fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Storage preferences
  const [defaultCategory, setDefaultCategory] = useState('Lecture Notes');
  const [autoSync, setAutoSync] = useState(true);
  const [versionRetention, setVersionRetention] = useState('all');

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [quotaWarnings, setQuotaWarnings] = useState(true);

  // Active Sessions
  const [sessions, setSessions] = useState([
    { id: 's-1', device: 'Current Campus Workstation', ip: '10.14.88.21', location: 'University Library Terminal', current: true },
    { id: 's-2', device: 'Personal MacBook Air', ip: '172.56.21.90', location: 'Campus Wi-Fi', current: false },
  ]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateUser({ name, department, semester });
    success('Student profile information updated');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toastError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      toastError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    success('Master vault passcode updated successfully');
  };

  const handleTerminateSession = (sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    success('Session revoked and terminated');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="font-headline-sm text-2xl font-bold text-on-surface">Profile & Settings</h1>
        <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
          Manage your academic credentials, S3 backup preferences, and vault security
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 pb-1 border-b border-border-subtle overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'profile' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Student Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('storage')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'storage' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Storage & Cloud S3
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'security' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Security & Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'notifications' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Notifications
        </button>
      </div>

      {/* Tab 1: Student Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="max-w-xl p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-5">
          <div className="flex items-center gap-4 pb-4 border-b border-border-subtle">
            <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg">
              {name ? name.split(' ').map(n => n[0]).join('') : 'ST'}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-on-surface">{name}</h3>
              <p className="font-mono text-xs text-secondary">{user?.email}</p>
            </div>
          </div>

          <Input
            label="FULL NAME"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="STUDENT IDENTIFIER"
              value={user?.studentId || 'STU-84920'}
              disabled
              helperText="Campus verified ID"
            />
            <Input
              label="SEMESTER"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            />
          </div>

          <Input
            label="DEGREE & DEPARTMENT"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" type="submit">
              Save Profile Changes
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Storage & Cloud Preferences */}
      {activeTab === 'storage' && (
        <div className="max-w-xl p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase">
              DEFAULT UPLOAD CATEGORY
            </label>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-DEFAULT bg-surface-container-low border border-border-subtle text-xs text-on-surface focus:outline-none"
            >
              <option value="Lecture Notes">Lecture Notes</option>
              <option value="Assignments">Assignments</option>
              <option value="Question Papers">Question Papers</option>
              <option value="Project Reports">Project Reports</option>
            </select>
          </div>

          <div className="pt-2 border-t border-border-subtle flex flex-col gap-3">
            <Checkbox
              checked={autoSync}
              onChange={setAutoSync}
              label="Instant Automatic S3 Replication"
              description="Sync coursework directly to Amazon S3 as soon as file drops finish"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-border-subtle">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase">
              S3 REVISION RETENTION POLICY
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="retention"
                  value="all"
                  checked={versionRetention === 'all'}
                  onChange={() => setVersionRetention('all')}
                  className="accent-primary"
                />
                <span>Retain all historical versions</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="retention"
                  value="last3"
                  checked={versionRetention === 'last3'}
                  onChange={() => setVersionRetention('last3')}
                  className="accent-primary"
                />
                <span>Keep only last 3 versions</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => success('Storage preferences saved')}>
              Save Cloud Preferences
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="max-w-xl flex flex-col gap-6">
          <form onSubmit={handlePasswordSubmit} className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-4">
            <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
              Change Master Vault Passcode
            </h3>
            <Input
              label="CURRENT PASSCODE"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <Input
              label="NEW PASSCODE"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <Input
              label="CONFIRM NEW PASSCODE"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" type="submit">
                Update Passcode
              </Button>
            </div>
          </form>

          {/* Active Workstation Sessions */}
          <div className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-4">
            <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
              Active Institutional Sessions
            </h3>
            <div className="flex flex-col gap-3">
              {sessions.map((sess) => (
                <div key={sess.id} className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      {sess.device.includes('Mac') ? 'laptop_mac' : 'computer'}
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-on-surface">{sess.device}</span>
                        {sess.current && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[9px] font-bold">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-secondary">
                        {sess.ip} • {sess.location}
                      </span>
                    </div>
                  </div>
                  {!sess.current && (
                    <button
                      type="button"
                      onClick={() => handleTerminateSession(sess.id)}
                      className="text-xs text-error hover:underline font-medium"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <div className="max-w-xl p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-5">
          <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
            Notification Preferences
          </h3>
          <div className="flex flex-col gap-4">
            <Checkbox
              checked={emailAlerts}
              onChange={setEmailAlerts}
              label="S3 Sync Failure Alerts"
              description="Notify institutional email immediately if any uploaded coursework document fails to sync"
            />
            <Checkbox
              checked={quotaWarnings}
              onChange={setQuotaWarnings}
              label="Storage Quota Threshold Warnings"
              description="Alert when student storage allocation exceeds 80% (8 GB of 10 GB limit)"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => success('Notification preferences saved')}>
              Save Preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
