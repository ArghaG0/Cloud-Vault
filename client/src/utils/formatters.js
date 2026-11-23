export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
}

export function getFileIcon(extensionOrMime) {
  const ext = (extensionOrMime || '').toLowerCase();
  if (ext.includes('pdf')) return { icon: 'picture_as_pdf', color: 'text-red-500 bg-red-500/10' };
  if (ext.includes('doc') || ext.includes('word')) return { icon: 'description', color: 'text-blue-500 bg-blue-500/10' };
  if (ext.includes('ppt') || ext.includes('presentation')) return { icon: 'slideshow', color: 'text-amber-500 bg-amber-500/10' };
  if (ext.includes('zip') || ext.includes('tar') || ext.includes('archive')) return { icon: 'folder_zip', color: 'text-purple-500 bg-purple-500/10' };
  if (ext.includes('png') || ext.includes('jpg') || ext.includes('jpeg') || ext.includes('image')) return { icon: 'image', color: 'text-emerald-500 bg-emerald-500/10' };
  return { icon: 'draft', color: 'text-secondary bg-surface-container' };
}
