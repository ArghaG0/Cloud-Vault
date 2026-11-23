import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { mockCategories } from '../data/mockCategories';
import { formatBytes } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export function Categories() {
  const { success } = useToast();
  const [categories, setCategories] = useState(mockCategories);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const totalDocuments = categories.reduce((sum, c) => sum + c.count, 0);
  const totalBytes = categories.reduce((sum, c) => sum + c.sizeBytes, 0);

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newCat = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || 'Custom student coursework category.',
      icon: 'folder',
      count: 0,
      sizeBytes: 0,
      color: 'blue',
    };

    setCategories([...categories, newCat]);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setCreateModalOpen(false);
    success(`Category "${newCat.name}" created successfully`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">Academic Categories</h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Organize coursework, lecture notes, and study materials into dedicated cloud partitions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon="add"
          >
            Create Category
          </Button>
        </div>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-on-surface">{categories.length}</span>
            <span className="text-xs text-on-surface-variant block">Total Categories</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">folder_copy</span>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-on-surface">{totalDocuments}</span>
            <span className="text-xs text-on-surface-variant block">Assigned Documents</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">cloud_done</span>
          </div>
          <div>
            <span className="font-mono text-xl font-bold text-on-surface">{formatBytes(totalBytes)}</span>
            <span className="text-xs text-on-surface-variant block">Categorized S3 Storage</span>
          </div>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-6 rounded-2xl bg-card-surface border border-border-subtle shadow-card hover:border-primary/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">{cat.icon}</span>
                </div>
                <Badge size="sm">
                  {cat.count} files
                </Badge>
              </div>

              <h3 className="font-headline-sm text-base font-semibold text-on-surface mb-1">
                {cat.name}
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mb-4">
                {cat.description}
              </p>
            </div>

            <div className="pt-4 border-t border-border-subtle/60 flex items-center justify-between">
              <span className="font-mono text-xs text-secondary font-medium">
                {formatBytes(cat.sizeBytes)}
              </span>
              <Link
                to={`/documents?category=${encodeURIComponent(cat.name)}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Browse Files</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Category Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Academic Category"
        subtitle="Custom Coursework Partition"
        icon="create_new_folder"
      >
        <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase">
              CATEGORY NAME
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Research Papers, Lab Manuals"
              required
              className="w-full py-2.5 px-4 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-sm text-sm border border-border-subtle focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase">
              DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              placeholder="Brief summary of files stored in this module..."
              rows={3}
              className="w-full py-2.5 px-4 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-sm text-sm border border-border-subtle focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Create Partition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
