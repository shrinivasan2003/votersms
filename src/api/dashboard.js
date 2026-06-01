import { get } from './client';

export const dashboardApi = {
  stats: ()          => get('/api/dashboard-stats'),
  recentActivity: () => get('/api/recent-activity'),
  recentJobs: ()     => get('/api/recent-jobs'),
};
