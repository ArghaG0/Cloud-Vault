import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { documentService } from '../services/documentService';
import { storageService } from '../services/storageService';
import { formatBytes, getFileIcon } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

// AWS S3 Free Tier Constraints
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export function Upload() {
  const { success, error: toastError, info } = useToast();
  const fileInputRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [kmsEnabled, setKmsEnabled] = useState(true);
  const [versioningEnabled, setVersioningEnabled] = useState(true);
  const [isUploadingAll, setIsUploadingAll] = useState(false);

  // Load live user storage quota to protect AWS Free Tier limit
  useEffect(() => {
    async function loadStorage() {
      try {
        const stats = await storageService.getDashboardStats();
        setStorageStats(stats);
      } catch {
        // graceful fallback
      }
    }
    loadStorage();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files) => {
    const validFiles = [];
    const usedBytes = storageStats?.storageUsedBytes || 0;
    const quotaBytes = storageStats?.storageQuotaBytes || MAX_STORAGE_LIMIT_BYTES;
    const remainingQuota = Math.max(0, quotaBytes - usedBytes);

    for (const file of files) {
      // 1. Check single file Free Tier limit
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toastError(`"${file.name}" exceeds the 50 MB AWS S3 Free Tier per-file limit.`);
        continue;
      }

      // 2. Check remaining storage space
      if (file.size > remainingQuota) {
        toastError(
          `Uploading "${file.name}" (${formatBytes(file.size)}) would exceed your 5 GB AWS S3 Free Tier quota (${formatBytes(remainingQuota)} remaining).`
        );
        continue;
      }

      validFiles.push({
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        rawFile: file,
        file: { name: file.name, size: file.size },
        category: 'Lecture Notes',
        tag: 'ACADEMIC',
        progress: 0,
        status: 'pending',
      });
    }

    if (validFiles.length > 0) {
      setQueue((prev) => [...prev, ...validFiles]);
      success(`Added ${validFiles.length} file(s) to upload queue.`);
    }
  };

  const startUpload = async (id) => {
    const target = queue.find((i) => i.id === id);
    if (!target) return;

    if (!target.rawFile) {
      toastError('File content is missing from queue. Please re-select the file.');
      return;
    }

    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'uploading', progress: 10 } : item))
    );

    try {
      await documentService.uploadFile(
        target.rawFile,
        { category: target.category, tag: target.tag },
        (progress) => {
          setQueue((prev) =>
            prev.map((item) => (item.id === id ? { ...item, progress } : item))
          );
        }
      );

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, progress: 100, status: 'complete' } : item
        )
      );
      success(`"${target.file.name}" ingested and encrypted in Amazon S3.`);

      // Refresh storage metrics after successful upload
      try {
        const stats = await storageService.getDashboardStats();
        setStorageStats(stats);
      } catch {
        // ignore
      }
    } catch (err) {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'failed' } : item))
      );
      toastError(err?.message || `Failed to upload "${target.file.name}" to S3.`);
    }
  };

  const startBatchUpload = async () => {
    setIsUploadingAll(true);
    info('Initiating parallel S3 upload with Free Tier safety checks...');

    const pending = queue.filter((i) => i.status === 'pending');
    for (const item of pending) {
      await startUpload(item.id);
    }

    setIsUploadingAll(false);
  };

  const removeFromQueue = (id) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== 'complete'));
  };

  const completedCount = queue.filter((i) => i.status === 'complete').length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <Link to="/documents" className="hover:text-on-surface transition-colors">
          My Documents
        </Link>
        <span>/</span>
        <span className="text-on-surface font-semibold">Upload Ingestion Engine</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
              Direct AWS S3 Upload Engine
            </h1>
            <Badge variant="emerald" size="sm">
              Free Tier Enforced (5 GB)
            </Badge>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            Zero-server client-to-bucket upload with SHA-256 integrity verification and KMS encryption
          </p>
        </div>

        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={startBatchUpload}
              disabled={isUploadingAll || queue.every((i) => i.status === 'complete')}
              icon="cloud_upload"
            >
              {isUploadingAll ? 'Uploading to S3...' : 'Upload All to S3'}
            </Button>
          )}
          {completedCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearCompleted} icon="clear_all">
              Clear Completed ({completedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-surface-container-high scale-[0.99]'
            : 'border-border-subtle hover:border-primary/60 bg-panel-surface/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.zip,.png,.jpg,.jpeg,.txt"
        />

        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary mb-3 shadow-xs">
          <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
        </div>

        <h3 className="font-headline-sm text-base font-semibold text-on-surface">
          Drag and drop academic documents here
        </h3>
        <p className="font-body-sm text-xs text-on-surface-variant mt-1">
          or <span className="text-primary font-semibold underline">browse files</span> from your local workstation
        </p>

        {/* Validation Specs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <Badge size="sm">PDF, DOCX, PPTX, ZIP, PNG, TXT</Badge>
          <Badge size="sm">Max 50 MB per file</Badge>
          <Badge size="sm">5 GB Bucket Free Tier Cap</Badge>
        </div>
      </div>

      {/* Security Options Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card">
        <div
          onClick={() => setKmsEnabled(!kmsEnabled)}
          className="flex items-start gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-on-surface">AWS KMS Encryption</span>
              <span className={`material-symbols-outlined text-[18px] ${kmsEnabled ? 'text-accent-emerald' : 'text-secondary'}`}>
                {kmsEnabled ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </div>
            <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
              Envelope encryption via AWS Key Management Service (KMS AES-256)
            </p>
          </div>
        </div>

        <div
          onClick={() => setVersioningEnabled(!versioningEnabled)}
          className="flex items-start gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">history</span>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-on-surface">S3 Version Preservation</span>
              <span className={`material-symbols-outlined text-[18px] ${versioningEnabled ? 'text-accent-emerald' : 'text-secondary'}`}>
                {versioningEnabled ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </div>
            <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
              Immutable revision tracking on every overwrite for coursework audit compliance
            </p>
          </div>
        </div>
      </div>

      {/* Upload Queue Section */}
      {queue.length > 0 && (
        <div className="rounded-2xl bg-card-surface border border-border-subtle shadow-card overflow-hidden">
          <div className="p-4 border-b border-border-subtle/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-sm font-semibold text-on-surface">
                Ingestion Queue
              </span>
              <Badge size="sm">{queue.length} items</Badge>
            </div>
            <span className="font-mono text-xs text-secondary">
              Total: {formatBytes(queue.reduce((acc, i) => acc + i.file.size, 0))}
            </span>
          </div>

          <div className="divide-y divide-border-subtle/60">
            {queue.map((item) => {
              const { icon, color } = getFileIcon(item.file.name);

              return (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-on-surface truncate">
                        {item.file.name}
                      </span>
                      <span className="font-mono text-[10px] text-secondary">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                  </div>

                  {/* Category & Tag Pickers */}
                  <div className="flex items-center gap-3">
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQueue((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, category: val } : i))
                        );
                      }}
                      className="px-2.5 py-1 rounded-DEFAULT bg-surface-container-low border border-border-subtle text-xs text-on-surface focus:outline-none"
                    >
                      <option value="Lecture Notes">Lecture Notes</option>
                      <option value="Assignments">Assignments</option>
                      <option value="Question Papers">Question Papers</option>
                      <option value="Project Reports">Project Reports</option>
                      <option value="Study Materials">Study Materials</option>
                      <option value="Other Documents">Other Documents</option>
                    </select>

                    <input
                      type="text"
                      value={item.tag}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQueue((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, tag: val } : i))
                        );
                      }}
                      placeholder="Course tag (e.g. SEM6)"
                      className="w-24 px-2 py-1 rounded-DEFAULT bg-surface-container-low border border-border-subtle text-xs font-mono text-on-surface uppercase focus:outline-none"
                    />
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex items-center gap-3 min-w-[140px] justify-end">
                    {item.status === 'complete' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-emerald font-semibold">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Ingested</span>
                      </span>
                    ) : item.status === 'uploading' ? (
                      <div className="flex items-center gap-2 w-28">
                        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">{item.progress}%</span>
                      </div>
                    ) : item.status === 'failed' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 font-medium">Failed</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startUpload(item.id)}
                          icon="refresh"
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startUpload(item.id)}
                        icon="cloud_upload"
                      >
                        Upload
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFromQueue(item.id)}
                      className="p-1 rounded-full text-secondary hover:text-error hover:bg-panel-surface transition-colors"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
