import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { documentService } from '../services/documentService';
import { storageService } from '../services/storageService';
import { formatBytes, formatRelativeTime, getFileIcon } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';

const CATEGORY_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-rose-500',
];

export function Dashboard() {
  const { user } = useAuth();
  console.log(user)
  const { success, info } = useToast();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardBundle = async () => {
    const [docs, dashboardStats] = await Promise.all([
      documentService.getDocuments(),
      storageService.getDashboardStats(),
    ]);
    setDocuments(docs || []);
    setStats(dashboardStats || null);
  };

  useEffect(() => {
    async function loadData() {
      try {
        await fetchDashboardBundle();
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleQuickSync = async () => {
    setSyncing(true);
    info('Initiating S3 bucket synchronization...');
    try {
      await storageService.syncAllPending();
      await fetchDashboardBundle();
      success('Amazon S3 synchronization completed. All manifests verified.');
    } finally {
      setSyncing(false);
    }
  };

  const usedBytes = stats?.storageUsedBytes ?? 0;
  const quotaBytes = stats?.storageQuotaBytes ?? 10737418240;
  const usedPercentage =
    stats?.storagePercentage !== undefined
      ? Number(stats.storagePercentage).toFixed(1)
      : quotaBytes > 0
        ? ((usedBytes / quotaBytes) * 100).toFixed(1)
        : '0.0';

  const totalDocumentsCount = stats?.totalDocuments ?? documents.length;
  const activeCategoriesCount =
    stats?.activeCategoriesCount ?? stats?.categoryDistribution?.length ?? 0;
  const categoryDistribution = stats?.categoryDistribution ?? [];
  const s3Health = stats?.s3Health ?? {};
  const recentDocuments = stats?.recentDocuments ?? [];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  console.log(stats)

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Page Header with Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}
            </h1>
            <Badge variant="emerald" size="sm" pulse>
              ACTIVE VAULT
            </Badge>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            {user?.department} • {user?.semester} • Academic Repository
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleQuickSync}
            loading={syncing}
            icon="sync"
          >
            Run Sync
          </Button>
          <Link to="/upload">
            <Button variant="primary" size="sm" icon="cloud_upload">
              Upload File
            </Button>
          </Link>
        </div>
      </div>


      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Documents */}
        <div className="p-4 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Documents
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">folder_copy</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-on-surface leading-tight">
                {totalDocumentsCount}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">academic files</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1 truncate">
              Across {activeCategoriesCount} active coursework categories
            </p>
          </div>
        </div>

        {/* Card 2: Cloud Storage */}
        <div className="p-4 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              S3 Storage Usage
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">cloud_queue</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-bold text-on-surface leading-tight">
                {formatBytes(usedBytes)}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">
                / {formatBytes(quotaBytes)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(Number(usedPercentage) || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Backup Health */}
        <div className="p-4 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              S3 Replication
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-accent-emerald shrink-0">
              <span className="material-symbols-outlined text-[16px]">cloud_done</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-accent-emerald leading-tight truncate">
                {s3Health?.status || 'Healthy'}
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant truncate">
                {s3Health?.encryption || 'SSE-S3 / KMS'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1 truncate">
              AWS {s3Health?.region || 'ap-southeast-2'} bucket
            </p>
          </div>
        </div>

        {/* Card 4: Active Categories */}
        <div className="p-4 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Course Modules
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-on-surface leading-tight">
                {activeCategoriesCount}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">Categories</span>
            </div>
            <Link
              to="/categories"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              Manage category folders →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Direct Ingest & Storage Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Direct Ingest Widget */}
        <div className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-base font-semibold text-on-surface">
                Direct S3 Ingest
              </h2>
              <span className="material-symbols-outlined text-secondary text-[20px]">bolt</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mb-5">
              Quickly drop lecture slides or homework solutions for instant encryption and cloud ingestion.
            </p>
            <Link
              to="/upload"
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border-subtle hover:border-primary/60 rounded-DEFAULT bg-panel-surface/60 transition-all text-center group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[36px] text-secondary group-hover:text-primary transition-colors mb-2">
                cloud_upload
              </span>
              <span className="font-body-sm text-xs font-semibold text-on-surface">
                Click or Drop Files Here
              </span>
              <span className="font-micro-caption text-[10px] text-secondary mt-1">
                PDF, DOCX, PPTX, ZIP up to 50 MB
              </span>
            </Link>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-subtle/60 text-xs text-on-surface-variant font-mono">
            <span>Status: Ready</span>
            <span className="text-accent-emerald">Zero Ingestion Latency</span>
          </div>
        </div>

        {/* Right Column: Storage Distribution & Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-base font-semibold text-on-surface">
                Storage Distribution
              </h2>
              <span className="font-mono text-xs text-on-surface-variant">
                {formatBytes(usedBytes)} used ({usedPercentage}%)
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex mb-6">
              {categoryDistribution.length > 0 && usedBytes > 0 ? (
                categoryDistribution.map((item, index) => {
                  const pct = ((item.totalBytes || 0) / usedBytes) * 100;
                  const colorClass = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                  return (
                    <div
                      key={item.category || index}
                      className={`${colorClass} h-full`}
                      style={{ width: `${pct}%` }}
                      title={`${item.category || 'Uncategorized'} (${pct.toFixed(1)}%)`}
                    />
                  );
                })
              ) : (
                <div className="bg-surface-container h-full w-full" />
              )}
            </div>

            {/* Category Breakdown Chips */}
            {categoryDistribution.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categoryDistribution.map((item, index) => {
                  const dotClass = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                  return (
                    <div
                      key={item.category || index}
                      className="p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/60"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase truncate">
                          {item.category || 'GENERAL'}
                        </span>
                      </div>
                      <p className="font-mono text-xs font-bold text-on-surface">
                        {formatBytes(item.totalBytes || 0)}
                      </p>
                      <p className="font-micro-caption text-secondary">
                        {item.count ?? 0} {(item.count ?? 0) === 1 ? 'file' : 'files'}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body-sm text-xs text-on-surface-variant">
                No category storage breakdown available yet. Upload a document to populate distribution.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-subtle/60 text-xs text-on-surface-variant">
            <span>
              S3 Bucket Versioning: {s3Health?.versioning || 'Enabled'}
            </span>
            <Link to="/storage" className="text-primary hover:underline font-semibold">
              View Detailed Storage Telemetry →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Documents Table & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Section */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-sm text-base font-semibold text-on-surface">
              Recent Academic Documents
            </h2>
            <Link to="/documents" className="text-xs font-semibold text-primary hover:underline">
              View All Documents ({totalDocumentsCount}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-on-surface-variant font-label-caps text-[11px] uppercase tracking-wider">
                  <th className="pb-3 pl-2">Document</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Uploaded</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 font-body-sm text-xs">
                {recentDocuments.map((doc) => {
                  const docId = doc._id || doc.id;
                  const docName = doc.displayName || doc.name || doc.originalName || 'Untitled';
                  const docTitle = doc.title || doc.s3ObjectKey || '';
                  const docSize = doc.fileSize ?? doc.sizeBytes ?? 0;
                  const docDate = doc.createdAt || doc.uploadDate;
                  const ext =
                    doc.extension ||
                    (docName.includes('.') ? docName.split('.').pop().toLowerCase() : '');
                  const { icon, color } = getFileIcon(ext);

                  return (
                    <tr key={docId} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}>
                            <span className="material-symbols-outlined text-[16px]">{icon}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface truncate max-w-xs">
                              {docName}
                            </span>
                            <span className="text-[10px] text-secondary truncate max-w-xs">
                              {docTitle}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge size="sm">{doc.category}</Badge>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-on-surface-variant">
                        {formatBytes(docSize)}
                      </td>
                      <td className="py-3 text-secondary text-[11px]">
                        {docDate ? formatRelativeTime(docDate) : '—'}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <Link
                          to={`/documents/${docId}/preview`}
                          className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-panel-surface transition-colors inline-block"
                          title="Preview"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time S3 Activity Stream Widget */}
        <div className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-base font-semibold text-on-surface">
                S3 Activity Stream
              </h2>
              <span className="material-symbols-outlined text-secondary text-[20px]">history</span>
            </div>

            <div className="flex flex-col gap-3.5">
              {recentDocuments.slice(0, 3).map((doc) => {
                const docId = doc._id || doc.id;
                const docName = doc.displayName || doc.name || 'Document';
                const docDate = doc.createdAt || doc.uploadDate;
                return (
                  <div
                    key={`act-${docId}`}
                    className="flex items-start gap-3 p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/50"
                  >
                    <span className="material-symbols-outlined text-accent-emerald text-[18px] mt-0.5">
                      cloud_done
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-on-surface">
                        {doc.s3Status || 'Synced'}
                      </span>
                      <span className="text-[11px] text-on-surface-variant truncate">
                        {docName} stored in {s3Health?.region || 'ap-southeast-2'}
                      </span>
                      <span className="font-mono text-[9px] text-secondary mt-1">
                        {docDate ? formatRelativeTime(docDate) : 'Just now'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {recentDocuments.length === 0 && (
                <p className="text-xs text-on-surface-variant">
                  No recent S3 activity yet.
                </p>
              )}
            </div>
          </div>

          <Link
            to="/activity"
            className="pt-4 mt-4 border-t border-border-subtle/60 text-xs font-semibold text-primary hover:underline flex items-center justify-between"
          >
            <span>View Full Audit Log</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}