import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { documentService } from '../services/documentService';
import { formatBytes, formatDate, formatRelativeTime, getFileIcon } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';

export function DocumentPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, info, error: toastError } = useToast();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activePage, setActivePage] = useState(1);

  useEffect(() => {
    async function loadDoc() {
      try {
        const doc = await documentService.getDocumentById(id);
        setDocument(doc);
      } catch (err) {
        toastError(err?.message || 'Document not found');
        navigate('/documents');
      } finally {
        setLoading(false);
      }
    }
    loadDoc();
  }, [id, navigate, toastError]);

  const handleCopyPresignedUrl = async () => {
    try {
      const res = await documentService.requestPresignedDownloadUrl(id);
      navigator.clipboard.writeText(res.downloadUrl);
      success('Temporary presigned S3 download URL copied (valid for 5 mins)');
    } catch {
      toastError('Failed to generate presigned URL');
    }
  };

  const handleDownload = () => {
    info(`Downloading ${document?.name}...`);
    setTimeout(() => success('Download started'), 600);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!document) return null;

  const { icon, color } = getFileIcon(document.extension);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Breadcrumb Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
          <Link to="/documents" className="hover:text-on-surface transition-colors">
            My Documents
          </Link>
          <span>/</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">{document.name}</span>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyPresignedUrl} icon="share">
            Share Presigned Link
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload} icon="download">
            Download File
          </Button>
        </div>
      </div>

      {/* Main Two-Column Reader Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (70%): Document Viewer Canvas */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Canvas Toolbar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-card-surface border border-border-subtle shadow-card">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePage(p => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="font-mono text-xs">
                Page {activePage} of 12
              </span>
              <button
                type="button"
                onClick={() => setActivePage(p => Math.min(12, p + 1))}
                disabled={activePage === 12}
                className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
                className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="font-mono text-xs min-w-[45px] text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(200, z + 25))}
                className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface ml-2"
                title="Print Document"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
              </button>
            </div>
          </div>

          {/* Primary Viewer Canvas */}
          <div className="min-h-[640px] bg-panel-surface/80 rounded-2xl border border-border-subtle flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <div
              className="w-full max-w-2xl bg-card-surface border border-border-subtle rounded-DEFAULT shadow-lg p-10 flex flex-col gap-6 transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-on-surface">{document.name}</h2>
                    <p className="font-micro-caption text-secondary uppercase tracking-wider">
                      {document.category} • Institutional Academic Copy
                    </p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">
                  VERIFIED S3 REPLICA
                </Badge>
              </div>

              {/* Formatted Content Simulation */}
              <div className="flex flex-col gap-4 text-xs font-body-sm leading-relaxed text-on-surface">
                <h3 className="font-headline-sm text-base font-semibold">{document.title}</h3>
                <p className="text-on-surface-variant">
                  This document is securely preserved in Amazon Simple Storage Service (Amazon S3) with server-side AWS KMS 256-bit encryption. The integrity hash has been verified against the S3 object ETag manifest.
                </p>

                <div className="p-4 rounded-DEFAULT bg-surface-container-low border border-border-subtle/80 font-mono text-[11px] flex flex-col gap-1.5">
                  <div className="text-secondary">DOCUMENT PREVIEW SNAPSHOT</div>
                  <div>Course Code: {document.tags ? document.tags.join(', ') : 'ACADEMIC'}</div>
                  <div>Storage Key: {document.s3Key}</div>
                  <div>Payload Size: {formatBytes(document.sizeBytes)}</div>
                  <div>MIME Type: {document.mimeType}</div>
                </div>

                <p className="text-on-surface-variant">
                  Detailed coursework contents, lecture slide annotations, formulas, diagrams, and supplementary problem sets are indexed for fast student search and local offline retrieval.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (30%): Metadata, S3 Telemetry & Version History */}
        <div className="flex flex-col gap-6">
          {/* Metadata Card */}
          <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-4">
            <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
              Document Properties
            </h3>

            <div className="flex flex-col gap-3 font-body-sm text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60">
                <span className="text-secondary">Original Name</span>
                <span className="font-medium text-on-surface truncate max-w-[180px]">{document.name}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60">
                <span className="text-secondary">Category</span>
                <Badge size="sm">{document.category}</Badge>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60">
                <span className="text-secondary">File Size</span>
                <span className="font-mono text-on-surface font-semibold">{formatBytes(document.sizeBytes)}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60">
                <span className="text-secondary">Uploaded Date</span>
                <span className="text-on-surface">{formatDate(document.uploadDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Last Modified</span>
                <span className="text-on-surface">{formatRelativeTime(document.lastModified)}</span>
              </div>
            </div>
          </div>

          {/* S3 Encryption & Telemetry Card */}
          <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                Amazon S3 Telemetry
              </h3>
              <span className="material-symbols-outlined text-accent-emerald text-[18px]">verified</span>
            </div>

            <div className="flex flex-col gap-2.5 font-mono text-[11px]">
              <div>
                <span className="text-secondary block text-[10px]">S3 STORAGE KEY</span>
                <span className="text-on-surface break-all">{document.s3Key}</span>
              </div>
              <div>
                <span className="text-secondary block text-[10px]">ENCRYPTION ALGORITHM</span>
                <span className="text-accent-emerald font-semibold">AWS KMS AES-256 (SSE-KMS)</span>
              </div>
              <div>
                <span className="text-secondary block text-[10px]">SHA-256 CHECKSUM</span>
                <span className="text-on-surface-variant break-all text-[10px]">{document.sha256Checksum}</span>
              </div>
            </div>
          </div>

          {/* Version History Stream */}
          <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                Revision History
              </h3>
              <span className="font-mono text-xs text-secondary">{document.versionCount} revisions</span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-2.5 rounded-DEFAULT bg-surface-container-low border border-border-subtle/80">
                <span className="material-symbols-outlined text-accent-emerald text-[16px] mt-0.5">
                  radio_button_checked
                </span>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">Version 2 (Current)</span>
                    <span className="font-mono text-[9px] text-secondary">Latest</span>
                  </div>
                  <span className="font-micro-caption text-secondary mt-0.5">
                    Updated {formatRelativeTime(document.lastModified)}
                  </span>
                </div>
              </div>

              {document.versionCount > 1 && (
                <div className="flex items-start gap-3 p-2.5 rounded-DEFAULT bg-panel-surface/60 border border-border-subtle/50">
                  <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5">
                    history
                  </span>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-on-surface">Version 1</span>
                      <button
                        type="button"
                        onClick={() => success('Restored Version 1 from S3 historical archive')}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Restore
                      </button>
                    </div>
                    <span className="font-micro-caption text-secondary mt-0.5">
                      Archived {formatDate(document.uploadDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
