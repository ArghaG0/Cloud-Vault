import { mockActivities } from '../data/mockActivities';

let activities = [...mockActivities];

export const activityService = {
  async getActivities() {
    await new Promise(r => setTimeout(r, 100));
    return [...activities];
  },

  async markAllAsRead() {
    activities = activities.map(a => ({ ...a, isRead: true }));
    return [...activities];
  },

  async clearActivities() {
    activities = [];
    return [];
  },

  async addActivity(newActivity) {
    const act = {
      id: `act-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      ...newActivity,
    };
    activities = [act, ...activities];
    return act;
  },
};
