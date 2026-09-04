import { get } from './client';

export const healthReportsApi = {
  list: (limit = 30) => get(`/api/admin/health-reports?limit=${limit}`),
};
