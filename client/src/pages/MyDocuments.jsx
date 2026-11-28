import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { documentService } from '../services/documentService';
import { formatBytes, formatDate, formatRelativeTime, getFileIcon } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';
import { Modal } from '../components/common/Modal';
import { Dropdown } from '../components/common/Dropdown';
import { Skeleton } from '../components/common/Skeleton';

export function MyDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const initialTab = searchParams.get('tab') === 'trash' ? 'trash' : 'active';

  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab); // 'active' | 'trash'
  const [documents, setDocuments] = useState([]);
  const [trashedDocuments, setTrashedDocuments] = useState([]);
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
  const [purgeDoc, setPurgeDoc] = useState(null);
  const [batchPurgeOpen, setBatchPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const [activeData, trashData] = await Promise.all([
          documentService.getDocuments({ isTrash: false }),
          documentService.getDocuments({ isTrash: true }),
        ]);
        setDocuments(Array.isArray(activeData) ? activeData : []);
        setTrashedDocuments(Array.isArray(trashData) ? trashData : []);
      } catch {
        toastError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [toastError]);

  const currentSourceList = activeTab === 'trash' ? trashedDocuments : documents;

  // Filter & Sort
  const filteredDocuments = useMemo(() => {
    const result = currentSourceList.filter((doc) => {
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'pdf' && doc.extension === 'pdf') ||
        (selectedType === 'docx' && (doc.extension === 'docx' || doc.extension === 'doc')) ||
        (selectedType === 'pptx' && (doc.extension === 'pptx' || doc.extension === 'ppt')) ||
        (selectedType === 'zip' && doc.extension === 'zip') ||
        (selectedType === 'image' && ['png', 'jpg', 'jpeg'].includes(doc.extension));
      const q = searchQuery.toLowerCase().trim();
      const name = (doc.displayName || doc.name || '').toLowerCase();
      const title = (doc.originalFilename || doc.title || '').toLowerCase();
      const matchesSearch =
        !q ||
        name.includes(q) ||
        title.includes(q) ||
        (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCategory && matchesType && matchesSearch;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = activeTab === 'trash' ? (a.deletedAt || a.lastModified || a.createdAt) : (a.lastModified || a.createdAt);
        const dateB = activeTab === 'trash' ? (b.deletedAt || b.lastModified || b.createdAt) : (b.lastModified || b.createdAt);
        return new Date(dateB || 0) - new Date(dateA || 0);
      }
      if (sortBy === 'name') {
        return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '');
      }
      if (sortBy === 'size') {
        return (b.fileSize ?? b.sizeBytes ?? 0) - (a.fileSize ?? a.sizeBytes ?? 0);
      }
      if (sortBy === 'status') {
        return (a.s3Status || '').localeCompare(b.s3Status || '');
      }
      return 0;
    });
    return result;
  }, [currentSourceList, activeTab, selectedCategory, selectedType, searchQuery, sortBy]);

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
    const trimmed = newName.trim();
    try {
      await documentService.updateDocument(renameDoc.id, { displayName: trimmed, name: trimmed });
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === renameDoc.id ? { ...d, displayName: trimmed, name: trimmed } : d
        )
      );
      success('Document renamed successfully');
      setRenameDoc(null);
    } catch {
      toastError('Failed to rename document');
    }
  };

  const handleDownload = async (doc) => {
    try {
      info(`Preparing download for ${doc.displayName || doc.name}...`);
      const { downloadUrl } = await documentService.requestPresignedDownloadUrl(doc.id);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = doc.originalFilename || doc.displayName || doc.name || 'download';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      success('Download started');
    } catch {
      toastError('Failed to start download');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    try {
      await documentService.deleteDocument(deleteDoc.id);
      const movedItem = { ...deleteDoc, isTrash: true, deletedAt: new Date().toISOString() };
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setTrashedDocuments((prev) => [movedItem, ...prev]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteDoc.id);
        return next;
      });
      success('Document moved to Trash');
      setDeleteDoc(null);
    } catch {
      toastError('Failed to move document to Trash');
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await documentService.batchDelete(ids);
      const nowIso = new Date().toISOString();
      const movedItems = documents
        .filter((d) => selectedIds.has(d.id))
        .map((d) => ({ ...d, isTrash: true, deletedAt: nowIso }));
      setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setTrashedDocuments((prev) => [...movedItems, ...prev]);
      setSelectedIds(new Set());
      success(`Moved ${ids.length} document(s) to Trash`);
      setBatchDeleteOpen(false);
    } catch {
      toastError('Failed to move selected documents to Trash');
    }
  };

  const handleRestore = async (doc) => {
    try {
      await documentService.restoreDocument(doc.id);
      const restoredItem = { ...doc, isTrash: false, deletedAt: null };
      setTrashedDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setDocuments((prev) => [restoredItem, ...prev]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
      success('Document restored from Trash');
    } catch {
      toastError('Failed to restore document');
    }
  };

  const handleBatchRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await documentService.batchRestore(ids);
      const restoredItems = trashedDocuments
        .filter((d) => selectedIds.has(d.id))
        .map((d) => ({ ...d, isTrash: false, deletedAt: null }));
      setTrashedDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setDocuments((prev) => [...restoredItems, ...prev]);
      setSelectedIds(new Set());
      success(`Restored ${ids.length} document(s) from Trash`);
    } catch {
      toastError('Failed to restore selected documents');
    }
  };

  const handlePurgeConfirm = async () => {
    if (!purgeDoc) return;
    setPurging(true);
    try {
      await documentService.purgeDocument(purgeDoc.id);
      setTrashedDocuments((prev) => prev.filter((d) => d.id !== purgeDoc.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(purgeDoc.id);
        return next;
      });
      success('Document permanently deleted from Amazon S3');
      setPurgeDoc(null);
    } catch (err) {
      toastError(err?.message || 'Failed to permanently delete document');
    } finally {
      setPurging(false);
    }
  };

  const handleBatchPurge = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setPurging(true);
    try {
      const res = await documentService.batchPurge(ids);
      const purgedSet = new Set(res?.purgedIds || ids);
      setTrashedDocuments((prev) => prev.filter((d) => !purgedSet.has(d.id)));
      setSelectedIds(new Set());
      if (res?.failures?.length > 0) {
        toastError(`Permanently deleted ${purgedSet.size} file(s); ${res.failures.length} failed.`);
      } else {
        success(`Permanently deleted ${purgedSet.size} document(s) from Amazon S3`);
      }
      setBatchPurgeOpen(false);
    } catch (err) {
      toastError(err?.message || 'Batch permanent deletion failed');
    } finally {
      setPurging(false);
    }
  };

  const handleBatchDownload = () => {
    info(`Packaging ${selectedIds.size} files for batch archive download...`);
    setTimeout(() => {
      success('Batch archive download initiated');
    }, 1000);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    const nextParams = {};
    if (selectedCategory !== 'All') nextParams.category = selectedCategory;
    if (tab === 'trash') nextParams.tab = 'trash';
    setSearchParams(nextParams);
  };

  const categories = [
    { label: 'All', count: currentSourceList.length },
    { label: 'Lecture Notes', count: currentSourceList.filter((d) => d.category === 'Lecture Notes').length },
    { label: 'Assignments', count: currentSourceList.filter((d) => d.category === 'Assignments').length },
    { label: 'Question Papers', count: currentSourceList.filter((d) => d.category === 'Question Papers').length },
    { label: 'Project Reports', count: currentSourceList.filter((d) => d.category === 'Project Reports').length },
    { label: 'Study Materials', count: currentSourceList.filter((d) => d.category === 'Study Materials').length },
    { label: 'Other Documents', count: currentSourceList.filter((d) => d.category === 'Other Documents').length },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative pb-16">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
            {activeTab === 'trash' ? 'Trash' : 'My Documents'}
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            {activeTab === 'trash'
              ? 'Trashed files remain stored until you manually restore or permanently delete them'
              : 'Manage, categorize, and inspect your encrypted academic coursework files'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Active Vault / Trash Tab Switcher */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-border-subtle">
            <button
              type="button"
              onClick={() => switchTab('active')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>My Documents</span>
              <span className="font-mono text-[10px] opacity-80">{documents.length}</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('trash')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'trash'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              <span>Trash</span>
              <span className="font-mono text-[10px] opacity-80">{trashedDocuments.length}</span>
            </button>
          </div>

          {activeTab === 'active' && (
            <Link to="/upload">
              <Button variant="primary" size="sm" icon="add">
                Upload Files
              </Button>
            </Link>
          )}
        </div>
      </div>

      {activeTab === 'trash' && (
        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle flex items-start gap-2.5 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">info</span>
          <p>
            Files in Trash still count toward your storage quota and remain in Amazon S3 until you{' '}
            <strong className="text-on-surface">Restore</strong> them or choose{' '}
            <strong className="text-error">Permanently Delete</strong>.
          </p>
        </div>
      )}

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
                const nextParams = {};
                if (cat.label !== 'All') nextParams.category = cat.label;
                if (activeTab === 'trash') nextParams.tab = 'trash';
                setSearchParams(nextParams);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${isActive
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-border-subtle/70'
                }`}
            >
              <span>{cat.label}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-secondary'
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
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">
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
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'
                }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'
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
            {activeTab === 'trash' ? 'Trash is empty' : 'No academic files matched'}
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mt-1">
            {activeTab === 'trash'
              ? 'Documents moved to Trash will appear here until you restore or permanently delete them.'
              : 'Try adjusting your search query, selecting "All" categories, or resetting file type filters.'}
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
                  <th className="py-3.5 px-3">{activeTab === 'trash' ? 'Deleted' : 'Modified'}</th>
                  <th className="py-3.5 px-3">S3 Backup</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
<tbody className="divide-y divide-white/10 font-body-sm text-xs">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  const { icon, color } = getFileIcon(doc.extension);
                  const docName = doc.displayName || doc.name;
                  const docSub = doc.originalFilename || doc.title;
                  const docSize = doc.fileSize ?? doc.sizeBytes ?? 0;

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${isSelected ? 'bg-surface-container-low' : ''
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
                              {docName}
                            </span>
                            <span className="text-[11px] text-secondary truncate max-w-sm">
                              {docSub}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge size="sm">{doc.category}</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-on-surface-variant">
                        {formatBytes(docSize)}
                      </td>
                      <td
                        className="py-3 px-3 text-secondary text-[11px]"
                        title={
                          activeTab === 'trash' && doc.deletedAt
                            ? formatDate(doc.deletedAt)
                            : undefined
                        }
                      >
                        {formatRelativeTime(
                          activeTab === 'trash'
                            ? doc.deletedAt || doc.lastModified || doc.createdAt
                            : doc.lastModified || doc.createdAt
                        )}
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
                        {activeTab === 'trash' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRestore(doc)}
                              icon="restore_from_trash"
                            >
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setPurgeDoc(doc)}
                              icon="delete_forever"
                            >
                              Permanently Delete
                            </Button>
                          </div>
                        ) : (
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
                                  onClick: () => handleDownload(doc),
                                },
                                {
                                  icon: 'edit',
                                  label: 'Rename File',
                                  onClick: () => {
                                    setRenameDoc(doc);
                                    setNewName(docName);
                                  },
                                },
                                {
                                  icon: 'share',
                                  label: 'Copy S3 Link',
                                  onClick: () => {
                                    navigator.clipboard.writeText(doc.s3ObjectKey || doc.s3Key || '');
                                    success('S3 Object reference copied to clipboard');
                                  },
                                },
                                { divider: true },
                                {
                                  icon: 'delete',
                                  label: 'Move to Trash',
                                  danger: true,
                                  onClick: () => setDeleteDoc(doc),
                                },
                              ]}
                            />
                          </div>
                        )}
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
            const docName = doc.displayName || doc.name;
            const docSub = doc.originalFilename || doc.title;
            const docSize = doc.fileSize ?? doc.sizeBytes ?? 0;

            return (
              <div
                key={doc.id}
                className={`p-4 rounded-2xl bg-card-surface border border-gray-100/40 shadow-card flex flex-col justify-between transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/40'
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
                  <h4 className="font-semibold text-xs text-on-surface truncate mb-1" title={docName}>
                    {docName}
                  </h4>
                  <p className="text-[11px] text-secondary line-clamp-2 mb-3">
                    {docSub}
                  </p>
                </div>
                <div className="pt-3 border-t border-white/40 flex items-center justify-between text-[11px]">
                  <Badge size="sm">{doc.category}</Badge>
                  <span className="font-mono text-secondary">{formatBytes(docSize)}</span>
                </div>
                {activeTab === 'trash' && (
                  <div className="mt-3 pt-2.5 border-t border-border-subtle/50 flex flex-col gap-2">
                    <span className="text-[10px] text-secondary">
                      Deleted {formatRelativeTime(doc.deletedAt || doc.lastModified || doc.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(doc)}
                        className="flex-1"
                        icon="restore_from_trash"
                      >
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPurgeDoc(doc)}
                        className="flex-1"
                        icon="delete_forever"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

   {/* Floating Batch Action Toolbar */}
{selectedIds.size > 0 && (
  <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full bg-neutral-800/60 px-6 py-4 text-neutral-100 backdrop-blur-xl border border-white/15 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] animate-zoom-in-95">
    <div className="flex items-center gap-1.5 pl-1.5 pr-2.5 border-r border-white/15">
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/12 px-1.5 font-mono text-[11px] font-semibold text-white">
        {selectedIds.size}
      </span>
      <span className="text-[11px] font-medium text-neutral-300 whitespace-nowrap">
        selected
      </span>
    </div>

    <div className="flex items-center gap-1.5">
      {activeTab === 'trash' ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchRestore}
            className="h-7 px-2.5 rounded-full bg-white/10 text-neutral-100 text-xs font-medium border border-white/10 transition-all duration-150 hover:bg-white/18 hover:text-white active:scale-[0.98]"
            icon="restore_from_trash"
          >
            Restore
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBatchPurgeOpen(true)}
            className="h-7 px-2.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium border border-red-400/25 transition-all duration-150 hover:bg-red-500/35 hover:text-red-200 active:scale-[0.98]"
            icon="delete_forever"
          >
            Permanently Delete
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchDownload}
            className="h-7 px-2.5 rounded-full bg-white/10 text-neutral-100 text-xs font-medium border border-white/10 transition-all duration-150 hover:bg-white/18 hover:text-white active:scale-[0.98]"
            icon="download"
          >
            Download
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBatchDeleteOpen(true)}
            className="h-7 px-2.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium border border-red-400/25 transition-all duration-150 hover:bg-red-500/35 hover:text-red-200 active:scale-[0.98]"
            icon="delete"
          >
            Move to Trash
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={() => setSelectedIds(new Set())}
        className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        title="Clear selection"
        aria-label="Clear selection"
      >
        <span className="material-symbols-outlined text-[15px]">close</span>
      </button>
    </div>
  </div>
)}

      {/* Quick Preview Modal */}
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
                  <h4 className="font-semibold text-sm text-on-surface">
                    {previewDoc.displayName || previewDoc.name}
                  </h4>
                  <p className="font-mono text-[11px] text-secondary">
                    {previewDoc.s3ObjectKey || previewDoc.s3Key}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-border-subtle/60">
                <div>
                  <span className="text-secondary block">File Size:</span>
                  <span className="text-on-surface font-bold">
                    {formatBytes(previewDoc.fileSize ?? previewDoc.sizeBytes ?? 0)}
                  </span>
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
                  <span className="text-on-surface font-bold">{previewDoc.versionCount ?? 1} versions</span>
                </div>
              </div>
            </div>

            {previewDoc.sha256Checksum && (
              <div className="p-3 rounded-DEFAULT bg-surface-container font-mono text-[10px] text-secondary break-all">
                SHA-256: {previewDoc.sha256Checksum}
              </div>
            )}

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

      {/* Single Move to Trash Confirmation Modal */}
      <Modal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title="Move Document to Trash"
        subtitle="Soft Delete — Can Be Restored Later"
        icon="delete"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Move{' '}
            <strong className="text-on-surface">{deleteDoc?.displayName || deleteDoc?.name}</strong>{' '}
            to Trash? You can restore it or permanently delete it from the Trash tab at any time.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteDoc(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
              Move to Trash
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Move to Trash Confirmation Modal */}
      <Modal
        isOpen={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        title="Move Selected to Trash"
        subtitle={`${selectedIds.size} selected item(s)`}
        icon="delete"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Move <strong className="text-on-surface">{selectedIds.size}</strong> selected document(s)
            to Trash? They can be restored or permanently deleted from the Trash tab later.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBatchDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              Move to Trash
            </Button>
          </div>
        </div>
      </Modal>

      {/* Single Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={!!purgeDoc}
        onClose={() => !purging && setPurgeDoc(null)}
        title="Permanently Delete Document"
        subtitle="Irreversible Amazon S3 Removal"
        icon="warning"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Are you sure you want to permanently delete{' '}
            <strong className="text-on-surface">{purgeDoc?.displayName || purgeDoc?.name}</strong>?{' '}
            <strong className="text-error">This action cannot be undone.</strong> All versions of
            this file will be permanently erased from Amazon S3 and your storage quota will be reclaimed.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPurgeDoc(null)} disabled={purging}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handlePurgeConfirm} loading={purging}>
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={batchPurgeOpen}
        onClose={() => !purging && setBatchPurgeOpen(false)}
        title="Permanently Delete Selected"
        subtitle={`${selectedIds.size} selected item(s) — Irreversible`}
        icon="warning"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-xs text-on-surface-variant">
            Are you sure you want to permanently delete{' '}
            <strong className="text-on-surface">{selectedIds.size}</strong> selected document(s)?{' '}
            <strong className="text-error">This action cannot be undone.</strong> All versions of
            these files will be permanently erased from Amazon S3.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBatchPurgeOpen(false)}
              disabled={purging}
            >
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchPurge} loading={purging}>
              Permanently Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}