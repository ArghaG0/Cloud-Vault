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

export function Dashboard() {
  const { user } = useAuth();
  console.log(user)
  const { success, info } = useToast();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [docs, storageStats] = await Promise.all([
          documentService.getDocuments(),
          storageService.getStorageStats(),
        ]);
        setDocuments(docs);
        setStats(storageStats);
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
      success('Amazon S3 synchronization completed. All manifests verified.');
      const updatedDocs = await documentService.getDocuments();
      setDocuments(updatedDocs);
    } finally {
      setSyncing(false);
    }
  };

  const usedPercentage = stats ? ((stats.usedBytes / stats.totalBytes) * 100).toFixed(1) : 0;

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

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Page Header with Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
              Welcome back, {user?.fullName.split(" ")[0]}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Documents */}
        <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-xs text-on-surface-variant">TOTAL DOCUMENTS</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">folder_copy</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-3xl font-bold text-on-surface">
                {documents.length}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">academic files</span>
            </div>
            <p className="font-micro-caption text-secondary mt-1">Across 6 active coursework categories</p>
          </div>
        </div>

        {/* Card 2: Cloud Storage */}
        <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-xs text-on-surface-variant">S3 STORAGE USAGE</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">cloud_queue</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-3xl font-bold text-on-surface">
                {formatBytes(stats?.usedBytes)}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">
                / {formatBytes(stats?.totalBytes)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Backup Health */}
        <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-xs text-on-surface-variant">S3 REPLICATION</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-accent-emerald">
              <span className="material-symbols-outlined text-[18px]">cloud_done</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-3xl font-bold text-accent-emerald">
                100%
              </span>
              <span className="font-mono text-xs text-on-surface-variant">KMS Encrypted</span>
            </div>
            <p className="font-micro-caption text-secondary mt-1">AWS us-east-1 standard bucket</p>
          </div>
        </div>

        {/* Card 4: Active Categories */}
        <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-xs text-on-surface-variant">COURSE MODULES</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-3xl font-bold text-on-surface">6</span>
              <span className="font-mono text-xs text-on-surface-variant">Categories</span>
            </div>
            <Link to="/categories" className="font-micro-caption text-primary hover:underline mt-1 block">
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
              Quickly drop lecture slides or homework solutions for instant KMS encryption and cloud ingestion.
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
                {formatBytes(stats?.usedBytes)} used ({usedPercentage}%)
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex mb-6">
              <div className="bg-emerald-500 h-full" style={{ width: '40%' }} title="Lecture Notes (40%)" />
              <div className="bg-blue-500 h-full" style={{ width: '30%' }} title="Assignments (30%)" />
              <div className="bg-amber-500 h-full" style={{ width: '18%' }} title="Project Reports (18%)" />
              <div className="bg-purple-500 h-full" style={{ width: '12%' }} title="Question Papers (12%)" />
            </div>

            {/* Category Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-label-caps text-[10px] text-on-surface-variant">NOTES</span>
                </div>
                <p className="font-mono text-xs font-bold text-on-surface">840 MB</p>
                <p className="font-micro-caption text-secondary">16 files</p>
              </div>

              <div className="p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-label-caps text-[10px] text-on-surface-variant">ASSIGNMENTS</span>
                </div>
                <p className="font-mono text-xs font-bold text-on-surface">620 MB</p>
                <p className="font-micro-caption text-secondary">14 files</p>
              </div>

              <div className="p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-label-caps text-[10px] text-on-surface-variant">PROJECTS</span>
                </div>
                <p className="font-mono text-xs font-bold text-on-surface">450 MB</p>
                <p className="font-micro-caption text-secondary">5 files</p>
              </div>

              <div className="p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-label-caps text-[10px] text-on-surface-variant">EXAMS</span>
                </div>
                <p className="font-mono text-xs font-bold text-on-surface">300 MB</p>
                <p className="font-micro-caption text-secondary">8 files</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-subtle/60 text-xs text-on-surface-variant">
            <span>S3 Bucket Versioning: Enabled</span>
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
              View All Documents ({documents.length}) →
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
                {documents.slice(0, 5).map((doc) => {
                  const { icon, color } = getFileIcon(doc.extension);
                  return (
                    <tr key={doc.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}>
                            <span className="material-symbols-outlined text-[16px]">{icon}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface truncate max-w-xs">{doc.name}</span>
                            <span className="text-[10px] text-secondary truncate max-w-xs">{doc.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge size="sm">{doc.category}</Badge>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-on-surface-variant">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="py-3 text-secondary text-[11px]">
                        {formatRelativeTime(doc.uploadDate)}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <Link
                          to={`/documents/${doc.id}/preview`}
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
              <div className="flex items-start gap-3 p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/50">
                <span className="material-symbols-outlined text-accent-emerald text-[18px] mt-0.5">
                  cloud_done
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">Upload Verified</span>
                  <span className="text-[11px] text-on-surface-variant">
                    CloudVault_SRS_v1.0.docx ingested with SSE-KMS
                  </span>
                  <span className="font-mono text-[9px] text-secondary mt-1">10m ago</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/50">
                <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">
                  history
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">Version Retained</span>
                  <span className="text-[11px] text-on-surface-variant">
                    CS301_Distributed_Systems preserved previous revision
                  </span>
                  <span className="font-mono text-[9px] text-secondary mt-1">2h ago</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-DEFAULT bg-surface-container-low border border-border-subtle/50">
                <span className="material-symbols-outlined text-accent-emerald text-[18px] mt-0.5">
                  verified_user
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">KMS Checksum Match</span>
                  <span className="text-[11px] text-on-surface-variant">
                    SHA-256 hash verified against S3 ETag
                  </span>
                  <span className="font-mono text-[9px] text-secondary mt-1">5h ago</span>
                </div>
              </div>
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
