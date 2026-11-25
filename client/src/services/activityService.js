import { getActivities } from '../api/activities';

// Map server action types to UI notification icons and styling types
function mapActionToActivity(item) {
  const action = item.action || 'UPLOAD';
  let type = 'upload';
  let icon = 'cloud_upload';

  switch (action) {
    case 'LOGIN':
      type = 'security';
      icon = 'lock';
      break;
    case 'UPLOAD':
      type = 'upload';
      icon = 'cloud_upload';
      break;
    case 'DOWNLOAD':
      type = 's3';
      icon = 'download';
      break;
    case 'DELETE':
      type = 'delete';
      icon = 'delete';
      break;
    case 'RENAME':
      type = 'edit';
      icon = 'edit';
      break;
    case 'RECATEGORIZE':
      type = 'category';
      icon = 'folder';
      break;
    default:
      type = 's3';
      icon = 'notifications';
  }

  const id = item._id || item.id;
  const readKey = `cloudvault_act_read_${id}`;
  const isRead = localStorage.getItem(readKey) === 'true';

  return {
    id,
    type,
    title: item.documentName ? `${action}: ${item.documentName}` : action,
    description: item.details || `Activity recorded: ${action}`,
    timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
    isRead,
    icon,
  };
}

export const activityService = {
  async getActivities(params = {}) {
    try {
      const res = await getActivities(params);
      const list = Array.isArray(res.data) ? res.data : [];
      return list.map(mapActionToActivity);
    } catch {
      return [];
    }
  },

  async markAllAsRead() {
    try {
      const res = await getActivities({ limit: 100 });
      const list = Array.isArray(res.data) ? res.data : [];
      list.forEach((item) => {
        const id = item._id || item.id;
        localStorage.setItem(`cloudvault_act_read_${id}`, 'true');
      });
      return list.map(mapActionToActivity);
    } catch {
      return [];
    }
  },

  async clearActivities() {
    return [];
  },

  async addActivity() {
    return null;
  },
};
