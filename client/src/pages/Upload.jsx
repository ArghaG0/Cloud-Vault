import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { formatBytes, getFileIcon } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export function Upload() {
  const { success, error: toastError, info } = useToast();
  const fileInputRef = useRef(null);

  const [queue, setQueue] = useState([
    {
      id: 'q-1',
      file: { name: 'CS301_Distributed_Systems_Lecture08.pdf', size: 4404019 },
      category: 'Lecture Notes',
      tag: 'SEM6',
      progress: 100,
      status: 'complete',
    },
    {
      id: 'q-2',
      file: { name: 'Capstone_Project_Sprint_Deliverable.zip', size: 18874368 },
      category: 'Project Reports',
      tag: 'CAPSTONE',
      progress: 68,
      status: 'uploading',
    },
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [kmsEnabled, setKmsEnabled] = useState(true);
  const [versioningEnabled, setVersioningEnabled] = useState(true);
  const [isUploadingAll, setIsUploadingAll] = useState(false);

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
    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        toastError(`"${file.name}" exceeds the 50 MB limit.`);
        continue;
      }
      validFiles.push({
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  const startUpload = (id) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'uploading' } : item))
    );

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (progress >= 100) {
        clearInterval(interval);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, progress: 100, status: 'complete' } : item
          )
        );
        success('Document ingested and encrypted in Amazon S3');
      } else {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, progress } : item
          )
        );
      }
    }, 300);
  };

  const startBatchUpload = async () => {
    setIsUploadingAll(true);
    info('Initiating parallel multipart S3 upload...');

    const pending = queue.filter((i) => i.status === 'pending');
    for (const item of pending) {
      startUpload(item.id);
    }

    setTimeout(() => {
      setIsUploadingAll(false);
      success('All queued academic documents successfully stored in Amazon S3');
    }, 1500);
  };

  const removeFromQueue = (id) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== 'complete'));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <Link to="/dashboard" className="hover:text-on-surface transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-on-surface font-semibold">Upload Academic Files</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
            Upload Academic Documents
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Store documents in Amazon S3 with SSE-KMS 256-bit encryption and automated versioning
          </p>
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              disabled={!queue.some((i) => i.status === 'complete')}
            >
              Clear Finished
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={startBatchUpload}
              loading={isUploadingAll}
              icon="cloud_sync"
            >
              Start Batch Sync ({queue.filter((i) => i.status === 'pending').length})
            </Button>
          </div>
        )}
      </div>

      {/* Drag and Drop Zone */}
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
          <Badge size="sm">PDF, DOCX, PPTX, ZIP, PNG</Badge>
          <Badge size="sm">Up to 50 MB per file</Badge>
          <Badge size="sm">Batch: max 10 files</Badge>
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
            <p className="font-micro-caption text-on-surface-variant mt-0.5">
              Enforces server-side KMS encryption on every uploaded S3 object.
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
              <span className="font-semibold text-xs text-on-surface">S3 Object Versioning</span>
              <span className={`material-symbols-outlined text-[18px] ${versioningEnabled ? 'text-accent-emerald' : 'text-secondary'}`}>
                {versioningEnabled ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </div>
            <p className="font-micro-caption text-on-surface-variant mt-0.5">
              Safeguards against accidental overwrites by retaining revision history.
            </p>
          </div>
        </div>
      </div>

      {/* Live Upload Queue Table */}
      {queue.length > 0 && (
        <div className="w-full bg-card-surface rounded-2xl border border-border-subtle shadow-card overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                Live Upload Queue
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-surface-container font-mono text-xs">
                {queue.length} files
              </span>
            </div>
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
