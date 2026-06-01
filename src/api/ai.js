import { get, post, put } from './client';

export const aiApi = {
  getConfig: ()          => get('/api/ai/config'),
  saveConfig: (data)     => post('/api/ai/config', data),
  getUsage: ()           => get('/api/ai/usage'),
  generateEmail: (data)  => post('/api/ai/generate-email-template', data),
};

export const aiAdminApi = {
  getUsage: ()                      => get('/api/ai/admin/usage'),
  setLimit: (customerId, data)      => put(`/api/ai/admin/usage/${customerId}/limit`, data),
};
