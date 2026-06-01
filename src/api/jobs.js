import { post } from './client';

export const processJobsApi = {
  process: (data) => post('/api/process-jobs/process', data),
};
