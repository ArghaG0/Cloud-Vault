import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { documentService } from '../services/documentService';
import { formatBytes, formatRelativeTime, getFileIcon } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';
import { Modal } from '../components/common/Modal';
import { Dropdown } from '../components/common/Dropdown';
import { Skeleton } from '../components/common/Skeleton';

export function MyDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const { success, error: toastError, info } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [renameDoc, setRenameDoc] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const data = await documentService.getDocuments();
        setDocuments(data);
      } catch {
        toastError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [toastError]);

  // Filter & Sort
  const filteredDocuments = useMemo(() => {
    let result = documents.filter((doc) => {
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'pdf' && doc.extension === 'pdf') ||
        (selectedType === 'docx' && (doc.extension === 'docx' || doc.extension === 'doc')) ||
        (selectedType === 'pptx' && (doc.extension === 'pptx' || doc.extension === 'ppt')) ||
        (selectedType === 'zip' && doc.extension === 'zip') ||
        (selectedType === 'image' && ['png', 'jpg', 'jpeg'].includes(doc.extension));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCategory && matchesType && matchesSearch;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.lastModified) - new Date(a.lastModified);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.sizeBytes - a.sizeBytes;
      if (sortBy === 'status') return a.s3Status.localeCompare(b.s3Status);
      return 0;
    });

    return result;
  }, [documents, selectedCategory, selectedType, searchQuery, sortBy]);

  // Selection logic
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  const handleRename = async () => {
    if (!renameDoc || !newName.trim()) return;
    try {
      await documentService.updateDocument(renameDoc.id, { name: newName.trim() });
      setDocuments((prev) =>
        prev.map((d) => (d.id === renameDoc.id ? { ...d, name: newName.trim() } : d))
      );
      success('Document renamed successfully');
      setRenameDoc(null);
    } catch {
      toastError('Failed to rename document');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    try {
      await documentService.deleteDocument(deleteDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteDoc.id);
        return next;
      });
      success('Document removed from S3 and vault');
      setDeleteDoc(null);
    } catch {
      toastError('Failed to delete document');
    }
  };

  const handleBatchDelete = async () => {
    try {
      for (const id of selectedIds) {
        await documentService.deleteDocument(id);
      }
      setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
      success(`Deleted ${selectedIds.size} documents from vault`);
      setBatchDeleteOpen(false);
    } catch {
      toastError('Batch deletion failed');
    }
  };

  const handleBatchDownload = () => {
    info(`Packaging ${selectedIds.size} files for batch archive download...`);
    setTimeout(() => {
      success('Batch archive download initiated');
    }, 1000);
  };

  const categories = [
    { label: 'All', count: documents.length },
    { label: 'Lecture Notes', count: documents.filter((d) => d.category === 'Lecture Notes').length },
    { label: 'Assignments', count: documents.filter((d) => d.category === 'Assignments').length },
    { label: 'Question Papers', count: documents.filter((d) => d.category === 'Question Papers').length },
    { label: 'Project Reports', count: documents.filter((d) => d.category === 'Project Reports').length },
    { label: 'Study Materials', count: documents.filter((d) => d.category === 'Study Materials').length },
    { label: 'Other Documents', count: documents.filter((d) => d.category === 'Other Documents').length },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative pb-16">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">My Documents</h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Manage, categorize, and inspect your encrypted academic coursework files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/upload">
            <Button variant="primary" size="sm" icon="add">
              Upload Files
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Filter Capsule Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.label;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.label);
                setSearchParams(cat.label === 'All' ? {} : { category: cat.label });
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-border-subtle/70'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-secondary'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Toolbar: Search, File Type, Sort, View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-card-surface border border-border-subtle shadow-card">
        {/* Search Field */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-secondary pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Filter by file name, keyword, course code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-panel-surface text-on-surface font-body-sm text-xs placeholder:text-secondary focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-border-subtle transition-all"
          />
        </div>

        {/* Dropdowns & Toggle */}
        <div className="flex items-center gap-2">
          {/* File Type Dropdown */}
          <Dropdown
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-border-subtle/80"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">description</span>
                <span className="capitalize">{selectedType === 'all' ? 'All File Types' : selectedType}</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">expand_more</span>
              </button>
            }
            items={[
              { label: 'All Types', onClick: () => setSelectedType('all') },
              { label: 'PDF (.pdf)', onClick: () => setSelectedType('pdf') },
              { label: 'Word (.docx)', onClick: () => setSelectedType('docx') },
              { label: 'Archive (.zip)', onClick: () => setSelectedType('zip') },
              { label: 'Presentation (.pptx)', onClick: () => setSelectedType('pptx') },
              { label: 'Images (.png/.jpg)', onClick: () => setSelectedType('image') },
            ]}
          />

          {/* Sort Dropdown */}
          <Dropdown
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-border-subtle/80"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">sort</span>
                <span>
                  Sort: {sortBy === 'date' ? 'Last Modified' : sortBy === 'name' ? 'Name' : sortBy === 'size' ? 'Size' : 'Status'}
                </span>
                <span className="material-symbols-outlined text-[16px] text-secondary">expand_more</span>
              </button>
            }
            items={[
              { label: 'Last Modified', onClick: () => setSortBy('date') },
              { label: 'Document Name', onClick: () => setSortBy('name') },
              { label: 'File Size', onClick: () => setSortBy('size') },
              { label: 'Backup Status', onClick: () => setSortBy('status') },
            ]}
          />

          {/* View Mode Switch */}
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-full border border-border-subtle">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-colors ${
                viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'
              }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Grid */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-DEFAULT w-full" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card-surface border border-border-subtle rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-3">
            <span className="material-symbols-outlined text-[24px]">search_off</span>
          </div>
          <h3 className="font-headline-sm text-base font-semibold text-on-surface">
            No academic files matched
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mt-1">
            Try adjusting your search query, selecting "All" categories, or resetting file type filters.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedType('all');
              setSearchQuery('');
            }}
            className="mt-4"
          >
            Clear All Filters
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="w-full bg-card-surface rounded-2xl border border-border-subtle shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-[11px] uppercase tracking-wider border-b border-border-subtle">
                  <th className="py-3.5 pl-4 w-10">
                    <Checkbox
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedIds.size === filteredDocuments.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="py-3.5 px-3">Document Name</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Size</th>
                  <th className="py-3.5 px-3">Modified</th>
                  <th className="py-3.5 px-3">S3 Backup</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 font-body-sm text-xs">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  const { icon, color } = getFileIcon(doc.extension);

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        isSelected ? 'bg-surface-container-low' : ''
                      }`}
                    >
                      <td className="py-3 pl-4">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.id)}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                            <span className="material-symbols-outlined text-[18px]">{icon}</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-on-surface truncate max-w-sm">
                              {doc.name}
                            </span>
                            <span className="text-[11px] text-secondary truncate max-w-sm">
                              {doc.title}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge size="sm">{doc.category}</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-on-surface-variant">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="py-3 px-3 text-secondary text-[11px]">
                        {formatRelativeTime(doc.lastModified)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            doc.s3Status === 'synced' ? 'emerald' : doc.s3Status === 'pending' ? 'amber' : 'error'
                          }
                          size="sm"
                          icon={
                            doc.s3Status === 'synced' ? 'check_circle' : doc.s3Status === 'pending' ? 'sync' : 'error'
                          }
                        >
                          {doc.s3Status === 'synced' ? 'Synced S3' : doc.s3Status === 'pending' ? 'Pending' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-full text-secondary hover:text-on-surface hover:bg-panel-surface transition-colors"
                            title="Quick Preview"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <Link
                            to={`/documents/${doc.id}/preview`}
                            className="p-1.5 rounded-full text-secondary hover:text-on-surface hover:bg-panel-surface transition-colors"
                            title="Full Reader View"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </Link>
                          <Dropdown
                            align="right"
                            trigger={
                              <button
                                type="button"
                                className="p-1.5 rounded-full text-secondary hover:text-on-surface hover:bg-panel-surface transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>
                            }
                            items={[
                              {
                                icon: 'download',
                                label: 'Download File',
                                onClick: () => {
                                  info(`Downloading ${doc.name}...`);
                                  setTimeout(() => success('Download started'), 500);
                                },
                              },
                              {
                                icon: 'edit',
                                label: 'Rename File',
                                onClick: () => {
                                  setRenameDoc(doc);
                                  setNewName(doc.name);
                                },
                              },
                              {
                                icon: 'share',
                                label: 'Copy S3 Link',
                                onClick: () => {
                                  navigator.clipboard.writeText(doc.s3Key);
                                  success('S3 Object reference copied to clipboard');
                                },
                              },
                              { divider: true },
                              {
                                icon: 'delete',
                                label: 'Delete from S3',
                                danger: true,
                                onClick: () => setDeleteDoc(doc),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedIds.has(doc.id);
            const { icon, color } = getFileIcon(doc.extension);

            return (
              <div
                key={doc.id}
                className={`p-4 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col justify-between transition-all ${
                  isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleSelect(doc.id)}
                    />
                  </div>
                  <h4 className="font-semibold text-xs text-on-surface truncate mb-1" title={doc.name}>
                    {doc.name}
                  </h4>
                  <p className="text-[11px] text-secondary line-clamp-2 mb-3">
                    {doc.title}
                  </p>
                </div>
                <div className="pt-3 border-t border-border-subtle/60 flex items-center justify-between text-[11px]">
                  <Badge size="sm">{doc.category}</Badge>
                  <span className="font-mono text-secondary">{formatBytes(doc.sizeBytes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Batch Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-primary text-on-primary rounded-full px-5 py-2.5 shadow-modal flex items-center gap-4 animate-zoom-in-95">
          <div className="flex items-center gap-2 pr-3 border-r border-white/20">
            <span className="font-mono text-xs font-bold">{selectedIds.size}</span>
            <span className="text-xs">selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBatchDownload}
              className="text-on-primary hover:bg-white/10"
              icon="download"
            >
              Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBatchDeleteOpen(true)}
              className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30"
              icon="delete"
            >
              Delete
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
              title="Clear selection"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Preview Modal (from Stitch) */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title="Document Quick Inspector"
        subtitle="Amazon S3 Replica Object"
        icon="draft"
      >
        {previewDoc && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-DEFAULT bg-surface-container-low border border-border-subtle">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">
                    {getFileIcon(previewDoc.extension).icon}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-on-surface">{previewDoc.name}</h4>
                  <p className="font-mono text-[11px] text-secondary">{previewDoc.s3Key}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-border-subtle/60">
                <div>
                  <span className="text-secondary block">File Size:</span>
                  <span className="text-on-surface font-bold">{formatBytes(previewDoc.sizeBytes)}</span>
                </div>
                <div>
                  <span className="text-secondary block">Category:</span>
                  <span className="text-on-surface font-bold">{previewDoc.category}</span>
                </div>
                <div>
                  <span className="text-secondary block">KMS Encrypted:</span>
                  <span className="text-accent-emerald font-bold">AES-256 Enabled</span>
                </div>
                <div>
                  <span className="text-secondary block">Revisions:</span>
                  <span className="text-on-surface font-bold">{previewDoc.versionCount} versions</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-DEFAULT bg-surface-container font-mono text-[10px] text-secondary break-all">
              SHA-256: {previewDoc.sha256Checksum}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>
                Dismiss
              </Button>
              <Link to={`/documents/${previewDoc.id}/preview`}>
                <Button variant="primary" size="sm" icon="open_in_new">
                  Open Full Reader View
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameDoc}
        onClose={() => setRenameDoc(null)}
        title="Rename Document"
        subtitle="Update S3 Object Display Name"
        icon="edit"
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full py-2.5 px-4 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-sm text-sm border border-border-subtle focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="New document name"
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRenameDoc(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRename}>
              Save Display Name
            </Button>
          </div>
        </div>
      </Modal>

      {/* Single Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title="Confirm Permanent Deletion"
        subtitle="Amazon S3 Object Removal"
        icon="warning"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Are you sure you want to delete <strong className="text-on-surface">{deleteDoc?.name}</strong>?
            This will permanently remove the file from your academic repository and delete the Amazon S3 object.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteDoc(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
              Delete from Vault
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        isOpen={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        title="Batch File Deletion"
        subtitle="Multiple Objects Removal"
        icon="delete"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Are you sure you want to delete all <strong className="text-on-surface">{selectedIds.size} selected documents</strong> from your vault?
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBatchDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              Confirm Batch Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
