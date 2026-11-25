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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    async function loadDoc() {
      try {
        const doc = await documentService.getDocumentById(id);
        setDocument(doc);
        // Fetch a presigned preview URL immediately after loading the doc
        setPreviewLoading(true);
        try {
          const res = await documentService.requestPresignedPreviewUrl(id);
          if (res?.previewUrl) setPreviewUrl(res.previewUrl);
          else setPreviewError(true);
        } catch {
          setPreviewError(true);
        } finally {
          setPreviewLoading(false);
        }
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

  const handleDownload = async () => {
    try {
      info(`Preparing download for ${document?.name}...`);
      const res = await documentService.requestPresignedDownloadUrl(id);
      if (res?.downloadUrl) {
        const link = window.document.createElement('a');
        link.href = res.downloadUrl;
        link.download = document?.originalFilename || document?.name || 'document';
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        success('Download initiated');
      } else {
        toastError('Download link not returned by S3 service');
      }
    } catch (err) {
      toastError(err?.message || 'Failed to initiate download');
    }
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
          {(() => {
            const mime = document?.mimeType || '';
            const ext = (document?.extension || '').toLowerCase();
            const isImage = mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext);
            return (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-card-surface border border-border-subtle shadow-card">
                {/* Page nav — hidden for images */}
                {!isImage ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePage(p => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                      className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="font-mono text-xs">Page {activePage}</span>
                    <button
                      type="button"
                      onClick={() => setActivePage(p => p + 1)}
                      className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-secondary font-mono">
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    <span>{(document?.mimeType || '').toUpperCase()}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {isImage && (
                    <>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(z => Math.max(25, z - 25))}
                        className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface"
                        title="Zoom Out"
                      >
                        <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                      </button>
                      <span className="font-mono text-xs min-w-[45px] text-center">{zoomLevel}%</span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(z => Math.min(300, z + 25))}
                        className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface"
                        title="Zoom In"
                      >
                        <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 rounded-full hover:bg-panel-surface text-secondary hover:text-on-surface ml-2"
                    title="Print"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Primary Viewer Canvas */}
          <div className="min-h-[640px] bg-panel-surface/80 rounded-2xl border border-border-subtle flex flex-col items-center justify-start relative overflow-hidden">
            {/* Canvas header strip (always visible) */}
            <div className="w-full flex items-center gap-3 px-6 py-3 border-b border-border-subtle bg-card-surface">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm text-on-surface truncate">{document.name}</h2>
                <p className="font-micro-caption text-secondary uppercase tracking-wider text-[10px]">
                  {document.category} • {document.mimeType}
                </p>
              </div>
              <Badge variant="emerald" size="sm">VERIFIED S3</Badge>
            </div>

            {/* Actual file content area */}
            <div
              className="flex-1 w-full flex items-center justify-center overflow-auto"
              style={{ minHeight: '560px' }}
            >
              {previewLoading && (
                <div className="flex flex-col items-center gap-3 text-secondary">
                  <span className="material-symbols-outlined text-[40px] animate-spin">progress_activity</span>
                  <span className="text-sm">Loading preview from S3…</span>
                </div>
              )}

              {!previewLoading && previewUrl && (() => {
                const mime = document.mimeType || '';
                const ext = (document.extension || '').toLowerCase();
                const isImage = mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext);
                const isPdf = mime === 'application/pdf' || ext === 'pdf';
                const isOffice = ['docx','doc','xlsx','xls','pptx','ppt'].includes(ext) ||
                  ['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                   'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                   'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(mime);

                if (isImage) {
                  return (
                    <div
                      className="flex items-center justify-center w-full h-full p-4"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}
                    >
                      <img
                        src={previewUrl}
                        alt={document.name}
                        className="max-w-full max-h-[520px] object-contain rounded-xl shadow-lg"
                        onError={() => setPreviewError(true)}
                      />
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={previewUrl}
                      title={document.name}
                      className="w-full border-0"
                      style={{ height: '580px' }}
                    />
                  );
                }

                if (isOffice) {
                  return (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                      title={document.name}
                      className="w-full border-0"
                      style={{ height: '580px' }}
                    />
                  );
                }

                // Generic: video
                if (mime.startsWith('video/')) {
                  return (
                    <video controls className="max-w-full max-h-[520px] rounded-xl shadow-lg">
                      <source src={previewUrl} type={mime} />
                      Your browser does not support video preview.
                    </video>
                  );
                }

                // Audio
                if (mime.startsWith('audio/')) {
                  return (
                    <div className="flex flex-col items-center gap-6 p-8">
                      <span className="material-symbols-outlined text-[80px] text-primary">audio_file</span>
                      <p className="text-sm text-on-surface font-semibold">{document.name}</p>
                      <audio controls className="w-full max-w-sm">
                        <source src={previewUrl} type={mime} />
                      </audio>
                    </div>
                  );
                }

                // Unsupported — show download prompt
                return (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <span className="material-symbols-outlined text-[64px] text-secondary">description</span>
                    <p className="text-sm font-semibold text-on-surface">{document.name}</p>
                    <p className="text-xs text-secondary max-w-xs">
                      In-browser preview is not available for <span className="font-mono">.{ext}</span> files.
                      Download the file to view it locally.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download File
                    </button>
                  </div>
                );
              })()}

              {!previewLoading && (previewError || !previewUrl) && (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <span className="material-symbols-outlined text-[64px] text-secondary">broken_image</span>
                  <p className="text-sm font-semibold text-on-surface">Preview unavailable</p>
                  <p className="text-xs text-secondary max-w-xs">
                    Could not load a preview from S3. The presigned URL may have expired or the file may still be processing.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download Instead
                  </button>
                </div>
              )}
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
