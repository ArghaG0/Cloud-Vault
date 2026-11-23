import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { activityService } from '../services/activityService';
import { formatRelativeTime } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';

export function Activity() {
  const { success, info } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 's3'

  useEffect(() => {
    async function loadActivities() {
      try {
        const data = await activityService.getActivities();
        setActivities(data);
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, []);

  const handleMarkAllRead = async () => {
    await activityService.markAllAsRead();
    setActivities((prev) => prev.map((a) => ({ ...a, isRead: true })));
    success('All notifications marked as read');
  };

  const handleExportCSV = () => {
    info('Exporting chronological audit trail to CSV...');
    const headers = 'ID,Type,Title,Timestamp,Description\n';
    const rows = activities
      .map(
        (a) =>
          `"${a.id}","${a.type}","${a.title}","${a.timestamp}","${a.description.replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cloudvault_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    success('Audit CSV manifest downloaded');
  };

  const filteredActivities = activities.filter((act) => {
    if (filterType === 'unread') return !act.isRead;
    if (filterType === 's3') return ['upload', 'snapshot', 'version_created', 'backup_fail'].includes(act.type);
    return true;
  });

  const unreadCount = activities.filter((a) => !a.isRead).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
              Activity & Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge variant="emerald" size="sm">
                {unreadCount} NEW
              </Badge>
            )}
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Full cryptographic audit trail of S3 upload, backup, and institutional security events
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead} icon="done_all">
              Mark All as Read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV} icon="download">
            Export Audit CSV
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-1 border-b border-border-subtle">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All Activity ({activities.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('unread')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterType === 'unread'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Unread Notifications ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('s3')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterType === 's3'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          S3 Telemetry Logs
        </button>
      </div>

      {/* Timeline List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl w-full" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card-surface border border-border-subtle rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-3">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
          <h3 className="font-headline-sm text-base font-semibold text-on-surface">
            All caught up!
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mt-1">
            No active notification items matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredActivities.map((act) => {
            let iconColor = 'text-primary bg-surface-container';
            if (act.type === 'backup_fail') iconColor = 'text-red-500 bg-red-500/10';
            else if (act.type === 'snapshot' || act.type === 'upload')
              iconColor = 'text-accent-emerald bg-emerald-500/10';
            else if (act.type === 'version_created') iconColor = 'text-blue-500 bg-blue-500/10';

            return (
              <div
                key={act.id}
                className={`p-4 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex items-start justify-between gap-4 transition-all ${
                  !act.isRead ? 'border-primary/40 bg-surface-container-low/40' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                    <span className="material-symbols-outlined text-[20px]">{act.icon}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-on-surface">{act.title}</h4>
                      {!act.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                      )}
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      {act.description}
                    </p>
                    <span className="font-mono text-[10px] text-secondary mt-1">
                      {formatRelativeTime(act.timestamp)}
                    </span>
                  </div>
                </div>

                <Badge size="sm">
                  {act.type.toUpperCase()}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
