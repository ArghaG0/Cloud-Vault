import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { storageService } from '../services/storageService';
import { formatBytes, formatRelativeTime } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';

export function Storage() {
  const { success, info, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('management'); // 'management' | 'architecture'
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rules, setRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    async function loadStorage() {
      try {
        const [st, lg, rl] = await Promise.all([
          storageService.getStorageStats(),
          storageService.getBackupLogs(),
          storageService.getBackupRules(),
        ]);
        setStats(st);
        setLogs(Array.isArray(lg) ? lg : []);
        setRules(rl);
      } catch {
        toastError('Failed to load storage telemetry');
      } finally {
        setLoading(false);
      }
    }
    loadStorage();
  }, [toastError]);

  const handleToggleRule = async (key) => {
    const updated = !rules[key];
    setRules((prev) => ({ ...prev, [key]: updated }));
    await storageService.updateBackupRule(key, updated);
    success(`Rule updated: ${key} is now ${updated ? 'Active' : 'Disabled'}`);
  };

  const handleVerifyHash = async (logId) => {
    info('Calculating SHA-256 hash checksum against Amazon S3 ETag...');
    try {
      await storageService.verifyChecksum(logId);
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, verified: true } : l)));
      success('Checksum verified: SHA-256 integrity match confirmed.');
    } catch {
      toastError('Checksum validation failed');
    }
  };

  const handleRetryBackup = async (logId) => {
    info('Retrying multipart S3 ingest...');
    try {
      await storageService.retryBackup(logId);
      setLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, status: 'synced', errorReason: null, verified: true } : l))
      );
      success('File synchronized successfully with S3 Standard.');
    } catch {
      toastError('Retry failed');
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    info('Executing full S3 bucket synchronization...');
    try {
      const updatedLogs = await storageService.syncAllPending();
      setLogs(Array.isArray(updatedLogs) ? updatedLogs : []);
      success('All pending manifests and objects synchronized with Amazon S3.');
    } catch {
      toastError('Sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const usedPercentage = stats ? ((stats.usedBytes / stats.totalBytes) * 100).toFixed(1) : 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Page Header with Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
              Backup & Cloud Storage
            </h1>
            <Badge variant="emerald" size="sm">
              ENGINE HEALTHY
            </Badge>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            AWS S3 Standard bucket repository, KMS encryption rules, and sync logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'management'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Management & Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'architecture'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              S3 Architecture
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncAll}
            loading={syncingAll}
            icon="sync"
          >
            Sync All Pending
          </Button>
        </div>
      </div>

      {activeTab === 'management' ? (
        <>
          {/* 4 Telemetry Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
              <span className="font-label-caps text-xs text-on-surface-variant">ALLOCATED CAPACITY</span>
              <div className="mt-2">
                <span className="font-mono text-2xl font-bold text-on-surface">
                  {formatBytes(stats.usedBytes)}
                </span>
                <span className="font-mono text-xs text-secondary ml-1">/ {formatBytes(stats.totalBytes)}</span>
                <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${usedPercentage}%` }} />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
              <span className="font-label-caps text-xs text-on-surface-variant">SYNCHRONIZED S3</span>
              <div className="mt-2">
                <span className="font-mono text-2xl font-bold text-accent-emerald">
                  {stats.syncedDocuments}
                </span>
                <span className="font-mono text-xs text-secondary ml-1">files synced</span>
                <p className="font-micro-caption text-secondary mt-1">Zero pending sync queue</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
              <span className="font-label-caps text-xs text-on-surface-variant">KMS ENCRYPTION KEY</span>
              <div className="mt-2">
                <span className="font-mono text-sm font-bold text-on-surface truncate block">
                  AES-256 (KMS)
                </span>
                <span className="font-micro-caption text-secondary block mt-1">Region: {stats.bucketRegion}</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
              <span className="font-label-caps text-xs text-on-surface-variant">S3 REPLICATION STATUS</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-emerald" />
                </span>
                <span className="font-mono text-sm font-bold text-accent-emerald">OPERATIONAL</span>
              </div>
            </div>
          </div>

          {/* Automated Backup Rules Toggle Cards */}
          <div className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-4">
            <h2 className="font-headline-sm text-base font-semibold text-on-surface">
              Automated Backup Rules
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => handleToggleRule('instantIngest')}
                className={`p-4 rounded-DEFAULT border cursor-pointer transition-all ${
                  rules.instantIngest ? 'bg-surface-container-low border-primary/50' : 'bg-card-surface border-border-subtle opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-on-surface">Instant S3 Ingest</span>
                  <span className={`material-symbols-outlined text-[18px] ${rules.instantIngest ? 'text-accent-emerald' : 'text-secondary'}`}>
                    {rules.instantIngest ? 'toggle_on' : 'toggle_off'}
                  </span>
                </div>
                <p className="font-micro-caption text-on-surface-variant">
                  Automatically replicates uploaded academic documents to Amazon S3 on upload.
                </p>
              </div>

              <div
                onClick={() => handleToggleRule('dailyDeltaBackup')}
                className={`p-4 rounded-DEFAULT border cursor-pointer transition-all ${
                  rules.dailyDeltaBackup ? 'bg-surface-container-low border-primary/50' : 'bg-card-surface border-border-subtle opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-on-surface">Daily Delta Backup</span>
                  <span className={`material-symbols-outlined text-[18px] ${rules.dailyDeltaBackup ? 'text-accent-emerald' : 'text-secondary'}`}>
                    {rules.dailyDeltaBackup ? 'toggle_on' : 'toggle_off'}
                  </span>
                </div>
                <p className="font-micro-caption text-on-surface-variant">
                  Nightly incremental check validating local metadata matches cloud objects.
                </p>
              </div>

              <div
                onClick={() => handleToggleRule('versioningPreservation')}
                className={`p-4 rounded-DEFAULT border cursor-pointer transition-all ${
                  rules.versioningPreservation ? 'bg-surface-container-low border-primary/50' : 'bg-card-surface border-border-subtle opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-on-surface">S3 Versioning</span>
                  <span className={`material-symbols-outlined text-[18px] ${rules.versioningPreservation ? 'text-accent-emerald' : 'text-secondary'}`}>
                    {rules.versioningPreservation ? 'toggle_on' : 'toggle_off'}
                  </span>
                </div>
                <p className="font-micro-caption text-on-surface-variant">
                  Retains historical revision snapshots to protect coursework against accidental overwrites.
                </p>
              </div>

              <div
                onClick={() => handleToggleRule('sseKmsEncryption')}
                className={`p-4 rounded-DEFAULT border cursor-pointer transition-all ${
                  rules.sseKmsEncryption ? 'bg-surface-container-low border-primary/50' : 'bg-card-surface border-border-subtle opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-on-surface">KMS AES-256</span>
                  <span className={`material-symbols-outlined text-[18px] ${rules.sseKmsEncryption ? 'text-accent-emerald' : 'text-secondary'}`}>
                    {rules.sseKmsEncryption ? 'toggle_on' : 'toggle_off'}
                  </span>
                </div>
                <p className="font-micro-caption text-on-surface-variant">
                  Enforces AWS Key Management Service encryption at rest for all cloud payloads.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Cloud Backup Log Table */}
          <div className="w-full bg-card-surface rounded-2xl border border-border-subtle shadow-card overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h2 className="font-headline-sm text-base font-semibold text-on-surface">
                Detailed Cloud Backup Log
              </h2>
              <span className="font-mono text-xs text-secondary">{logs.length} tracked objects</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-[11px] uppercase tracking-wider border-b border-border-subtle">
                    <th className="py-3 pl-4">Object Key & File</th>
                    <th className="py-3 px-3">Storage Class</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-3">Sync Timestamp</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 pr-4 text-right">Integrity Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60 font-body-sm text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 pl-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{log.documentTitle}</span>
                          <span className="font-mono text-[10px] text-secondary truncate max-w-sm">{log.objectKey}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-on-surface-variant">
                        {log.storageClass}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-on-surface-variant">
                        {formatBytes(log.sizeBytes)}
                      </td>
                      <td className="py-3 px-3 text-secondary text-[11px]">
                        {formatRelativeTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={log.status === 'synced' ? 'emerald' : log.status === 'pending' ? 'amber' : 'error'}
                          size="sm"
                          icon={log.status === 'synced' ? 'check_circle' : log.status === 'pending' ? 'sync' : 'error'}
                        >
                          {log.status === 'synced' ? 'Synced' : log.status === 'pending' ? 'Pending' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {log.status === 'failed' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRetryBackup(log.id)}
                            icon="replay"
                          >
                            Retry Backup
                          </Button>
                        ) : log.verified ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-emerald font-semibold">
                            <span className="material-symbols-outlined text-[16px]">task_alt</span>
                            <span>Verified</span>
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerifyHash(log.id)}
                            icon="task_alt"
                          >
                            Verify Hash
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Architecture Tab (from Stitch screen cb6a3c1b...) */
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary S3 Storage Container */}
            <div className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">cloud</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-on-surface">Primary Cloud Storage</h3>
                      <p className="font-micro-caption text-secondary">Amazon Simple Storage Service (Amazon S3)</p>
                    </div>
                  </div>
                  <Badge variant="emerald" size="sm">ACTIVE TIER</Badge>
                </div>
                <div className="flex flex-col gap-2.5 text-xs font-mono text-on-surface-variant pt-3 border-t border-border-subtle/60">
                  <div>Region: us-east-1 (N. Virginia)</div>
                  <div>Storage Class: S3 Standard (99.999999999% durability)</div>
                  <div>SSE: AWS KMS Key Management Service</div>
                </div>
              </div>
            </div>

            {/* S3 Versioning & Recovery Container */}
            <div className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">history</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-on-surface">S3 Versioning & Historical Archive</h3>
                      <p className="font-micro-caption text-secondary">Accidental Overwrite Protection</p>
                    </div>
                  </div>
                  <Badge size="sm">PRESERVED</Badge>
                </div>
                <div className="flex flex-col gap-2.5 text-xs font-mono text-on-surface-variant pt-3 border-t border-border-subtle/60">
                  <div>Retention Policy: Preserves all revision deltas</div>
                  <div>Recovery Point Objective: 0 seconds (synchronous)</div>
                  <div>Integrity: Automated SHA-256 ETag checksums</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
